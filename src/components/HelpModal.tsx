'use client'

import React from 'react'

interface HelpModalProps {
  isOpen: boolean
  helpText?: string
  onClose: () => void
}

const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  helpText,
  onClose
}) => {
  if (!isOpen) return null

  const defaultHelpText = `
    <h3>Comment utiliser l'assistant virtuel</h3>
    
    <h4>🎤 Converser</h4>
    <p>Cliquez sur le bouton "Converser" pour commencer une conversation vocale avec l'assistant. L'enregistrement s'arrête automatiquement après 3 secondes de silence.</p>
    
    <h4>📞 Appeler</h4>
    <p>Cliquez sur "Appeler" pour voir la liste des conseillers disponibles et démarrer un appel vidéo. Un email sera automatiquement envoyé au conseiller sélectionné.</p>
    
    <h4>❓ Aide</h4>
    <p>Cette fenêtre d'aide vous explique comment utiliser toutes les fonctionnalités de l'interface.</p>
    
    <h4>💡 Conseils</h4>
    <ul>
      <li>Parlez clairement près de votre microphone</li>
      <li>Vous pouvez interrompre l'assistant à tout moment en cliquant sur "Converser"</li>
      <li>Votre conversation est maintenue pendant toute votre session</li>
      <li>Les données de localisation aident l'assistant à vous donner des réponses contextuelles</li>
    </ul>
  `

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden">
        <div className="p-4 sm:p-8 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Guide d&apos;utilisation
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors text-lg sm:text-xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-8 overflow-y-auto max-h-64 sm:max-h-96">
          <div 
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: helpText || defaultHelpText }}
            style={{
              lineHeight: '1.6'
            }}
          />
        </div>

        <div className="p-4 sm:p-8 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 sm:py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm sm:text-base"
          >
            Fermer
          </button>
        </div>
      </div>

      <style jsx>{`
        .prose h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #1f2937;
        }
        .prose h4 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          margin-top: 1.5rem;
          color: #374151;
        }
        .prose p {
          margin-bottom: 1rem;
          color: #6b7280;
        }
        .prose ul {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        .prose li {
          margin-bottom: 0.5rem;
          color: #6b7280;
        }
      `}</style>
    </div>
  )
}

export default HelpModal