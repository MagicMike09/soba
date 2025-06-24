import { useState, useEffect, useRef } from 'react'
import { AnimationState, ConversationMessage } from '@/types'
import { AnimationService } from '@/utils/animationService'

interface UseAnimationStateProps {
  messages: ConversationMessage[]
  isRecording: boolean
  isProcessing: boolean
  isConversationMode: boolean
}

export const useAnimationState = ({
  messages,
  isRecording,
  isProcessing,
  isConversationMode
}: UseAnimationStateProps) => {
  const [animationState, setAnimationState] = useState<AnimationState>('idle')
  const lastProcessedMessageId = useRef<string | null>(null)
  const animationTimeouts = useRef<NodeJS.Timeout[]>([])

  // Nettoyer les timeouts
  const clearAllTimeouts = () => {
    animationTimeouts.current.forEach(timeout => clearTimeout(timeout))
    animationTimeouts.current = []
  }

  // Changer d'animation avec débounce
  const changeAnimation = (newState: AnimationState, duration?: number) => {
    if (newState === animationState) return

    console.log('🎭 Animation change:', animationState, '->', newState)
    setAnimationState(newState)

    // Pour les animations temporaires
    if (duration && (newState === 'hello' || newState === 'bye' || newState === 'talking')) {
      const timeout = setTimeout(() => {
        setAnimationState('idle')
      }, duration)
      animationTimeouts.current.push(timeout)
    }
  }

  // Analyser les nouveaux messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    
    if (lastMessage && lastMessage.id !== lastProcessedMessageId.current) {
      lastProcessedMessageId.current = lastMessage.id
      
      const newAnimationState = AnimationService.analyzeMessage(
        lastMessage.content,
        lastMessage.role
      )

      // Durées spécifiques selon le type d'animation
      let duration: number | undefined
      if (newAnimationState === 'hello' || newAnimationState === 'bye') {
        duration = 3000
      } else if (newAnimationState === 'talking' && lastMessage.role === 'assistant') {
        const messageLength = lastMessage.content.length
        duration = Math.max(2000, Math.min(messageLength * 50, 8000))
      }

      changeAnimation(newAnimationState, duration)
    }
  }, [messages, animationState])

  // Analyser les états de conversation
  useEffect(() => {
    if (isRecording) {
      changeAnimation('listening')
    } else if (isProcessing) {
      changeAnimation('thinking')
    } else if (isConversationMode && messages.length === 0) {
      changeAnimation('hello', 2000)
    }
  }, [isRecording, isProcessing, isConversationMode, messages.length])

  // Nettoyer à la fermeture
  useEffect(() => {
    return () => {
      clearAllTimeouts()
    }
  }, [])

  // Actions publiques
  const triggerGoodbye = () => {
    clearAllTimeouts()
    changeAnimation('bye', 3000)
  }

  const triggerHello = () => {
    clearAllTimeouts()
    changeAnimation('hello', 2000)
  }

  const reset = () => {
    clearAllTimeouts()
    setAnimationState('idle')
    lastProcessedMessageId.current = null
  }

  return {
    animationState,
    triggerGoodbye,
    triggerHello,
    reset
  }
}