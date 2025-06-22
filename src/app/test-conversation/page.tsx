'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { OpenAIService } from '@/utils/openai'
import { getUserContext } from '@/utils/userContext'

export default function TestConversation() {
  const [status, setStatus] = useState('🔄 Initialisation...')
  const [aiConfig, setAIConfig] = useState<{
    agent_name: string
    agent_mission: string
    agent_personality: string
    llm_api_key: string
    llm_model: string
    temperature: number
  } | null>(null)
  const [openAIService, setOpenAIService] = useState<OpenAIService | null>(null)
  const [userContext, setUserContext] = useState<{
    timestamp: Date
    timezone: string
    location?: {
      latitude: number
      longitude: number
      city?: string
      country?: string
    }
  } | null>(null)
  const [lastResponse, setLastResponse] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setStatus('🔄 Chargement configuration IA...')
      
      // Load AI config
      const { data: aiData, error: aiError } = await supabase
        .from('ai_config')
        .select('*')
        .single()
      
      if (aiError) {
        setStatus(`❌ Erreur config IA: ${aiError.message}`)
        return
      }

      setAIConfig(aiData)
      
      if (aiData.llm_api_key) {
        const service = new OpenAIService(aiData.llm_api_key)
        setOpenAIService(service)
        setStatus('✅ OpenAI service initialisé')
      } else {
        setStatus('❌ Pas de clé API OpenAI')
        return
      }

      // Load user context
      const context = await getUserContext()
      setUserContext(context)
      
      setStatus('✅ Prêt pour test')
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      setStatus(`❌ Erreur: ${errorMessage}`)
    }
  }

  const testTextGeneration = async () => {
    if (!openAIService || !userContext || !aiConfig) {
      alert('Service non initialisé')
      return
    }

    setStatus('🧠 Test génération de texte...')
    try {
      const systemPrompt = `Tu es ${aiConfig.agent_name}.
${aiConfig.agent_mission}
${aiConfig.agent_personality}

Réponds de manière naturelle et conversationnelle en français.`

      const response = await openAIService.generateResponse(
        [{ id: '1', role: 'user', content: 'Bonjour, comment allez-vous ?', timestamp: new Date() }],
        systemPrompt,
        userContext,
        aiConfig.llm_model,
        aiConfig.temperature
      )
      
      setLastResponse(response)
      setStatus('✅ Test réussi!')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      setStatus(`❌ Erreur test: ${errorMessage}`)
    }
  }

  const testTTS = async () => {
    if (!openAIService) {
      alert('Service non initialisé')
      return
    }

    if (!lastResponse) {
      alert('Générez d\'abord une réponse')
      return
    }

    setStatus('🔊 Test text-to-speech...')
    try {
      const audioBuffer = await openAIService.textToSpeech(lastResponse)
      
      // Play audio
      const audioContext = new AudioContext()
      const audioData = await audioContext.decodeAudioData(audioBuffer)
      const source = audioContext.createBufferSource()
      source.buffer = audioData
      source.connect(audioContext.destination)
      source.start()
      
      setStatus('✅ Audio joué!')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      setStatus(`❌ Erreur TTS: ${errorMessage}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Test Conversation</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">État du système</h2>
          <p className="text-lg">{status}</p>
        </div>

        {aiConfig && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Configuration IA</h2>
            <div className="space-y-2 text-sm">
              <p><strong>Nom:</strong> {aiConfig.agent_name}</p>
              <p><strong>Mission:</strong> {aiConfig.agent_mission?.substring(0, 100)}...</p>
              <p><strong>Modèle:</strong> {aiConfig.llm_model}</p>
              <p><strong>Température:</strong> {aiConfig.temperature}</p>
              <p><strong>API Key:</strong> {aiConfig.llm_api_key ? '✅ Présente' : '❌ Manquante'}</p>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Tests</h2>
          <div className="space-y-4">
            <button
              onClick={testTextGeneration}
              disabled={!openAIService}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              🧠 Tester génération de texte
            </button>
            
            <button
              onClick={testTTS}
              disabled={!openAIService || !lastResponse}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 ml-4"
            >
              🔊 Tester text-to-speech
            </button>
          </div>
        </div>

        {lastResponse && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Dernière réponse</h2>
            <p className="text-gray-800">{lastResponse}</p>
          </div>
        )}
      </div>
    </div>
  )
}