'use client'

import React, { useState } from 'react'
import Image from 'next/image'

interface InfoBoxProps {
  isVisible: boolean
  content?: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
}

const InfoBox: React.FC<InfoBoxProps> = ({
  isVisible,
  content,
  mediaUrl,
  mediaType
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
    <div className="fixed bottom-4 left-4 sm:bottom-8 sm:left-8 z-50 
                    max-w-[90vw] sm:max-w-[60vw] lg:max-w-[50vw] xl:max-w-[40vw] 
                    max-h-[40vh] sm:max-h-[40vh] lg:max-h-[40vh]">
      <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden neo-minimal w-fit h-fit min-w-[180px] sm:min-w-[200px]">
        <div className="relative">
          {mediaUrl && (
            <div className="w-full bg-gray-100 relative" style={{ maxHeight: content ? '40%' : '100%' }}>
              {detectedMediaType === 'image' && !imageError ? (
                <div className="relative w-full h-auto max-h-24 sm:max-h-32">
                  <Image
                    src={mediaUrl}
                    alt="Info content"
                    width={300}
                    height={128}
                    className="object-cover w-full h-auto max-h-24 sm:max-h-32"
                    onError={() => setImageError(true)}
                    priority
                  />
                </div>
              ) : detectedMediaType === 'video' && !videoError ? (
                <video
                  src={mediaUrl}
                  controls
                  className="w-full h-auto max-h-24 sm:max-h-32 object-cover"
                  onError={() => setVideoError(true)}
                >
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>
              ) : (
                <div className="bg-gray-200 flex items-center justify-center h-16 sm:h-20">
                  <div className="text-center">
                    <div className="text-gray-400 text-lg sm:text-xl mb-1">🖼️</div>
                    <span className="text-gray-500 text-xs">
                      {imageError || videoError ? 'Média non disponible' : 'Chargement...'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {content && (
          <div className="p-3 sm:p-4 max-h-[18vh] sm:max-h-[15vh] lg:max-h-[12vh] overflow-y-auto">
            <div 
              className="text-gray-800 text-xs sm:text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default InfoBox