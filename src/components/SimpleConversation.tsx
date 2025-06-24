'use client'

import React, { useState, useEffect } from 'react'
import { AudioAPI } from '@/utils/audioAPI'
import { EnhancedAudioRecorder } from '@/utils/enhancedAudioRecorder'

interface SimpleConversationProps {
  apiKey: string
  config: {
    agentName?: string
    llmModel?: string
    temperature?: number
    sttLanguage?: string
    ttsVoice?: string
  }
  userContext?: unknown
  onProcessingChange?: (isProcessing: boolean) => void
  onSpeakingChange?: (isSpeaking: boolean) => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SimpleConversation: React.FC<SimpleConversationProps> = ({ 
  apiKey, 
  config,
  userContext,
  onProcessingChange,
  onSpeakingChange
}) => {
  const [isActive, setIsActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  
  const [audioAPI] = useState(() => new AudioAPI(apiKey))
  const [recorder] = useState(() => new EnhancedAudioRecorder())

  useEffect(() => {
    return () => {
      recorder.cleanup()
    }
  }, [])

  useEffect(() => {
    if (isActive && currentStep === 'idle' && !isProcessing) {
      setTimeout(() => {
        if (isActive) {
          startListening()
        }
      }, 300)
    }
  }, [isActive, currentStep])

  // Démarrer l'écoute pour interruption automatique pendant que l'IA parle
  useEffect(() => {
    if (isActive && currentStep === 'speaking') {
      let interruptionRecorder: EnhancedAudioRecorder | null = null
      
      const startInterruptionListening = async () => {
        try {
          interruptionRecorder = new EnhancedAudioRecorder()
          await interruptionRecorder.startRecording({
            silenceThreshold: -40, // Plus sensible pour détecter rapidement
            silenceTimeout: 800,   // Très court pour réagir vite
            onSilenceDetected: () => {
              // L'utilisateur a parlé assez longtemps, on interrompt l'IA
              console.log('🗣️ User speech detected during AI speaking - interrupting')
              interruptAI()
              interruptionRecorder?.cleanup()
            }
          })
        } catch (error) {
          console.error('Erreur écoute interruption:', error)
        }
      }
      
      startInterruptionListening()
      
      // Nettoyer quand on n'est plus en train de parler
      return () => {
        interruptionRecorder?.cleanup()
      }
    }
  }, [currentStep, isActive])

  const buildSystemPrompt = (): string => {
    return `Tu es ${config.agentName || 'un assistant virtuel'}. 
Tu aides les utilisateurs avec leurs questions de manière naturelle et conversationnelle.
Tu réponds de manière concise (1-2 phrases) et professionnelle.
Tu utilises les informations de notre base de connaissances pour répondre précisément.`
  }

  const startListening = async () => {
    try {
      setCurrentStep('listening')
      
      await recorder.startRecording({
        silenceThreshold: -35, // Moins sensible = détecte mieux la vraie parole
        silenceTimeout: 3000,  // 3 secondes pour bien finir la phrase
        maxRecordingTime: 30000, // 30 secondes max
        onSilenceDetected: () => {
          if (recorder.isRecording()) {
            processRecording()
          }
        }
      })
      
    } catch (error: unknown) {
      console.error('Erreur écoute:', error)
      setCurrentStep('idle')
    }
  }

  const processRecording = async () => {
    try {
      setCurrentStep('thinking')
      setIsProcessing(true)
      onProcessingChange?.(true) // Notifier le parent: IA réfléchit
      
      const audioBlob = await recorder.stopRecording()
      
      // Vérification taille minimale - plus permissive
      if (audioBlob.size < 1000) { // 1KB minimum
        console.log('🎤 Audio trop court, ignoré. Taille:', audioBlob.size, 'bytes')
        setIsProcessing(false)
        setCurrentStep('idle')
        onProcessingChange?.(false)
        return
      }
      
      console.log('🎤 Audio blob ready for STT. Size:', audioBlob.size, 'bytes, Type:', audioBlob.type)
      
      console.log('🎬 Starting AI processing (thinking)')
      
      const result = await audioAPI.completeConversationFlow(
        audioBlob,
        messages,
        {
          sttLanguage: config.sttLanguage || 'fr',
          systemPrompt: buildSystemPrompt(),
          userContext: userContext,
          llmModel: config.llmModel || 'gpt-3.5-turbo',
          temperature: config.temperature || 0.1,
          ttsVoice: config.ttsVoice || 'alloy'
        }
      )
      
      const newMessages: Message[] = [
        ...messages,
        { role: 'user', content: result.transcript },
        { role: 'assistant', content: result.response }
      ]
      
      setMessages(newMessages.slice(-6)) // Garder seulement les 6 derniers messages
      
      setCurrentStep('speaking')
      setIsProcessing(false)
      onProcessingChange?.(false) // Fin de la réflexion
      onSpeakingChange?.(true) // Début de la parole
      
      console.log('🎬 AI speaking now')
      await audioAPI.playAudioBuffer(result.audioBuffer)
      console.log('🎬 AI finished speaking')
      
      setCurrentStep('idle')
      onSpeakingChange?.(false) // Fin de la parole
      
    } catch (error: unknown) {
      console.error('Erreur traitement:', error)
      setIsProcessing(false)
      setCurrentStep('idle')
      onProcessingChange?.(false)
      onSpeakingChange?.(false)
    }
  }

  const interruptAI = () => {
    if (currentStep === 'speaking') {
      console.log('🛑 User interrupting AI speech')
      audioAPI.stopCurrentAudio()
      setCurrentStep('idle')
      onSpeakingChange?.(false)
    }
  }

  const startConversation = async () => {
    setIsActive(true)
    setMessages([])
    setCurrentStep('speaking')
    onSpeakingChange?.(true)
    
    try {
      // Message de bienvenue avec TTS
      const welcomeMessage = `Bonjour! Je suis ${config.agentName || 'votre assistant virtuel'}. Comment puis-je vous aider aujourd'hui?`
      console.log('🎬 Playing welcome message with TTS')
      
      const audioBuffer = await audioAPI.textToSpeech(welcomeMessage, config.ttsVoice || 'alloy')
      await audioAPI.playAudioBuffer(audioBuffer)
      
      // Ajouter le message de bienvenue à l'historique
      setMessages([{ role: 'assistant', content: welcomeMessage }])
      
    } catch (error) {
      console.error('Erreur message de bienvenue:', error)
    }
    
    setCurrentStep('idle')
    onSpeakingChange?.(false)
  }

  const stopConversation = () => {
    setIsActive(false)
    setIsProcessing(false)
    setCurrentStep('idle')
    recorder.cleanup()
  }

  const getStatusDisplay = () => {
    switch (currentStep) {
      case 'listening': return { text: '🎤 Parlez...', color: 'text-blue-600' }
      case 'thinking': return { text: '🧠 Réflexion...', color: 'text-orange-600' }
      case 'speaking': return { text: '🔊 Réponse...', color: 'text-green-600' }
      default: return { text: isActive ? '✅ Prêt' : '⏸️ Arrêté', color: isActive ? 'text-green-600' : 'text-gray-500' }
    }
  }

  const status = getStatusDisplay()

  return (
    <div className="bg-white p-3 sm:p-4 rounded-lg shadow-lg w-72 sm:w-80 md:max-w-md">
      <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-center text-gray-800">
        💬 Conversation
      </h3>
      
      <div className={`text-center mb-3 sm:mb-4 p-2 rounded ${status.color}`}>
        <div className="font-medium text-sm sm:text-base">{status.text}</div>
      </div>
      
      <div className="flex gap-2 mb-3 sm:mb-4">
        {!isActive ? (
          <button
            onClick={startConversation}
            className="flex-1 px-3 sm:px-4 py-2 bg-green-500 text-white rounded text-sm sm:text-base font-medium hover:bg-green-600 transition-colors"
          >
            🚀 Démarrer
          </button>
        ) : (
          <>
            <button
              onClick={stopConversation}
              className="flex-1 px-3 sm:px-4 py-2 bg-red-500 text-white rounded text-sm sm:text-base font-medium hover:bg-red-600 transition-colors"
            >
              🛑 Arrêter
            </button>
            {currentStep === 'speaking' && (
              <button
                onClick={interruptAI}
                className="px-3 sm:px-4 py-2 bg-orange-500 text-white rounded text-sm sm:text-base font-medium hover:bg-orange-600 transition-colors"
              >
                ✋ Couper
              </button>
            )}
          </>
        )}
      </div>
      
      {messages.length > 0 && (
        <div className="max-h-24 sm:max-h-32 overflow-y-auto bg-gray-50 rounded p-2">
          {messages.slice(-4).map((msg, index) => (
            <div key={index} className={`text-xs sm:text-sm mb-1 p-1 rounded ${
              msg.role === 'user' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              <strong>{msg.role === 'user' ? '👤' : '🤖'}:</strong> 
              <span className="ml-1 break-words">{msg.content}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SimpleConversation