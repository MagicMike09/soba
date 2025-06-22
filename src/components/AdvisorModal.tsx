'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Advisor } from '@/types'

interface AdvisorModalProps {
  isOpen: boolean
  advisors: Advisor[]
  onClose: () => void
  onSelectAdvisor: (advisor: Advisor) => void
}

const AdvisorModal: React.FC<AdvisorModalProps> = ({
  isOpen,
  advisors,
  onClose,
  onSelectAdvisor
}) => {
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  if (!isOpen) return null

  const handleSelectAdvisor = async (advisor: Advisor) => {
    setSelectedAdvisor(advisor)
    setIsConnecting(true)
    
    try {
      await onSelectAdvisor(advisor)
    } catch (error) {
      console.error('Failed to connect to advisor:', error)
    } finally {
      setIsConnecting(false)
      setSelectedAdvisor(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-8 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Choisir un conseiller
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Sélectionnez un conseiller pour commencer un appel
          </p>
        </div>

        <div className="p-8 overflow-y-auto max-h-96">
          {advisors.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-2xl">👥</span>
              </div>
              <p className="text-gray-500">Aucun conseiller disponible</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {advisors.map((advisor) => (
                <div
                  key={advisor.id}
                  className="p-6 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all cursor-pointer neo-minimal"
                  onClick={() => handleSelectAdvisor(advisor)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden flex-shrink-0 relative">
                      {advisor.photoUrl ? (
                        <Image
                          src={advisor.photoUrl}
                          alt={`${advisor.firstName} ${advisor.lastName}`}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">
                          👤
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {advisor.firstName} {advisor.lastName}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">
                        {advisor.position}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {advisor.email}
                      </p>
                    </div>
                  </div>

                  {selectedAdvisor?.id === advisor.id && isConnecting && (
                    <div className="mt-4 text-center">
                      <div className="inline-flex items-center space-x-2 text-blue-600">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm">Connexion en cours...</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-8 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600 text-center">
            Un email sera automatiquement envoyé au conseiller sélectionné.
            L&apos;appel se terminera automatiquement après 45 secondes sans réponse.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdvisorModal