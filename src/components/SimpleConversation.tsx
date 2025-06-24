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
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SimpleConversation: React.FC<SimpleConversationProps> = ({ 
  apiKey, 
  config,
  userContext
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
        silenceThreshold: -40,
        silenceTimeout: 1500,
        maxRecordingTime: 15000,
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
      
      const audioBlob = await recorder.stopRecording()
      
      if (audioBlob.size < 500) {
        setIsProcessing(false)
        setCurrentStep('idle')
        return
      }
      
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
      await audioAPI.playAudioBuffer(result.audioBuffer)
      
      setIsProcessing(false)
      setCurrentStep('idle')
      
    } catch (error: unknown) {
      console.error('Erreur traitement:', error)
      setIsProcessing(false)
      setCurrentStep('idle')
    }
  }

  const startConversation = () => {
    setIsActive(true)
    setMessages([])
    setCurrentStep('idle')
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
          <button
            onClick={stopConversation}
            className="flex-1 px-3 sm:px-4 py-2 bg-red-500 text-white rounded text-sm sm:text-base font-medium hover:bg-red-600 transition-colors"
          >
            🛑 Arrêter
          </button>
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