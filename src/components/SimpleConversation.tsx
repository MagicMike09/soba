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
      console.log('🔄 Redémarrage automatique de l\'écoute...')
      const timer = setTimeout(() => {
        if (isActive && currentStep === 'idle' && !isProcessing) {
          startListening()
        }
      }, 500) // Plus de délai pour stabilité
      
      return () => clearTimeout(timer)
    }
  }, [isActive, currentStep, isProcessing])

  // Simplification: suppression de l'interruption automatique pour éviter les conflits

  const buildSystemPrompt = (): string => {
    return `Tu es ${config.agentName || 'un assistant virtuel'}. 
Tu réponds de manière TRÈS concise (maximum 1-2 phrases courtes).
Sois direct, naturel et conversationnel. Évite les longs développements.
Utilise les informations disponibles pour donner des réponses précises et rapides.`
  }

  const startListening = async () => {
    try {
      setCurrentStep('listening')
      
      await recorder.startRecording({
        silenceThreshold: -35, // Plus sensible pour ne pas manquer la parole
        silenceTimeout: 2000,  // 2 secondes pour laisser finir les phrases
        maxRecordingTime: 10000, // 10 secondes max pour rapidité
        onSilenceDetected: () => {
          if (recorder.isRecording()) {
            console.log('🔇 Silence détecté, traitement de l\'enregistrement...')
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
      console.log('🎤 Processus simplifié: STT → LLM → TTS')
      
      setCurrentStep('thinking')
      setIsProcessing(true)
      onProcessingChange?.(true)
      
      const audioBlob = await recorder.stopRecording()
      
      // Vérification taille ET durée minimale
      if (audioBlob.size < 5000) { // Au moins 5KB pour éviter bruit
        console.log('🎤 Audio trop court, ignoré. Taille:', audioBlob.size, 'bytes')
        setIsProcessing(false)
        setCurrentStep('idle')
        onProcessingChange?.(false)
        return
      }
      
      console.log('🎤 Étape 1/3: STT - Conversion audio en texte')
      console.log('Audio blob size:', audioBlob.size, 'bytes, Type:', audioBlob.type)
      
      // Étape 1: STT - Speech to Text
      const transcript = await audioAPI.speechToText(audioBlob, config.sttLanguage || 'fr')
      
      // Vérifications de validité de la transcription
      if (!transcript.trim() || transcript.trim().length < 3) {
        console.log('❌ Transcription trop courte ou vide:', transcript)
        setIsProcessing(false)
        setCurrentStep('idle')
        onProcessingChange?.(false)
        return
      }
      
      // Filtrer les transcriptions suspectes (bruits, hallucinations)
      const suspiciousWords = ['hallucination', 'ponctuation', 'transcription', 'français']
      if (suspiciousWords.some(word => transcript.toLowerCase().includes(word))) {
        console.log('❌ Transcription suspecte (hallucination):', transcript)
        setIsProcessing(false)
        setCurrentStep('idle')
        onProcessingChange?.(false)
        return
      }
      
      console.log('✅ STT terminé. Transcript:', transcript)
      
      // Étape 2: LLM - Génération de réponse
      console.log('🧠 Étape 2/3: LLM - Génération de réponse')
      const newMessages = [...messages, { role: 'user' as const, content: transcript }]
      
      const response = await audioAPI.generateResponse(
        newMessages,
        buildSystemPrompt(),
        userContext,
        config.llmModel || 'gpt-3.5-turbo', // Utiliser le modèle le plus rapide
        config.temperature || 0.3 // Légèrement moins déterministe mais plus rapide
      )
      
      console.log('✅ LLM terminé. Response:', response.substring(0, 100) + '...')
      
      // Étape 3: TTS - Text to Speech
      console.log('🔊 Étape 3/3: TTS - Conversion texte en audio')
      const audioBuffer = await audioAPI.textToSpeech(response, config.ttsVoice || 'alloy')
      
      // Mettre à jour l'historique des messages
      const finalMessages: Message[] = [
        ...newMessages,
        { role: 'assistant', content: response }
      ]
      
      setMessages(finalMessages.slice(-6)) // Garder seulement les 6 derniers messages
      
      // Lecture de la réponse
      setCurrentStep('speaking')
      setIsProcessing(false)
      onProcessingChange?.(false)
      onSpeakingChange?.(true)
      
      console.log('🔊 Lecture de la réponse audio')
      await audioAPI.playAudioBuffer(audioBuffer)
      console.log('✅ Processus terminé: STT → LLM → TTS')
      
      onSpeakingChange?.(false)
      setCurrentStep('idle')
      
      // Force le redémarrage de l'écoute après un délai
      setTimeout(() => {
        if (isActive && currentStep === 'idle') {
          console.log('🔄 Force restart listening after response')
          setCurrentStep('idle') // Trigger useEffect
        }
      }, 1000)
      
    } catch (error: unknown) {
      console.error('❌ Erreur dans le processus STT → LLM → TTS:', error)
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
      // Message de bienvenue avec TTS (plus court pour réduire latence)
      const welcomeMessage = `Bonjour! Je vous écoute.`
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