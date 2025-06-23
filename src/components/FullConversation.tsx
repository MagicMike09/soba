'use client'

import React, { useState, useEffect } from 'react'
import { AudioAPI, SimpleAudioRecorder } from '@/utils/audioAPI'

interface FullConversationProps {
  apiKey: string
  config: {
    agentName?: string
    agentMission?: string
    agentPersonality?: string
    llmModel?: string
    temperature?: number
    sttLanguage?: string
    ttsVoice?: string
    ttsSpeed?: number
  }
  userContext?: unknown
  onTranscript?: (text: string) => void
  onResponse?: (text: string) => void
  onError?: (error: string) => void
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const FullConversation: React.FC<FullConversationProps> = ({ 
  apiKey, 
  config,
  userContext,
  onTranscript, 
  onResponse,
  onError
}) => {
  const [isActive, setIsActive] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle')
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])
  const [error, setError] = useState('')
  
  const [audioAPI] = useState(() => new AudioAPI(apiKey))
  const [recorder] = useState(() => new SimpleAudioRecorder())

  // Auto-restart recording after speaking (for continuous conversation)
  useEffect(() => {
    const autoRestart = () => {
      if (isActive && currentStep === 'idle' && !isRecording && !isProcessing && !isPlaying) {
        setTimeout(() => {
          if (isActive) {
            startListening()
          }
        }, 1000) // Wait 1 second before restarting
      }
    }
    
    autoRestart()
  }, [isActive, currentStep, isRecording, isProcessing, isPlaying])

  const buildSystemPrompt = (): string => {
    return `Tu es ${config.agentName || 'un assistant virtuel'}.
${config.agentMission || 'Tu aides les utilisateurs avec leurs questions.'}
${config.agentPersonality || 'Tu es professionnel et serviable.'}

Réponds de manière naturelle et conversationnelle en français. 
Garde tes réponses courtes et engageantes (maximum 2-3 phrases).
Utilise un ton amical et professionnel.`
  }

  const startListening = async () => {
    try {
      setError('')
      setIsRecording(true)
      setCurrentStep('listening')
      
      await recorder.startRecording()
      console.log('🎤 FullConversation: Started listening...')
      
      // Auto-stop after 5 seconds or when user stops speaking
      setTimeout(async () => {
        if (recorder.isRecording()) {
          await processRecording()
        }
      }, 5000)
      
    } catch (error: unknown) {
      const errorMessage = AudioAPI.handleAPIError(error)
      setError(errorMessage)
      onError?.(errorMessage)
      setIsRecording(false)
      setCurrentStep('idle')
    }
  }

  const processRecording = async () => {
    try {
      setIsRecording(false)
      setIsProcessing(true)
      setCurrentStep('processing')
      
      const audioBlob = await recorder.stopRecording()
      console.log('🔄 FullConversation: Processing audio blob size:', audioBlob.size)
      
      if (audioBlob.size < 1000) {
        console.log('⚠️ FullConversation: Audio too short, restarting...')
        setIsProcessing(false)
        setCurrentStep('idle')
        return
      }
      
      // Use complete conversation flow
      const result = await audioAPI.completeConversationFlow(
        audioBlob,
        conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
        {
          sttLanguage: config.sttLanguage || 'fr',
          systemPrompt: buildSystemPrompt(),
          userContext: userContext,
          llmModel: config.llmModel || 'gpt-4',
          temperature: config.temperature || 0.7,
          ttsVoice: config.ttsVoice || 'alloy',
          ttsSpeed: config.ttsSpeed || 1.0
        }
      )
      
      // Add messages to conversation history
      const userMessage: ConversationMessage = {
        role: 'user',
        content: result.transcript,
        timestamp: new Date()
      }
      
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: result.response,
        timestamp: new Date()
      }
      
      setConversationHistory(prev => [...prev, userMessage, assistantMessage])
      
      // Trigger callbacks
      onTranscript?.(result.transcript)
      onResponse?.(result.response)
      
      setIsProcessing(false)
      setIsPlaying(true)
      setCurrentStep('speaking')
      
      // Play the response audio
      await audioAPI.playAudioBuffer(result.audioBuffer)
      
      setIsPlaying(false)
      setCurrentStep('idle')
      
    } catch (error: unknown) {
      const errorMessage = AudioAPI.handleAPIError(error)
      setError(errorMessage)
      onError?.(errorMessage)
      setIsProcessing(false)
      setCurrentStep('idle')
    }
  }

  const startConversation = () => {
    setIsActive(true)
    setConversationHistory([])
    setError('')
    setCurrentStep('idle')
    console.log('🚀 FullConversation: Starting conversation mode')
  }

  const stopConversation = () => {
    setIsActive(false)
    setIsRecording(false)
    setIsProcessing(false)
    setIsPlaying(false)
    setCurrentStep('idle')
    
    // Stop any ongoing recording
    if (recorder.isRecording()) {
      recorder.stopRecording().catch(console.error)
    }
    
    console.log('🛑 FullConversation: Stopped conversation mode')
  }

  const getStatusText = (): string => {
    switch (currentStep) {
      case 'listening': return '🎤 Je vous écoute...'
      case 'processing': return '🧠 Je réfléchis...'
      case 'speaking': return '🔊 Je réponds...'
      default: return isActive ? '✅ Prêt à vous écouter' : '⏸️ En pause'
    }
  }

  const getStatusColor = (): string => {
    switch (currentStep) {
      case 'listening': return 'text-blue-600'
      case 'processing': return 'text-orange-600'
      case 'speaking': return 'text-green-600'
      default: return isActive ? 'text-green-600' : 'text-gray-600'
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg mx-auto border-2 border-gray-200">
      <h3 className="text-xl font-bold mb-4 text-center text-gray-800">
        💬 Conversation Complète
      </h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Status */}
      <div className={`text-center mb-6 p-3 rounded-lg bg-gray-50 ${getStatusColor()}`}>
        <div className="text-lg font-medium">{getStatusText()}</div>
        {conversationHistory.length > 0 && (
          <div className="text-sm text-gray-600 mt-1">
            {conversationHistory.length / 2} échange(s) de conversation
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="flex gap-3 mb-6">
        {!isActive ? (
          <button
            onClick={startConversation}
            className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
          >
            🚀 Démarrer la Conversation
          </button>
        ) : (
          <>
            <button
              onClick={stopConversation}
              className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              🛑 Arrêter
            </button>
            
            {currentStep === 'idle' && (
              <button
                onClick={startListening}
                className="px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                🎤 Parler
              </button>
            )}
          </>
        )}
      </div>
      
      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-3">
          <h4 className="font-medium text-sm text-gray-700 mb-2">Derniers échanges:</h4>
          {conversationHistory.slice(-4).map((msg, index) => (
            <div key={index} className={`text-sm mb-2 p-2 rounded ${
              msg.role === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
            }`}>
              <strong>{msg.role === 'user' ? '👤 Vous' : '🤖 Assistant'}:</strong>
              <div className="mt-1">{msg.content}</div>
            </div>
          ))}
        </div>
      )}
      
      {/* Configuration Display */}
      <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <div><strong>Modèle:</strong> {config.llmModel || 'gpt-4'}</div>
        <div><strong>Voix:</strong> {config.ttsVoice || 'alloy'}</div>
        <div><strong>Langue:</strong> {config.sttLanguage || 'fr'}</div>
      </div>
    </div>
  )
}

export default FullConversation