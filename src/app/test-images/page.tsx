'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestImages() {
  const [brandConfig, setBrandConfig] = useState<{
    main_logo_url?: string
    info_box_media_url?: string
    info_box_media_type?: string
  } | null>(null)
  const [advisors, setAdvisors] = useState<{
    first_name: string
    last_name: string
    photo_url?: string
  }[]>([])

  useEffect(() => {
    async function loadData() {
      // Load brand config
      const { data: brandData } = await supabase.from('brand_config').select('*').single()
      setBrandConfig(brandData)

      // Load advisors
      const { data: advisorsData } = await supabase.from('advisors').select('*').limit(3)
      setAdvisors(advisorsData || [])
    }
    loadData()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🖼️ Test des Images</h1>
        
        {/* Test Logo Principal */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Logo Principal</h2>
          <div className="space-y-4">
            <p><strong>URL:</strong> {brandConfig?.main_logo_url || 'Non définie'}</p>
            {brandConfig?.main_logo_url && (
              <div className="relative h-20 w-40 border">
                <Image
                  src={brandConfig.main_logo_url}
                  alt="Logo principal"
                  fill
                  className="object-contain"
                  onError={(e) => console.error('Erreur logo principal:', e)}
                  onLoad={() => console.log('Logo principal chargé avec succès')}
                />
              </div>
            )}
          </div>
        </div>

        {/* Test InfoBox Media */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">InfoBox Media</h2>
          <div className="space-y-4">
            <p><strong>URL:</strong> {brandConfig?.info_box_media_url || 'Non définie'}</p>
            <p><strong>Type:</strong> {brandConfig?.info_box_media_type || 'Non défini'}</p>
            {brandConfig?.info_box_media_url && (
              <div className="relative h-40 w-60 border">
                <Image
                  src={brandConfig.info_box_media_url}
                  alt="InfoBox media"
                  fill
                  className="object-cover"
                  onError={(e) => console.error('Erreur InfoBox media:', e)}
                  onLoad={() => console.log('InfoBox media chargé avec succès')}
                />
              </div>
            )}
          </div>
        </div>

        {/* Test Photos Conseillers */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Photos Conseillers</h2>
          <div className="space-y-4">
            {advisors.map((advisor, index) => (
              <div key={index} className="border-b pb-4">
                <p><strong>Nom:</strong> {advisor.first_name} {advisor.last_name}</p>
                <p><strong>URL Photo:</strong> {advisor.photo_url || 'Non définie'}</p>
                {advisor.photo_url && (
                  <div className="relative h-16 w-16 border rounded-full overflow-hidden mt-2">
                    <Image
                      src={advisor.photo_url}
                      alt={`${advisor.first_name} ${advisor.last_name}`}
                      fill
                      className="object-cover"
                      onError={(e) => console.error(`Erreur photo ${advisor.first_name}:`, e)}
                      onLoad={() => console.log(`Photo ${advisor.first_name} chargée avec succès`)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Test Image Directe */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test Image Directe</h2>
          <div className="relative h-40 w-60 border">
            <Image
              src="https://wdgypadoxenvdrgvhrbs.supabase.co/storage/v1/object/public/uploads/1750606970954.png"
              alt="Test direct"
              fill
              className="object-cover"
              onError={(e) => console.error('Erreur test direct:', e)}
              onLoad={() => console.log('Test direct chargé avec succès')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}