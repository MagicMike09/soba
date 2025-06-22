'use client'

import React from 'react'
import Image from 'next/image'

interface FooterProps {
  logo1Url?: string
  logo2Url?: string
}

const Footer: React.FC<FooterProps> = ({ logo1Url, logo2Url }) => {
  return (
    <footer className="flex items-center justify-center px-8 py-4 bg-white/50 backdrop-blur-sm border-t border-gray-100">
      <div className="flex items-center space-x-6 text-sm text-gray-500">
        <span>Powered by</span>
        
        {logo1Url ? (
          <div className="relative h-6 w-20">
            <Image
              src={logo1Url}
              alt="Partner Logo 1"
              fill
              className="object-contain opacity-70 hover:opacity-100 transition-opacity"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div className="h-6 w-20 bg-gray-200 rounded items-center justify-center hidden">
              <span className="text-xs text-gray-400">Logo 1</span>
            </div>
          </div>
        ) : (
          <div className="h-6 w-20 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-xs text-gray-400">Logo 1</span>
          </div>
        )}

        {logo2Url ? (
          <div className="relative h-6 w-20">
            <Image
              src={logo2Url}
              alt="Partner Logo 2"
              fill
              className="object-contain opacity-70 hover:opacity-100 transition-opacity"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div className="h-6 w-20 bg-gray-200 rounded items-center justify-center hidden">
              <span className="text-xs text-gray-400">Logo 2</span>
            </div>
          </div>
        ) : (
          <div className="h-6 w-20 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-xs text-gray-400">Logo 2</span>
          </div>
        )}
      </div>
    </footer>
  )
}

export default Footer