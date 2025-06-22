'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugPage() {
  const [status, setStatus] = useState({
    supabase: 'checking...',
    tables: 'checking...',
    openai: 'checking...',
    storage: 'checking...'
  })

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    // Test Supabase connection
    try {
      const { data, error } = await supabase.from('advisors').select('count', { count: 'exact' })
      if (error) throw error
      setStatus(prev => ({ ...prev, supabase: '✅ Connected', tables: `✅ ${data?.length || 0} advisors` }))
    } catch (error) {
      setStatus(prev => ({ ...prev, supabase: '❌ Failed', tables: '❌ Error' }))
    }

    // Test OpenAI
    const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY
    setStatus(prev => ({ 
      ...prev, 
      openai: openaiKey ? '✅ Key present' : '❌ No API key'
    }))

    // Test Storage
    try {
      const { data } = await supabase.storage.listBuckets()
      const hasUploads = data?.some(bucket => bucket.name === 'uploads')
      setStatus(prev => ({ 
        ...prev, 
        storage: hasUploads ? '✅ Bucket exists' : '❌ No uploads bucket'
      }))
    } catch (error) {
      setStatus(prev => ({ ...prev, storage: '❌ Storage error' }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 Diagnostic de l'Application</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">📊 État des Services</h2>
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

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🔧 Actions Recommandées</h2>
            <div className="space-y-2 text-sm">
              {status.openai.includes('❌') && (
                <div className="p-3 bg-red-50 text-red-800 rounded">
                  Ajoutez votre clé OpenAI dans Vercel Settings > Environment Variables
                </div>
              )}
              {status.storage.includes('❌') && (
                <div className="p-3 bg-yellow-50 text-yellow-800 rounded">
                  Créez le bucket 'uploads' dans Supabase Storage
                </div>
              )}
              {status.tables.includes('❌') && (
                <div className="p-3 bg-blue-50 text-blue-800 rounded">
                  Exécutez les scripts SQL pour créer les tables
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={checkStatus}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            🔄 Relancer le diagnostic
          </button>
        </div>
      </div>
    </div>
  )
}