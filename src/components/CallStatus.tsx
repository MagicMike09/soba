'use client'

import React, { useState, useEffect } from 'react'
import { Advisor } from '@/types'

interface CallStatusProps {
  advisor: Advisor
  isActive: boolean
  onCallComplete: (result: 'completed' | 'failed' | 'cancelled') => void
  onCancel: () => void
}

type CallStep = 'preparing' | 'sending_email' | 'connecting' | 'ringing' | 'connected' | 'completed' | 'failed' | 'cancelled'

const CallStatus: React.FC<CallStatusProps> = ({
  advisor,
  isActive,
  onCallComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState<CallStep>('preparing')
  const [progress, setProgress] = useState(0)
  const [callDuration, setCallDuration] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isActive) return

    let timer: NodeJS.Timeout | undefined
    let progressTimer: NodeJS.Timeout | undefined

    const simulateCallFlow = async () => {
      try {
        // Étape 1: Préparation
        setCurrentStep('preparing')
        setProgress(10)
        await delay(1000)

        // Étape 2: Envoi email
        setCurrentStep('sending_email')
        setProgress(30)
        await delay(2000)

        // Étape 3: Connexion
        setCurrentStep('connecting')
        setProgress(50)
        await delay(3000)

        // Étape 4: Sonnerie
        setCurrentStep('ringing')
        setProgress(70)
        
        // Simuler une réponse ou échec après 10-15 secondes
        const waitTime = 10000 + Math.random() * 5000
        const success = Math.random() > 0.3 // 70% de chance de succès

        await delay(waitTime)

        if (success) {
          // Étape 5: Connecté
          setCurrentStep('connected')
          setProgress(100)
          
          // Simuler durée d'appel
          let duration = 0
          timer = setInterval(() => {
            duration += 1
            setCallDuration(duration)
          }, 1000)

          // Appel se termine après 30-120 secondes
          const callDuration = 30 + Math.random() * 90
          await delay(callDuration * 1000)

          clearInterval(timer)
          setCurrentStep('completed')
          onCallComplete('completed')
        } else {
          setCurrentStep('failed')
          setError('Le conseiller n\'a pas répondu')
          onCallComplete('failed')
        }

      } catch (callError) {
        console.error('Call simulation error:', callError)
        setCurrentStep('failed')
        setError('Erreur technique lors de l\'appel')
        onCallComplete('failed')
      }
    }

    simulateCallFlow()

    return () => {
      if (timer) clearInterval(timer)
      if (progressTimer) clearInterval(progressTimer)
    }
  }, [isActive, onCallComplete])

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const getStepIcon = (step: CallStep): string => {
    switch (step) {
      case 'preparing': return '⚙️'
      case 'sending_email': return '📧'
      case 'connecting': return '🔗'
      case 'ringing': return '📞'
      case 'connected': return '✅'
      case 'completed': return '🎉'
      case 'failed': return '❌'
      case 'cancelled': return '🚫'
      default: return '📞'
    }
  }

  const getStepText = (step: CallStep): string => {
    switch (step) {
      case 'preparing': return 'Préparation de l\'appel...'
      case 'sending_email': return 'Envoi de la notification au conseiller...'
      case 'connecting': return 'Établissement de la connexion...'
      case 'ringing': return `Appel en cours vers ${advisor.firstName}...`
      case 'connected': return `Connecté avec ${advisor.firstName} ${advisor.lastName}`
      case 'completed': return 'Appel terminé avec succès'
      case 'failed': return 'Échec de l\'appel'
      case 'cancelled': return 'Appel annulé'
      default: return 'Appel en cours...'
    }
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isActive) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl text-white">{getStepIcon(currentStep)}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Appel en cours
          </h2>
          <p className="text-gray-600">
            {advisor.firstName} {advisor.lastName}
          </p>
          <p className="text-sm text-gray-500">
            {advisor.position}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Status */}
        <div className="text-center mb-6">
          <p className="text-lg font-medium text-gray-900 mb-2">
            {getStepText(currentStep)}
          </p>
          
          {currentStep === 'connected' && (
            <p className="text-2xl font-bold text-green-600">
              {formatDuration(callDuration)}
            </p>
          )}
          
          {error && (
            <p className="text-red-600 text-sm mt-2">
              {error}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {currentStep !== 'completed' && currentStep !== 'failed' && (
            <button
              onClick={() => {
                setCurrentStep('cancelled')
                onCancel()
              }}
              className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              Annuler l'appel
            </button>
          )}
          
          {(currentStep === 'completed' || currentStep === 'failed' || currentStep === 'cancelled') && (
            <button
              onClick={() => onCallComplete(currentStep as 'completed' | 'failed' | 'cancelled')}
              className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Fermer
            </button>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            📧 Email automatique envoyé • 📞 Appel WebRTC • ⏱️ Timeout: 45s
          </p>
        </div>
      </div>
    </div>
  )
}

export default CallStatus