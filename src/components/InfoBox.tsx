'use client'

import React from 'react'
import Image from 'next/image'

interface InfoBoxProps {
  isVisible: boolean
  content?: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
  onClose: () => void
}

const InfoBox: React.FC<InfoBoxProps> = ({
  isVisible,
  content,
  mediaUrl,
  mediaType,
  onClose
}) => {
  if (!isVisible) return null

  return (
    <div className="fixed bottom-8 left-8 max-w-md z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden neo-minimal">
        <div className="relative">
          {mediaUrl && (
            <div className="w-full h-48 bg-gray-100">
              {mediaType === 'image' ? (
                <Image
                  src={mediaUrl}
                  alt="Info content"
                  fill
                  className="object-cover"
                />
              ) : mediaType === 'video' ? (
                <video
                  src={mediaUrl}
                  controls
                  className="w-full h-full object-cover"
                  poster="/api/placeholder/400/200"
                >
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>
              ) : null}
            </div>
          )}
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            ×
          </button>
        </div>

        {content && (
          <div className="p-6">
            <div 
              className="text-gray-800 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default InfoBox