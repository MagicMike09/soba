'use client'

import React, { useRef, useEffect } from 'react'
import { ConversationMessage } from '@/types'

interface ChatBoxProps {
  messages: ConversationMessage[]
  isRecording: boolean
  isProcessing: boolean
  currentTranscript?: string
  onToggle: () => void
  isVisible: boolean
}

const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  isRecording,
  isProcessing,
  currentTranscript,
  onToggle,
  isVisible
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentTranscript])

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
      isVisible ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 w-80 h-96 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              isRecording ? 'bg-red-500 animate-pulse' : 
              isProcessing ? 'bg-yellow-500 animate-spin' : 
              'bg-green-500'
            }`}></div>
            <h3 className="font-semibold text-gray-900">Conversation</h3>
          </div>
          <button
            onClick={onToggle}
            className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
          >
            <span className="text-gray-600 text-sm">×</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && !currentTranscript && (
            <div className="text-center text-gray-500 text-sm py-8">
              <div className="mb-2">🎤</div>
              <p>Cliquez sur "Converser" pour commencer</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <div className="break-words">{message.content}</div>
                <div className={`text-xs mt-1 opacity-70 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {/* Current transcript while recording */}
          {isRecording && currentTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl px-3 py-2 text-sm bg-blue-400 text-white opacity-75 border-2 border-blue-300 border-dashed">
                <div className="break-words">{currentTranscript}</div>
                <div className="text-xs mt-1 text-blue-100">
                  En cours d'enregistrement...
                </div>
              </div>
            </div>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-600 rounded-2xl px-3 py-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>Traitement en cours...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Status bar */}
        <div className="px-4 py-2 bg-gray-50/80 border-t border-gray-200">
          <div className="text-xs text-gray-600 flex items-center justify-between">
            <span>
              {isRecording ? '🎤 Enregistrement...' :
               isProcessing ? '⚙️ Traitement...' :
               '✅ Prêt'}
            </span>
            <span>{messages.length} messages</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatBox