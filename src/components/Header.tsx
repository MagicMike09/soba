'use client'

import React, { useState } from 'react'
import Image from 'next/image'

interface HeaderProps {
  logoUrl?: string
  onConverseClick: () => void
  onCallClick: () => void
  onHelpClick: () => void
  onDiagnosticClick?: () => void
  isConversationMode?: boolean
}

const Header: React.FC<HeaderProps> = ({
  logoUrl,
  onConverseClick,
  onCallClick,
  onHelpClick,
  onDiagnosticClick,
  isConversationMode = false
}) => {
  const [logoError, setLogoError] = useState(false)
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="flex items-center">
        {logoUrl && !logoError ? (
          <div className="relative h-8 w-24 sm:h-10 sm:w-32">
            <Image
              src={logoUrl}
              alt="Company Logo"
              fill
              className="object-contain"
              onError={() => setLogoError(true)}
            />
          </div>
        ) : (
          <div className="h-8 w-24 sm:h-10 sm:w-32 bg-gray-200 rounded-md flex items-center justify-center">
            <span className="text-gray-500 text-xs sm:text-sm">Logo</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        <button
          onClick={onConverseClick}
          className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
            isConversationMode
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-black text-white hover:bg-gray-800 hover:transform hover:scale-105'
          }`}
        >
          {isConversationMode ? (
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="hidden sm:inline">Arrêter</span>
              <span className="sm:hidden">Stop</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span>🎤</span>
              <span className="hidden sm:inline">Converser</span>
              <span className="sm:hidden">Parler</span>
            </div>
          )}
        </button>

        <button
          onClick={onCallClick}
          className="px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium bg-white text-black border-2 border-black hover:bg-black hover:text-white transition-all duration-200 hover:transform hover:scale-105 text-sm sm:text-base"
        >
          <span className="hidden sm:inline">📧 Contacter</span>
          <span className="sm:hidden">📧</span>
        </button>

        <button
          onClick={onHelpClick}
          className="px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200 hover:transform hover:scale-105 text-sm sm:text-base"
        >
          <span className="hidden sm:inline">Aide</span>
          <span className="sm:hidden">❓</span>
        </button>

        {onDiagnosticClick && (
          <button
            onClick={onDiagnosticClick}
            className="px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium bg-orange-500 text-white hover:bg-orange-600 transition-all duration-200 text-sm sm:text-base"
            title="Diagnostic Email & Appel"
          >
            🔧
          </button>
        )}
      </div>
    </header>
  )
}

export default Header