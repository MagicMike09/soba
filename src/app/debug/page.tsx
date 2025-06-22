'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugPage() {
  const [status, setStatus] = useState({
    supabase: 'Vérification...',
    tables: 'Vérification...',
    openai: 'Vérification...',
    storage: 'Vérification...'
  })

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    // Test Supabase connection
    try {
      const { data } = await supabase.from('advisors').select('count', { count: 'exact' })
      setStatus(prev => ({ 
        ...prev, 
        supabase: '✅ Connecté', 
        tables: `✅ ${data?.length || 0} conseillers trouvés` 
      }))
    } catch {
      setStatus(prev => ({ ...prev, supabase: '❌ Échec', tables: '❌ Erreur' }))
    }

    // Test OpenAI
    const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY
    setStatus(prev => ({ 
      ...prev, 
      openai: openaiKey ? '✅ Clé présente' : '❌ Pas de clé API'
    }))

    // Test Storage
    try {
      const { data } = await supabase.storage.listBuckets()
      const hasUploads = data?.some(bucket => bucket.name === 'uploads')
      setStatus(prev => ({ 
        ...prev, 
        storage: hasUploads ? '✅ Bucket uploads existe' : '❌ Pas de bucket uploads'
      }))
    } catch {
      setStatus(prev => ({ ...prev, storage: '❌ Erreur storage' }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 Diagnostic Application</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">État des Services</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Supabase:</span>
              <span>{status.supabase}</span>
            </div>
            <div className="flex justify-between">
              <span>Tables:</span>
              <span>{status.tables}</span>
            </div>
            <div className="flex justify-between">
              <span>OpenAI:</span>
              <span>{status.openai}</span>
            </div>
            <div className="flex justify-between">
              <span>Storage:</span>
              <span>{status.storage}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions Recommandées</h2>
          <div className="space-y-3">
            {status.openai.includes('❌') && (
              <div className="p-3 bg-red-50 text-red-800 rounded">
                Ajoutez votre clé OpenAI dans Vercel Settings &gt; Environment Variables
              </div>
            )}
            {status.storage.includes('❌') && (
              <div className="p-3 bg-yellow-50 text-yellow-800 rounded">
                Créez le bucket uploads dans Supabase Storage
              </div>
            )}
            {status.tables.includes('❌') && (
              <div className="p-3 bg-blue-50 text-blue-800 rounded">
                Exécutez les scripts SQL pour créer les tables
              </div>
            )}
            {status.supabase.includes('✅') && status.storage.includes('✅') && (
              <div className="p-3 bg-green-50 text-green-800 rounded">
                ✅ Configuration correcte ! Votre application devrait fonctionner.
              </div>
            )}
          </div>
        </div>

        <button
          onClick={checkStatus}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          🔄 Relancer le diagnostic
        </button>
      </div>
    </div>
  )
}