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

  // Configuration pour la gestion des messages
  const MAX_MESSAGES = 20 // Limite pour éviter les dépassements de tokens
  const STORAGE_KEY = 'conversation-session'

  // Charger les messages au démarrage uniquement dans la même session
  useEffect(() => {
    const sessionId = sessionStorage.getItem('session-id')
    const currentSession = Date.now().toString()
    
    if (!sessionId) {
      // Nouvelle session - générer un ID et nettoyer
      sessionStorage.setItem('session-id', currentSession)
      localStorage.removeItem(STORAGE_KEY)
    } else {
      // Session existante - charger les messages
      const savedMessages = localStorage.getItem(STORAGE_KEY)
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages)
          setMessages(parsedMessages)
        } catch (error) {
          console.error('Error loading saved messages:', error)
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    }
  }, [])

  // Sauvegarder les messages à chaque modification
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    }
  }, [messages])

  const addMessage = useCallback((message: Omit<ConversationMessage, 'id' | 'timestamp'>) => {
    const newMessage: ConversationMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date()
    }
    
    setMessages(prev => {
      const updated = [...prev, newMessage]
      // Limiter le nombre de messages pour éviter les dépassements de tokens
      if (updated.length > MAX_MESSAGES) {
        // Garder les messages système et les plus récents
        const systemMessages = updated.filter(msg => msg.role === 'system')
        const otherMessages = updated.filter(msg => msg.role !== 'system')
        const recentMessages = otherMessages.slice(-MAX_MESSAGES + systemMessages.length)
        return [...systemMessages, ...recentMessages]
      }
      return updated
    })
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem('session-id')
  }, [])

  const startRecording = useCallback(() => {
    setIsRecording(true)
  }, [])

  const stopRecording = useCallback(() => {
    setIsRecording(false)
  }, [])

  // Nettoyer les messages à la fermeture de session
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Ne pas nettoyer immédiatement, permettre le rechargement de page
      // Le nettoyage se fait au prochain démarrage d'une nouvelle session
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page devient cachée - sauvegarder l'état
        if (messages.length > 0) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [messages])

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