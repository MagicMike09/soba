'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AIConfig, KnowledgeBase, RSSFeed, APITool, Pronunciation } from '@/types'

interface FileUploadProps {
  onUpload: (url: string) => void
  accept?: string
  label: string
  currentUrl?: string
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload, accept, label, currentUrl }) => {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const { error } = await supabase.storage
        .from('uploads')
        .upload(fileName, file)

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName)

      onUpload(urlData.publicUrl)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Erreur lors du téléchargement')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center space-x-4">
        <input
          type="file"
          accept={accept}
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
          id={`upload-${label.replace(/\s/g, '-')}`}
        />
        <label
          htmlFor={`upload-${label.replace(/\s/g, '-')}`}
          className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {uploading ? 'Téléchargement...' : 'Choisir fichier'}
        </label>
        {currentUrl && (
          <span className="text-sm text-green-600">✅ Fichier chargé</span>
        )}
      </div>
      {currentUrl && (
        <div className="text-xs text-gray-500 break-all">
          {currentUrl}
        </div>
      )}
    </div>
  )
}

export default function BrainDashboard() {
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null)
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase[]>([])
  const [rssFeeds, setRSSFeeds] = useState<RSSFeed[]>([])
  const [apiTools, setAPITools] = useState<APITool[]>([])
  const [pronunciations, setPronunciations] = useState<Pronunciation[]>([])
  
  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalConversations: 0,
    avgConversationTime: 0,
    totalTokens: 0,
    totalCost: 0,
    conversationsToday: 0,
    dailyStats: [] as Array<{date: string, conversations: number, tokens: number}>
  })
  
  const [activeTab, setActiveTab] = useState('analytics')
  const [showModal, setShowModal] = useState<string | null>(null)
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('')

  useEffect(() => {
    loadData()
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      // Charger les analytics depuis la base de données
      const { data: conversationsData } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false })

      if (conversationsData) {
        // Calculer les statistiques
        const total = conversationsData.length
        const totalTokens = conversationsData.reduce((sum, conv) => sum + (conv.token_count || 0), 0)
        const totalDuration = conversationsData.reduce((sum, conv) => sum + (conv.duration_seconds || 0), 0)
        const avgTime = total > 0 ? Math.round(totalDuration / total) : 0
        
        // Calculer le coût (estimation GPT-4: $0.03/1K tokens input, $0.06/1K tokens output)
        const estimatedCost = (totalTokens * 0.045) / 1000 // Moyenne input/output
        
        // Conversations aujourd'hui
        const today = new Date().toISOString().split('T')[0]
        const todayConversations = conversationsData.filter(conv => 
          conv.created_at?.startsWith(today)
        ).length

        // Statistiques par jour (7 derniers jours)
        const last7Days = []
        for (let i = 6; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]
          
          const dayConversations = conversationsData.filter(conv => 
            conv.created_at?.startsWith(dateStr)
          )
          
          last7Days.push({
            date: dateStr,
            conversations: dayConversations.length,
            tokens: dayConversations.reduce((sum, conv) => sum + (conv.token_count || 0), 0)
          })
        }

        setAnalytics({
          totalConversations: total,
          avgConversationTime: avgTime,
          totalTokens,
          totalCost: estimatedCost,
          conversationsToday: todayConversations,
          dailyStats: last7Days
        })
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    }
  }

  const loadData = async () => {
    try {
      // Load AI config
      const aiResult = await supabase.from('ai_config').select('*').single()

      const [kbResult, rssResult, apiResult, pronResult] = await Promise.all([
        supabase.from('knowledge_base').select('*'),
        supabase.from('rss_feeds').select('*'),
        supabase.from('api_tools').select('*'),
        supabase.from('pronunciations').select('*')
      ])

      if (aiResult.data) {
        setAIConfig({
          id: aiResult.data.id,
          agentName: aiResult.data.agent_name,
          agentMission: aiResult.data.agent_mission,
          agentPersonality: aiResult.data.agent_personality,
          llmApiKey: aiResult.data.llm_api_key,
          llmModel: aiResult.data.llm_model,
          llmApiUrl: aiResult.data.llm_api_url,
          temperature: aiResult.data.temperature,
          ttsVoice: aiResult.data.tts_voice || 'alloy',
          ttsSpeed: aiResult.data.tts_speed || 1.0,
          sttLanguage: aiResult.data.stt_language || 'fr',
          sttModel: aiResult.data.stt_model || 'whisper-1',
          avatarUrl: aiResult.data.avatar_url,
          avatarPosition: aiResult.data.avatar_position
        })
      }

      if (kbResult.data) {
        setKnowledgeBase(kbResult.data.map(kb => ({
          id: kb.id,
          title: kb.title,
          content: kb.content,
          fileType: kb.file_type as 'pdf' | 'csv' | 'txt' | 'json',
          fileUrl: kb.file_url
        })))
      }

      if (rssResult.data) {
        setRSSFeeds(rssResult.data)
      }

      if (apiResult.data) {
        setAPITools(apiResult.data.map(api => ({
          id: api.id,
          name: api.name,
          apiKey: api.api_key,
          description: api.description,
          apiUrl: api.api_url,
          active: api.active
        })))
      }

      if (pronResult.data) {
        setPronunciations(pronResult.data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      alert('❌ Erreur de connexion à la base de données. Vérifiez la configuration Supabase.')
    }
  }

  // Fonction de test de connectivité et colonnes
  const testDatabaseConnection = async () => {
    try {
      console.log('🔍 Test de connectivité à la base de données...')
      const { error } = await supabase.from('ai_config').select('id').limit(1)
      
      if (error) {
        console.error('❌ Erreur de connectivité:', error)
        alert(`❌ Problème de connexion à la base de données:\n${error.message}`)
        return false
      }
      
      console.log('✅ Base de données accessible')
      return true
    } catch (error) {
      console.error('❌ Erreur de test:', error)
      alert('❌ Impossible de se connecter à la base de données')
      return false
    }
  }

  // Fonction pour tester la présence des colonnes TTS/STT
  const testTTSSTTColumns = async () => {
    try {
      console.log('🔍 Test des colonnes TTS/STT...')
      const { error } = await supabase.from('ai_config').select('id, tts_voice, tts_speed, stt_language, stt_model').limit(1)
      
      if (error) {
        console.error('❌ Colonnes manquantes:', error)
        const missingColumns = []
        if (error.message.includes('tts_voice')) missingColumns.push('tts_voice')
        if (error.message.includes('tts_speed')) missingColumns.push('tts_speed')
        if (error.message.includes('stt_language')) missingColumns.push('stt_language')
        if (error.message.includes('stt_model')) missingColumns.push('stt_model')
        
        alert(`❌ Colonnes TTS/STT manquantes: ${missingColumns.join(', ')}\n\n🔧 Exécutez ces commandes UNE PAR UNE dans Supabase SQL Editor:\n\n1. ALTER TABLE ai_config ADD COLUMN tts_voice VARCHAR(20) DEFAULT 'alloy';\n\n2. ALTER TABLE ai_config ADD COLUMN tts_speed DECIMAL(3,2) DEFAULT 1.0;\n\n3. ALTER TABLE ai_config ADD COLUMN stt_language VARCHAR(10) DEFAULT 'fr';\n\n4. ALTER TABLE ai_config ADD COLUMN stt_model VARCHAR(20) DEFAULT 'whisper-1';`)
        return false
      }
      
      console.log('✅ Toutes les colonnes TTS/STT sont présentes')
      alert('✅ Toutes les colonnes TTS/STT sont présentes dans la base de données!')
      return true
    } catch (error) {
      console.error('❌ Erreur de test des colonnes:', error)
      alert('❌ Erreur lors du test des colonnes')
      return false
    }
  }

  // Fonction pour tester la voix TTS
  const testTTSVoice = async () => {
    if (!aiConfig?.llmApiKey) {
      alert('❌ Clé API OpenAI manquante. Veuillez d\'abord configurer votre clé API dans "Modèle LLM".')
      return
    }

    try {
      console.log('🔊 Test de la voix TTS...')
      const testText = "Bonjour, je suis votre assistant virtuel."
      const voice = aiConfig.ttsVoice || 'alloy'
      const speed = aiConfig.ttsSpeed || 1.0

      // Appel de l'API OpenAI TTS
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aiConfig.llmApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: testText,
          voice: voice,
          response_format: 'mp3',
          speed: speed
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('❌ Erreur API TTS:', errorData)
        
        if (response.status === 401) {
          alert('❌ Clé API OpenAI invalide. Vérifiez votre clé API.')
        } else if (response.status === 429) {
          alert('❌ Limite de taux dépassée. Attendez quelques minutes.')
        } else {
          alert(`❌ Erreur TTS: ${response.status} - ${errorData}`)
        }
        return
      }

      // Convertir la réponse en audio et jouer
      const audioBuffer = await response.arrayBuffer()
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(audioBlob)
      
      const audio = new Audio(audioUrl)
      audio.play()
      
      alert(`✅ Test TTS réussi!\nVoix: ${voice}\nVitesse: ${speed}x`)
      
      // Nettoyer l'URL après lecture
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl)
      })

    } catch (error) {
      console.error('❌ Erreur lors du test TTS:', error)
      alert('❌ Erreur lors du test de la voix. Vérifiez votre connexion et votre clé API.')
    }
  }

  const updateAIConfig = async (updates: Partial<AIConfig>) => {
    if (!aiConfig) {
      alert('❌ Configuration non chargée. Veuillez recharger la page.')
      return
    }

    // Test de connectivité avant la sauvegarde
    const isConnected = await testDatabaseConnection()
    if (!isConnected) {
      return
    }

    try {
      console.log('🔄 Début de la sauvegarde:', updates)

      // Préparer les données de base (colonnes existantes)
      const baseUpdateData = {
        agent_name: updates.agentName ?? aiConfig.agentName,
        agent_mission: updates.agentMission ?? aiConfig.agentMission,
        agent_personality: updates.agentPersonality ?? aiConfig.agentPersonality,
        llm_api_key: updates.llmApiKey ?? aiConfig.llmApiKey,
        llm_model: updates.llmModel ?? aiConfig.llmModel,
        llm_api_url: updates.llmApiUrl ?? aiConfig.llmApiUrl,
        temperature: updates.temperature ?? aiConfig.temperature,
        avatar_url: updates.avatarUrl ?? aiConfig.avatarUrl,
        avatar_position: updates.avatarPosition ?? aiConfig.avatarPosition
      }

      // Ajouter les nouvelles colonnes seulement si elles sont fournies dans updates
      const updateData: Record<string, unknown> = { ...baseUpdateData }
      
      if ('ttsVoice' in updates) {
        updateData.tts_voice = updates.ttsVoice ?? aiConfig.ttsVoice ?? 'alloy'
      }
      if ('ttsSpeed' in updates) {
        updateData.tts_speed = updates.ttsSpeed ?? aiConfig.ttsSpeed ?? 1.0
      }
      if ('sttLanguage' in updates) {
        updateData.stt_language = updates.sttLanguage ?? aiConfig.sttLanguage ?? 'fr'
      }
      if ('sttModel' in updates) {
        updateData.stt_model = updates.sttModel ?? aiConfig.sttModel ?? 'whisper-1'
      }

      console.log('🔄 Données finales à sauvegarder:', updateData)
      
      // Tentative 1: Essayer avec toutes les colonnes
      const { error } = await supabase.from('ai_config').update(updateData).eq('id', aiConfig.id)
      
      // Tentative 2: Si erreur de colonne, essayer sans les nouvelles colonnes TTS/STT
      if (error && (error.code === '42703' || error.message.includes('does not exist'))) {
        console.log('⚠️ Colonnes TTS/STT manquantes, tentative sans ces colonnes...')
        
        // Sauvegarder seulement les colonnes de base
        const { error: fallbackError } = await supabase.from('ai_config').update(baseUpdateData).eq('id', aiConfig.id)
        
        if (fallbackError) {
          console.error('❌ Erreur même en mode fallback:', fallbackError)
          throw fallbackError
        } else {
          console.log('✅ Sauvegarde réussie en mode fallback (sans TTS/STT)')
          alert(`✅ Configuration de base sauvegardée!\n\n⚠️ Les paramètres TTS/STT n'ont pas pu être sauvegardés car les colonnes n'existent pas.\n\n🔧 Pour activer TTS/STT, exécutez le script SQL de migration.`)
          setAIConfig(prev => prev ? { ...prev, ...updates } : null)
          return
        }
      } else if (error) {
        console.error('❌ Erreur Supabase détaillée:', error)
        throw error
      }
      
      // Mettre à jour l'état local immédiatement
      setAIConfig(prev => prev ? { ...prev, ...updates } : null)
      
      console.log('✅ Sauvegarde réussie!')
      alert('✅ Configuration sauvegardée avec succès !')
      
    } catch (error) {
      console.error('❌ Erreur complète lors de la sauvegarde:', error)
      console.error('❌ Type d\'erreur:', typeof error)
      console.error('❌ Erreur JSON:', JSON.stringify(error, null, 2))
      
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      const errorCode = (error as { code?: string })?.code || 'UNKNOWN'
      const errorDetails = (error as { details?: string })?.details || ''
      
      console.error('❌ Message:', errorMessage)
      console.error('❌ Code:', errorCode) 
      console.error('❌ Détails:', errorDetails)
      
      // Cas spécifiques pour TTS/STT
      if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        const missingColumn = errorMessage.match(/column "([^"]+)"/)?.[1] || 'inconnue'
        alert(`❌ Colonne manquante: "${missingColumn}"\n\n🔧 Solution:\n1. Allez dans Supabase → SQL Editor\n2. Exécutez: ALTER TABLE ai_config ADD COLUMN ${missingColumn} VARCHAR(20) DEFAULT 'alloy';\n3. Rechargez cette page\n\nOu exécutez le script complet: supabase-tts-stt-update.sql`)
      } else if (errorCode === '42703' || errorMessage.includes('does not exist')) {
        alert(`❌ Erreur de base de données: Colonnes TTS/STT manquantes\n\n🔧 Exécutez ces commandes UNE PAR UNE dans Supabase SQL Editor:\n\n1. ALTER TABLE ai_config ADD COLUMN tts_voice VARCHAR(20) DEFAULT 'alloy';\n\n2. ALTER TABLE ai_config ADD COLUMN tts_speed DECIMAL(3,2) DEFAULT 1.0';\n\n3. ALTER TABLE ai_config ADD COLUMN stt_language VARCHAR(10) DEFAULT 'fr';\n\n4. ALTER TABLE ai_config ADD COLUMN stt_model VARCHAR(20) DEFAULT 'whisper-1';\n\nPuis rechargez cette page.`)
      } else if (errorMessage.includes('authentication') || errorMessage.includes('JWT')) {
        alert('❌ Erreur d\'authentification. Veuillez recharger la page.')
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        alert('❌ Erreur de connexion réseau. Vérifiez votre connexion internet.')
      } else {
        // Erreur détaillée pour le diagnostic
        alert(`❌ Erreur lors de la sauvegarde:\n\nMessage: ${errorMessage}\nCode: ${errorCode}\nDétails: ${errorDetails}\n\nVeuillez copier cette erreur et la partager pour diagnostic.`)
      }
    }
  }

  const addKnowledgeItem = async (data: Partial<KnowledgeBase>) => {
    try {
      await supabase.from('knowledge_base').insert({
        title: data.title!,
        content: data.content!,
        file_type: data.fileType!,
        file_url: data.fileUrl
      })
      loadData()
      setShowModal(null)
      setUploadedFileUrl('')
    } catch (error) {
      console.error('Error adding knowledge item:', error)
      alert('Erreur lors de l\'ajout')
    }
  }

  const addRSSFeed = async (data: Partial<RSSFeed>) => {
    try {
      await supabase.from('rss_feeds').insert({
        name: data.name!,
        url: data.url!,
        active: data.active ?? true
      })
      loadData()
      setShowModal(null)
    } catch (error) {
      console.error('Error adding RSS feed:', error)
      alert('Erreur lors de l\'ajout')
    }
  }

  const addAPITool = async (data: Partial<APITool>) => {
    try {
      await supabase.from('api_tools').insert({
        name: data.name!,
        api_key: data.apiKey || null,
        description: data.description!,
        api_url: data.apiUrl!,
        active: data.active ?? true
      })
      loadData()
      setShowModal(null)
    } catch (error) {
      console.error('Error adding API tool:', error)
      alert('Erreur lors de l\'ajout')
    }
  }

  const addPronunciation = async (data: Partial<Pronunciation>) => {
    try {
      await supabase.from('pronunciations').insert({
        word: data.word!,
        pronunciation: data.pronunciation!
      })
      loadData()
      setShowModal(null)
    } catch (error) {
      console.error('Error adding pronunciation:', error)
      alert('Erreur lors de l\'ajout')
    }
  }

  const uploadPronunciationsList = async (file: File) => {
    try {
      const text = await file.text()
      let pronunciations: Array<{word: string, pronunciation: string}> = []
      
      if (file.name.endsWith('.json')) {
        pronunciations = JSON.parse(text)
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n').filter(line => line.trim())
        pronunciations = lines.map(line => {
          const [word, pronunciation] = line.split(',').map(s => s.trim())
          return { word, pronunciation }
        }).filter(p => p.word && p.pronunciation)
      } else if (file.name.endsWith('.txt')) {
        const lines = text.split('\n').filter(line => line.trim())
        pronunciations = lines.map(line => {
          const parts = line.split('|').map(s => s.trim())
          if (parts.length >= 2) {
            return { word: parts[0], pronunciation: parts[1] }
          }
          const spaceParts = line.split(/\s+/)
          if (spaceParts.length >= 2) {
            return { word: spaceParts[0], pronunciation: spaceParts.slice(1).join(' ') }
          }
          return null
        }).filter((p): p is {word: string, pronunciation: string} => p !== null)
      }

      if (pronunciations.length === 0) {
        throw new Error('Aucune prononciation valide trouvée dans le fichier')
      }

      const batchSize = 100
      for (let i = 0; i < pronunciations.length; i += batchSize) {
        const batch = pronunciations.slice(i, i + batchSize)
        await supabase.from('pronunciations').insert(batch.map(p => ({
          word: p.word,
          pronunciation: p.pronunciation
        })))
      }

      alert(`✅ ${pronunciations.length} prononciations importées avec succès !`)
      loadData()
      setShowModal(null)
    } catch (error) {
      console.error('Error uploading pronunciations:', error)
      alert(`❌ Erreur lors de l'import: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  const deleteItem = async (table: string, id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
      try {
        await supabase.from(table).delete().eq('id', id)
        loadData()
      } catch (error) {
        console.error('Error deleting item:', error)
        alert('Erreur lors de la suppression')
      }
    }
  }

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'agent', label: 'Configuration Agent', icon: '🤖' },
    { id: 'avatar', label: 'Avatar 3D', icon: '👤' },
    { id: 'llm', label: 'Modèle LLM', icon: '🧠' },
    { id: 'knowledge', label: 'Base de Connaissances', icon: '📚' },
    { id: 'rss', label: 'Flux RSS', icon: '📰' },
    { id: 'api', label: 'Outils API', icon: '🔧' },
    { id: 'pronunciation', label: 'Prononciations', icon: '🗣️' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Brain</h1>
          <p className="text-gray-600 mt-2">Configurez l'intelligence artificielle de votre agent virtuel</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          
          {/* Analytics Dashboard */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Conversations Total</p>
                      <p className="text-3xl font-bold text-gray-900">{analytics.totalConversations}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">💬</span>
                    </div>
                  </div>
                  <p className="text-sm text-green-600 mt-2">
                    +{analytics.conversationsToday} aujourd'hui
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Temps Moyen</p>
                      <p className="text-3xl font-bold text-gray-900">{Math.floor(analytics.avgConversationTime / 60)}m {analytics.avgConversationTime % 60}s</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">⏱️</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Par conversation
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tokens Utilisés</p>
                      <p className="text-3xl font-bold text-gray-900">{analytics.totalTokens.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🧠</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Total consommé
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Coût Estimé</p>
                      <p className="text-3xl font-bold text-gray-900">${analytics.totalCost.toFixed(2)}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">💰</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    GPT-4 pricing
                  </p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Conversations Chart */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Conversations (7 derniers jours)</h3>
                  <div className="space-y-3">
                    {analytics.dailyStats.map((day) => (
                      <div key={day.date} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <div className="flex items-center space-x-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${Math.max(5, (day.conversations / Math.max(...analytics.dailyStats.map(d => d.conversations), 1)) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-8 text-right">
                            {day.conversations}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Token Usage Chart */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Tokens Utilisés (7 derniers jours)</h3>
                  <div className="space-y-3">
                    {analytics.dailyStats.map((day) => (
                      <div key={day.date} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <div className="flex items-center space-x-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${Math.max(5, (day.tokens / Math.max(...analytics.dailyStats.map(d => d.tokens), 1)) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-16 text-right">
                            {day.tokens.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Refresh Button */}
              <div className="flex justify-center">
                <button
                  onClick={loadAnalytics}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
                >
                  <span>🔄</span>
                  <span>Actualiser les données</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Agent Configuration */}
          {activeTab === 'agent' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Configuration de l'Agent</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de l'agent
                    </label>
                    <input
                      type="text"
                      value={aiConfig?.agentName || ''}
                      onChange={(e) => setAIConfig(prev => prev ? {...prev, agentName: e.target.value} : null)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="Ex: Sophie, Assistant virtuel..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mission de l'agent
                    </label>
                    <textarea
                      value={aiConfig?.agentMission || ''}
                      onChange={(e) => setAIConfig(prev => prev ? {...prev, agentMission: e.target.value} : null)}
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                      placeholder="Décrivez la mission principale de l'agent..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Personnalité de l'agent
                    </label>
                    <textarea
                      value={aiConfig?.agentPersonality || ''}
                      onChange={(e) => setAIConfig(prev => prev ? {...prev, agentPersonality: e.target.value} : null)}
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                      placeholder="Décrivez la personnalité de l'agent..."
                    />
                  </div>
                  
                  <button
                    onClick={() => updateAIConfig({
                      agentName: aiConfig?.agentName,
                      agentMission: aiConfig?.agentMission,
                      agentPersonality: aiConfig?.agentPersonality
                    })}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Sauvegarder Configuration
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Avatar Configuration */}
          {activeTab === 'avatar' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">Configuration Avatar 3D</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL de l'avatar (Sketchfab)
                    </label>
                    <input
                      type="url"
                      value={aiConfig?.avatarUrl || ''}
                      onChange={(e) => setAIConfig(prev => prev ? {...prev, avatarUrl: e.target.value} : null)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="https://sketchfab.com/models/..."
                    />
                  </div>
                  
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-600 mb-3">OU uploader votre modèle 3D :</p>
                    <FileUpload
                      label="Modèle 3D (GLB/GLTF)"
                      accept=".glb,.gltf"
                      currentUrl={aiConfig?.avatarUrl?.includes('supabase') ? aiConfig.avatarUrl : undefined}
                      onUpload={(url) => setAIConfig(prev => prev ? {...prev, avatarUrl: url} : null)}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Position et Transform</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Position X</label>
                      <input
                        type="number"
                        step="0.1"
                        value={aiConfig?.avatarPosition?.x || 0}
                        onChange={(e) => setAIConfig(prev => prev ? {
                          ...prev,
                          avatarPosition: {
                            ...prev.avatarPosition,
                            x: parseFloat(e.target.value),
                            y: prev.avatarPosition?.y || 0,
                            z: prev.avatarPosition?.z || 0,
                            scale: prev.avatarPosition?.scale || 1,
                            rotation: prev.avatarPosition?.rotation || { x: 0, y: 0, z: 0 }
                          }
                        } : null)}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Position Y</label>
                      <input
                        type="number"
                        step="0.1"
                        value={aiConfig?.avatarPosition?.y || 0}
                        onChange={(e) => setAIConfig(prev => prev ? {
                          ...prev,
                          avatarPosition: {
                            ...prev.avatarPosition,
                            x: prev.avatarPosition?.x || 0,
                            y: parseFloat(e.target.value),
                            z: prev.avatarPosition?.z || 0,
                            scale: prev.avatarPosition?.scale || 1,
                            rotation: prev.avatarPosition?.rotation || { x: 0, y: 0, z: 0 }
                          }
                        } : null)}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Position Z</label>
                      <input
                        type="number"
                        step="0.1"
                        value={aiConfig?.avatarPosition?.z || 0}
                        onChange={(e) => setAIConfig(prev => prev ? {
                          ...prev,
                          avatarPosition: {
                            ...prev.avatarPosition,
                            x: prev.avatarPosition?.x || 0,
                            y: prev.avatarPosition?.y || 0,
                            z: parseFloat(e.target.value),
                            scale: prev.avatarPosition?.scale || 1,
                            rotation: prev.avatarPosition?.rotation || { x: 0, y: 0, z: 0 }
                          }
                        } : null)}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Échelle</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={aiConfig?.avatarPosition?.scale || 1}
                      onChange={(e) => setAIConfig(prev => prev ? {
                        ...prev,
                        avatarPosition: {
                          ...prev.avatarPosition,
                          x: prev.avatarPosition?.x || 0,
                          y: prev.avatarPosition?.y || 0,
                          z: prev.avatarPosition?.z || 0,
                          scale: parseFloat(e.target.value),
                          rotation: prev.avatarPosition?.rotation || { x: 0, y: 0, z: 0 }
                        }
                      } : null)}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => updateAIConfig({
                  avatarUrl: aiConfig?.avatarUrl,
                  avatarPosition: aiConfig?.avatarPosition
                })}
                className="mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sauvegarder Avatar
              </button>
            </div>
          )}

          {/* LLM Configuration */}
          {activeTab === 'llm' && (
            <div className="space-y-6">
              {/* Diagnostic Panel */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-yellow-800">Diagnostic TTS/STT</span>
                  </div>
                  <button
                    onClick={testTTSSTTColumns}
                    className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-md hover:bg-yellow-200 transition-colors"
                  >
                    🔍 Tester les colonnes
                  </button>
                </div>
                <p className="text-xs text-yellow-700 mt-2">
                  Si vous rencontrez des erreurs de sauvegarde TTS/STT, cliquez sur "Tester les colonnes" pour diagnostiquer le problème.
                </p>
              </div>
              {/* LLM Model Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Modèle LLM</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Clé API OpenAI
                      </label>
                      <input
                        type="password"
                        value={aiConfig?.llmApiKey || ''}
                        onChange={(e) => setAIConfig(prev => prev ? {...prev, llmApiKey: e.target.value} : null)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="sk-proj-..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL de l'API
                      </label>
                      <input
                        type="url"
                        value={aiConfig?.llmApiUrl || ''}
                        onChange={(e) => setAIConfig(prev => prev ? {...prev, llmApiUrl: e.target.value} : null)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://api.openai.com/v1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Modèle IA
                      </label>
                      <select
                        value={aiConfig?.llmModel || ''}
                        onChange={(e) => setAIConfig(prev => prev ? {...prev, llmModel: e.target.value} : null)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Sélectionner un modèle</option>
                        <option value="gpt-4">GPT-4</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        <option value="claude-3-opus">Claude 3 Opus</option>
                        <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                        <option value="gemini-pro">Gemini Pro</option>
                        <option value="mistral-large">Mistral Large</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Température: {aiConfig?.temperature || 0.7}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={aiConfig?.temperature || 0.7}
                        onChange={(e) => setAIConfig(prev => prev ? {...prev, temperature: parseFloat(e.target.value)} : null)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Précis</span>
                        <span>Créatif</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => updateAIConfig({
                    llmApiKey: aiConfig?.llmApiKey,
                    llmApiUrl: aiConfig?.llmApiUrl,
                    llmModel: aiConfig?.llmModel,
                    temperature: aiConfig?.temperature
                  })}
                  className="mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Sauvegarder Modèle LLM
                </button>
              </div>

              {/* TTS Configuration Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Configuration TTS (Synthèse Vocale)</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voix OpenAI
                      </label>
                      <select
                        value={aiConfig?.ttsVoice || 'alloy'}
                        onChange={(e) => setAIConfig(prev => prev ? {...prev, ttsVoice: e.target.value} : null)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="alloy">🎭 Alloy (Neutre)</option>
                        <option value="echo">🚹 Echo (Masculine)</option>
                        <option value="fable">🇬🇧 Fable (Britannique)</option>
                        <option value="onyx">🎤 Onyx (Profonde)</option>
                        <option value="nova">🚺 Nova (Féminine)</option>
                        <option value="shimmer">✨ Shimmer (Douce)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Sélectionnez la voix pour la synthèse vocale
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vitesse: {aiConfig?.ttsSpeed || 1.0}x
                      </label>
                      <input
                        type="range"
                        min="0.25"
                        max="4.0"
                        step="0.25"
                        value={aiConfig?.ttsSpeed || 1.0}
                        onChange={(e) => setAIConfig(prev => prev ? {...prev, ttsSpeed: parseFloat(e.target.value)} : null)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Lent</span>
                        <span>Normal</span>
                        <span>Rapide</span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">🎵 Aperçu</p>
                      <p className="text-xs text-gray-500">"Bonjour, je suis votre assistant virtuel."</p>
                      <button 
                        onClick={testTTSVoice}
                        className="mt-2 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200 transition-colors"
                      >
                        🔊 Tester la voix
                      </button>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => updateAIConfig({
                    ttsVoice: aiConfig?.ttsVoice,
                    ttsSpeed: aiConfig?.ttsSpeed
                  })}
                  className="mt-6 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Sauvegarder Configuration TTS
                </button>
              </div>

              {/* STT Configuration Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Configuration STT (Reconnaissance Vocale)</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Modèle Whisper
                      </label>
                      <select
                        value={aiConfig?.sttModel || 'whisper-1'}
                        onChange={(e) => setAIConfig(prev => prev ? {...prev, sttModel: e.target.value} : null)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="whisper-1">Whisper-1 (Standard)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Modèle de reconnaissance vocale OpenAI
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Langue principale
                      </label>
                      <select
                        value={aiConfig?.sttLanguage || 'fr'}
                        onChange={(e) => setAIConfig(prev => prev ? {...prev, sttLanguage: e.target.value} : null)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="fr">🇫🇷 Français</option>
                        <option value="en">🇺🇸 Anglais</option>
                        <option value="es">🇪🇸 Espagnol</option>
                        <option value="de">🇩🇪 Allemand</option>
                        <option value="it">🇮🇹 Italien</option>
                        <option value="pt">🇵🇹 Portugais</option>
                        <option value="auto">🌐 Détection automatique</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">🎚️ Paramètres Audio</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Suppression du bruit:</span>
                          <span className="text-green-600 font-medium">✓ Activée</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Annulation d'écho:</span>
                          <span className="text-green-600 font-medium">✓ Activée</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Détection de silence:</span>
                          <span className="text-green-600 font-medium">✓ 3 secondes</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Qualité audio:</span>
                          <span className="text-green-600 font-medium">✓ 16kHz</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-700 mb-2">💡 Conseils</p>
                      <ul className="text-xs text-blue-600 space-y-1">
                        <li>• Parlez clairement près du microphone</li>
                        <li>• Évitez les bruits de fond</li>
                        <li>• Attendez 3 secondes de silence pour valider</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => updateAIConfig({
                    sttModel: aiConfig?.sttModel,
                    sttLanguage: aiConfig?.sttLanguage
                  })}
                  className="mt-6 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Sauvegarder Configuration STT
                </button>
              </div>
            </div>
          )}

          {/* Knowledge Base */}
          {activeTab === 'knowledge' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Base de Connaissances</h2>
                <button
                  onClick={() => setShowModal('knowledge')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Ajouter Document
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {knowledgeBase.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium truncate">{item.title}</h3>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {item.fileType.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                      {item.content.substring(0, 100)}...
                    </p>
                    <button
                      onClick={() => deleteItem('knowledge_base', item.id)}
                      className="w-full bg-red-600 text-white py-1 px-2 rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RSS Feeds */}
          {activeTab === 'rss' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Flux RSS</h2>
                <button
                  onClick={() => setShowModal('rss')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Ajouter Flux
                </button>
              </div>
              
              <div className="space-y-3">
                {rssFeeds.map((feed) => (
                  <div key={feed.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{feed.name}</h3>
                      <p className="text-sm text-gray-600">{feed.url}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        feed.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {feed.active ? 'Actif' : 'Inactif'}
                      </span>
                      <button
                        onClick={() => deleteItem('rss_feeds', feed.id)}
                        className="bg-red-600 text-white py-1 px-3 rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Tools */}
          {activeTab === 'api' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Outils API</h2>
                <button
                  onClick={() => setShowModal('api')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Ajouter API
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {apiTools.map((tool) => (
                  <div key={tool.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{tool.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${
                        tool.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {tool.active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{tool.description}</p>
                    <p className="text-xs text-gray-500 mb-3">{tool.apiUrl}</p>
                    <button
                      onClick={() => deleteItem('api_tools', tool.id)}
                      className="w-full bg-red-600 text-white py-1 px-2 rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pronunciations */}
          {activeTab === 'pronunciation' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Prononciations</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowModal('pronunciation')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Ajouter Prononciation
                  </button>
                  <button
                    onClick={() => setShowModal('upload-pronunciations')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    📁 Importer Liste
                  </button>
                </div>
              </div>

              {/* Format Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-blue-800 mb-2">📋 Formats supportés pour l'import :</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>CSV :</strong> mot,prononciation</p>
                  <p><strong>TXT :</strong> mot|prononciation ou mot prononciation</p>
                  <p><strong>JSON :</strong> [{`"word": "mot", "pronunciation": "prononciation"`}]</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pronunciations.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{item.word}</h3>
                      <button
                        onClick={() => deleteItem('pronunciations', item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">{item.pronunciation}</p>
                  </div>
                ))}
              </div>
              
              {pronunciations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Aucune prononciation configurée</p>
                  <p className="text-sm mt-1">Ajoutez des prononciations pour améliorer la synthèse vocale</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {showModal === 'knowledge' && 'Ajouter Document'}
                {showModal === 'rss' && 'Ajouter Flux RSS'}
                {showModal === 'api' && 'Ajouter Outil API'}
                {showModal === 'pronunciation' && 'Ajouter Prononciation'}
                {showModal === 'upload-pronunciations' && 'Importer Liste de Prononciations'}
              </h3>
              
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                
                if (showModal === 'knowledge') {
                  addKnowledgeItem({
                    title: formData.get('title') as string,
                    content: formData.get('content') as string,
                    fileType: formData.get('fileType') as 'pdf' | 'csv' | 'txt' | 'json',
                    fileUrl: uploadedFileUrl || undefined
                  })
                } else if (showModal === 'rss') {
                  addRSSFeed({
                    name: formData.get('name') as string,
                    url: formData.get('url') as string,
                    active: formData.get('active') === 'on'
                  })
                } else if (showModal === 'api') {
                  addAPITool({
                    name: formData.get('name') as string,
                    apiKey: formData.get('apiKey') as string,
                    description: formData.get('description') as string,
                    apiUrl: formData.get('apiUrl') as string,
                    active: formData.get('active') === 'on'
                  })
                } else if (showModal === 'pronunciation') {
                  addPronunciation({
                    word: formData.get('word') as string,
                    pronunciation: formData.get('pronunciation') as string
                  })
                }
              }}>
                <div className="space-y-4">
                  {showModal === 'knowledge' && (
                    <>
                      <input name="title" placeholder="Titre du document" required className="w-full p-3 border border-gray-300 rounded-lg" />
                      <select name="fileType" required className="w-full p-3 border border-gray-300 rounded-lg">
                        <option value="">Type de fichier</option>
                        <option value="pdf">PDF</option>
                        <option value="csv">CSV</option>
                        <option value="txt">TXT</option>
                        <option value="json">JSON</option>
                      </select>
                      
                      <div className="space-y-3">
                        <FileUpload
                          label="Uploader un document (PDF, CSV, TXT, JSON)"
                          accept=".pdf,.csv,.txt,.json"
                          currentUrl={uploadedFileUrl}
                          onUpload={(url) => setUploadedFileUrl(url)}
                        />
                        
                        <div className="text-center text-gray-500">OU</div>
                        
                        <input 
                          name="fileUrl" 
                          placeholder="URL du fichier (optionnel)" 
                          value={uploadedFileUrl}
                          onChange={(e) => setUploadedFileUrl(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg" 
                        />
                      </div>
                      
                      <textarea name="content" placeholder="Contenu du document ou résumé" required rows={4} className="w-full p-3 border border-gray-300 rounded-lg resize-none" />
                    </>
                  )}
                  
                  {showModal === 'rss' && (
                    <>
                      <input name="name" placeholder="Nom du flux" required className="w-full p-3 border border-gray-300 rounded-lg" />
                      <input name="url" type="url" placeholder="URL du flux RSS" required className="w-full p-3 border border-gray-300 rounded-lg" />
                      <label className="flex items-center space-x-2">
                        <input name="active" type="checkbox" defaultChecked className="w-5 h-5" />
                        <span>Actif</span>
                      </label>
                    </>
                  )}
                  
                  {showModal === 'api' && (
                    <>
                      <input name="name" placeholder="Nom de l'API" required className="w-full p-3 border border-gray-300 rounded-lg" />
                      <input name="apiKey" placeholder="Clé API (optionnelle)" className="w-full p-3 border border-gray-300 rounded-lg" />
                      <input name="apiUrl" placeholder="URL de l'API" required className="w-full p-3 border border-gray-300 rounded-lg" />
                      <textarea name="description" placeholder="Description de l'API" required rows={3} className="w-full p-3 border border-gray-300 rounded-lg resize-none" />
                      <label className="flex items-center space-x-2">
                        <input name="active" type="checkbox" defaultChecked className="w-5 h-5" />
                        <span>Actif</span>
                      </label>
                    </>
                  )}
                  
                  {showModal === 'pronunciation' && (
                    <>
                      <input name="word" placeholder="Mot" required className="w-full p-3 border border-gray-300 rounded-lg" />
                      <input name="pronunciation" placeholder="Prononciation phonétique" required className="w-full p-3 border border-gray-300 rounded-lg" />
                    </>
                  )}

                  {showModal === 'upload-pronunciations' && (
                    <>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept=".csv,.txt,.json"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              uploadPronunciationsList(file)
                            }
                          }}
                          className="hidden"
                          id="pronunciations-file"
                        />
                        <label htmlFor="pronunciations-file" className="cursor-pointer">
                          <div className="text-gray-400 mb-2">
                            <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-600">
                            <span className="text-blue-600 font-medium">Cliquez pour choisir</span> un fichier
                          </p>
                          <p className="text-xs text-gray-500 mt-1">CSV, TXT ou JSON</p>
                        </label>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                        <h4 className="font-medium mb-2">Exemples de formats :</h4>
                        <div className="space-y-1 text-xs">
                          <p><strong>CSV :</strong> mot,prononciation</p>
                          <p><strong>TXT :</strong> mot|prononciation ou mot prononciation</p>
                          <p><strong>JSON :</strong> [{`"word": "mot", "pronunciation": "prononciation"`}]</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                {showModal !== 'upload-pronunciations' && (
                  <div className="flex space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(null)}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Ajouter
                    </button>
                  </div>
                )}

                {showModal === 'upload-pronunciations' && (
                  <div className="flex justify-center mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(null)}
                      className="bg-gray-300 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Fermer
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
