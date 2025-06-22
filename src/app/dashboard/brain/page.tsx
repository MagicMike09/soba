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
  
  const [activeTab, setActiveTab] = useState('agent')
  const [showModal, setShowModal] = useState<string | null>(null)
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load AI config - create default if none exists
      let aiResult = await supabase.from('ai_config').select('*').maybeSingle()
      
      if (!aiResult.data) {
        // Create default AI config if none exists
        const defaultConfig = {
          agent_name: 'Assistant Virtuel',
          agent_mission: 'Je suis votre assistant virtuel pour vous aider avec vos questions.',
          agent_personality: 'Je suis professionnel, serviable et à l\'écoute.',
          llm_api_key: '',
          llm_model: 'gpt-4',
          llm_api_url: 'https://api.openai.com/v1',
          temperature: 0.7
        }
        
        aiResult = await supabase
          .from('ai_config')
          .insert(defaultConfig)
          .select()
          .single()
      }

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

  const updateAIConfig = async (updates: Partial<AIConfig>) => {
    if (!aiConfig) return

    try {
      const updateData = {
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

      await supabase.from('ai_config').update(updateData).eq('id', aiConfig.id)
      loadData()
    } catch (error) {
      console.error('Error updating AI config:', error)
      alert('Erreur lors de la mise à jour')
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
        api_key: data.apiKey!,
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
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">Configuration du Modèle LLM</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Clé API
                    </label>
                    <input
                      type="password"
                      value={aiConfig?.llmApiKey || ''}
                      onChange={(e) => setAIConfig(prev => prev ? {...prev, llmApiKey: e.target.value} : null)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="sk-..."
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
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modèle
                    </label>
                    <select
                      value={aiConfig?.llmModel || ''}
                      onChange={(e) => setAIConfig(prev => prev ? {...prev, llmModel: e.target.value} : null)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
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
                      className="w-full"
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
                className="mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sauvegarder Configuration LLM
              </button>
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
                <button
                  onClick={() => setShowModal('pronunciation')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Ajouter Prononciation
                </button>
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
                      <input name="apiKey" placeholder="Clé API" required className="w-full p-3 border border-gray-300 rounded-lg" />
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
                </div>
                
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
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}