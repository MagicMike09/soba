'use client'

import React, { useState } from 'react'
import Image from 'next/image'

interface HeaderProps {
  logoUrl?: string
  onConverseClick: () => void
  onCallClick: () => void
  onHelpClick: () => void
  isRecording?: boolean
}

const Header: React.FC<HeaderProps> = ({
  logoUrl,
  onConverseClick,
  onCallClick,
  onHelpClick,
  isRecording = false
}) => {
  const [logoError, setLogoError] = useState(false)
  return (
    <header className="flex items-center justify-between px-8 py-6 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="flex items-center">
        {logoUrl && !logoError ? (
          <div className="relative h-10 w-32">
            <Image
              src={logoUrl}
              alt="Company Logo"
              fill
              className="object-contain"
              onError={() => setLogoError(true)}
            />
          </div>
        ) : (
          <div className="h-10 w-32 bg-gray-200 rounded-md flex items-center justify-center">
            <span className="text-gray-500 text-sm">Logo</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={onConverseClick}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-black text-white hover:bg-gray-800 hover:transform hover:scale-105'
          }`}
        >
          {isRecording ? (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>Écoute...</span>
            </div>
          ) : (
            'Converser'
          )}
        </button>

        <button
          onClick={onCallClick}
          className="px-6 py-3 rounded-lg font-medium bg-white text-black border-2 border-black hover:bg-black hover:text-white transition-all duration-200 hover:transform hover:scale-105"
        >
          Appeler
        </button>

        <button
          onClick={onHelpClick}
          className="px-6 py-3 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200 hover:transform hover:scale-105"
        >
          Aide
        </button>
      </div>
    </header>
  )
}

export default Header