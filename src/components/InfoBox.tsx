'use client'

import React, { useState } from 'react'
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
  const [imageError, setImageError] = useState(false)
  const [videoError, setVideoError] = useState(false)

  if (!isVisible) return null

  // Auto-detect media type if not provided
  const getMediaType = () => {
    if (mediaType) return mediaType
    if (!mediaUrl) return null
    
    const url = mediaUrl.toLowerCase()
    if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp')) {
      return 'image'
    }
    if (url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg')) {
      return 'video'
    }
    return 'image' // Default to image
  }

  const detectedMediaType = getMediaType()

  return (
    <div className="fixed bottom-8 left-8 max-w-md z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden neo-minimal">
        <div className="relative">
          {mediaUrl && (
            <div className="w-full h-48 bg-gray-100 relative">
              {detectedMediaType === 'image' && !imageError ? (
                <Image
                  src={mediaUrl}
                  alt="Info content"
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                  priority
                />
              ) : detectedMediaType === 'video' && !videoError ? (
                <video
                  src={mediaUrl}
                  controls
                  className="w-full h-full object-cover"
                  onError={() => setVideoError(true)}
                >
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>
              ) : (
                <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-gray-400 text-3xl mb-2">🖼️</div>
                    <span className="text-gray-500 text-sm">
                      {imageError || videoError ? 'Média non disponible' : 'Chargement...'}
                    </span>
                  </div>
                </div>
              )}
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