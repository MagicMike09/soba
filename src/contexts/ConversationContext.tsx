'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { ConversationMessage, ConversationContext as ConversationContextType } from '@/types'

const ConversationContext = createContext<ConversationContextType | undefined>(undefined)

export const useConversation = () => {
  const context = useContext(ConversationContext)
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider')
  }
  return context
}

interface ConversationProviderProps {
  children: React.ReactNode
}

export const ConversationProvider: React.FC<ConversationProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying] = useState(false)

  const addMessage = useCallback((message: Omit<ConversationMessage, 'id' | 'timestamp'>) => {
    const newMessage: ConversationMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const startRecording = useCallback(() => {
    setIsRecording(true)
  }, [])

  const stopRecording = useCallback(() => {
    setIsRecording(false)
  }, [])

  // Clear messages on page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearMessages()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [clearMessages])

  const value: ConversationContextType = {
    messages,
    isRecording,
    isPlaying,
    addMessage,
    clearMessages,
    startRecording,
    stopRecording
  }

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  )
}