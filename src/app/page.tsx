'use client'

import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import InfoBox from '@/components/InfoBox'
import AdvisorModal from '@/components/AdvisorModal'
import HelpModal from '@/components/HelpModal'
import ChatBox from '@/components/ChatBox'
import FullConversation from '@/components/FullConversation'
import CallStatus from '@/components/CallStatus'
import { ConversationProvider, useConversation } from '@/contexts/ConversationContext'
import { getUserContext } from '@/utils/userContext'
import { AudioAPI } from '@/utils/audioAPI'
import { AdvisorService } from '@/utils/advisorService'
import { supabase } from '@/lib/supabase'
import { Advisor, BrandConfig, AIConfig, AnimationState, UserContext } from '@/types'

const Avatar3D = dynamic(() => import('@/components/Avatar3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  )
})

function MainContent() {
  const { messages, isRecording, addMessage } = useConversation()
  
  const [advisors, setAdvisors] = useState<Advisor[]>([])
  const [brandConfig, setBrandConfig] = useState<BrandConfig | null>(null)
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null)
  const [userContext, setUserContext] = useState<UserContext | null>(null)
  const [showAdvisorModal, setShowAdvisorModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showInfoBox, setShowInfoBox] = useState(true)
  const [showChatBox, setShowChatBox] = useState(false)
  const [animationState, setAnimationState] = useState<AnimationState>('idle')
  
  const [isConversationMode, setIsConversationMode] = useState(false)
  
  // New Audio API instances
  const [audioAPI, setAudioAPI] = useState<AudioAPI | null>(null)
  const [showFullConversation, setShowFullConversation] = useState(false)
  
  // Call status
  const [isCallActive, setIsCallActive] = useState(false)
  const [currentAdvisor, setCurrentAdvisor] = useState<Advisor | null>(null)
  const [advisorService] = useState(() => new AdvisorService())

  // Load data
  useEffect(() => {
    loadData()
    loadUserContext()
  }, [])

  useEffect(() => {
    if (aiConfig?.llmApiKey) {
      setAudioAPI(new AudioAPI(aiConfig.llmApiKey))
    }
  }, [aiConfig])

  const loadData = async () => {
    try {
      const [advisorsResult, brandResult, aiResult] = await Promise.all([
        supabase.from('advisors').select('*'),
        supabase.from('brand_config').select('*').single(),
        supabase.from('ai_config').select('*').single()
      ])

      if (advisorsResult.data) {
        setAdvisors(advisorsResult.data.map(advisor => ({
          id: advisor.id,
          name: advisor.name,
          firstName: advisor.first_name,
          lastName: advisor.last_name,
          phone: advisor.phone,
          email: advisor.email,
          photoUrl: advisor.photo_url,
          position: advisor.position,
          isAvailable: advisor.is_available ?? true
        })))
      }

      if (brandResult.data) {
        const config = {
          id: brandResult.data.id,
          mainLogoUrl: brandResult.data.main_logo_url,
          footerLogo1Url: brandResult.data.footer_logo_1_url,
          footerLogo2Url: brandResult.data.footer_logo_2_url,
          helpText: brandResult.data.help_text,
          infoBoxEnabled: brandResult.data.info_box_enabled,
          infoBoxContent: brandResult.data.info_box_content,
          infoBoxMediaUrl: brandResult.data.info_box_media_url,
          infoBoxMediaType: brandResult.data.info_box_media_type as 'image' | 'video'
        }
        setBrandConfig(config)
        setShowInfoBox(config.infoBoxEnabled)
      }

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
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const loadUserContext = async () => {
    try {
      const context = await getUserContext()
      setUserContext(context)
    } catch (error) {
      console.error('Error getting user context:', error)
    }
  }

  // SIMPLE: Toggle conversation mode - auto-start microphone
  const handleConverseClick = useCallback(async () => {
    console.log('🔄 SIMPLE: Conversation button clicked - mode:', isConversationMode)
    
    if (!audioAPI) {
      alert('⚠️ Clé OpenAI manquante. Configurez votre clé API dans le Dashboard Brain.')
      return
    }

    if (isConversationMode) {
      // STOP conversation
      console.log('🛑 SIMPLE: Stopping conversation...')
      setIsConversationMode(false)
      setShowChatBox(false)
      setShowFullConversation(false)
      setAnimationState('idle')
      
      addMessage({ 
        role: 'system', 
        content: '🛑 Conversation arrêtée' 
      })
    } else {
      // START conversation
      console.log('🚀 SIMPLE: Starting conversation...')
      setIsConversationMode(true)
      setShowChatBox(true)
      setShowFullConversation(true)
      setAnimationState('listening')
      
      addMessage({ 
        role: 'assistant', 
        content: 'Bonjour ! Je vous écoute, vous pouvez commencer à parler.' 
      })
    }
  }, [audioAPI, isConversationMode, addMessage])

  // Handle transcript from FullConversation component
  const handleTranscript = (transcript: string) => {
    console.log('📝 COMPLETE: Received transcript:', transcript)
    addMessage({ role: 'user', content: transcript })
    
    // Update animation state
    setAnimationState('thinking')
  }

  // Handle response from FullConversation component
  const handleResponse = (response: string) => {
    console.log('🤖 COMPLETE: Generated response:', response)
    addMessage({ role: 'assistant', content: response })
    
    // Update animation state
    setAnimationState('talking')
  }

  // Handle errors from FullConversation component
  const handleConversationError = (error: string) => {
    console.error('❌ COMPLETE: Conversation error:', error)
    setAnimationState('idle')
    
    addMessage({ 
      role: 'system', 
      content: `❌ Erreur: ${error}` 
    })
  }

  const handleCallClick = () => setShowAdvisorModal(true)
  const handleHelpClick = () => setShowHelpModal(true)

  const handleSelectAdvisor = async (advisor: Advisor) => {
    try {
      console.log('📞 Starting advisor call process for:', advisor.firstName, advisor.lastName)
      
      // Fermer la modal et démarrer l'interface d'appel
      setShowAdvisorModal(false)
      setCurrentAdvisor(advisor)
      setIsCallActive(true)
      setAnimationState('calling')
      
      // Récupérer le résumé de conversation si disponible
      const conversationSummary = messages.length > 0 
        ? `Dernière conversation: ${messages.slice(-3).map(m => `${m.role}: ${m.content}`).join(' | ')}`
        : 'Demande de contact via l\'assistant virtuel'

      // Envoyer l'email automatiquement en arrière-plan
      const emailSent = await advisorService.sendEmailToAdvisor(
        advisor, 
        userContext, 
        conversationSummary
      )

      if (emailSent) {
        console.log('✅ Email notification sent to advisor')
        addMessage({ 
          role: 'system', 
          content: `📧 Email envoyé à ${advisor.firstName} ${advisor.lastName}` 
        })
      } else {
        console.warn('⚠️ Email notification failed')
        addMessage({ 
          role: 'system', 
          content: `⚠️ Problème d'envoi email - Configuration EmailJS requise` 
        })
      }

    } catch (error) {
      console.error('❌ Error in advisor call process:', error)
      setAnimationState('idle')
      setIsCallActive(false)
      setCurrentAdvisor(null)
      
      addMessage({ 
        role: 'system', 
        content: '❌ Erreur lors de l\'appel. Veuillez réessayer.' 
      })
    }
  }

  const handleCallComplete = (result: 'completed' | 'failed' | 'cancelled') => {
    console.log('📞 Call completed with result:', result)
    
    setIsCallActive(false)
    setAnimationState('idle')
    
    if (currentAdvisor) {
      let message = ''
      switch (result) {
        case 'completed':
          message = `✅ Appel terminé avec ${currentAdvisor.firstName} ${currentAdvisor.lastName}`
          break
        case 'failed':
          message = `❌ Appel échoué avec ${currentAdvisor.firstName} ${currentAdvisor.lastName}`
          break
        case 'cancelled':
          message = `🚫 Appel annulé avec ${currentAdvisor.firstName} ${currentAdvisor.lastName}`
          break
      }
      
      addMessage({ role: 'system', content: message })
      
      // Envoyer notification de suivi au conseiller
      if (result === 'completed' || result === 'failed') {
        advisorService.sendFollowUpNotification(currentAdvisor, result).catch(console.error)
      }
    }
    
    setCurrentAdvisor(null)
  }

  const handleCancelCall = () => {
    console.log('🚫 Call cancelled by user')
    handleCallComplete('cancelled')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex flex-col">
      <Header
        logoUrl={brandConfig?.mainLogoUrl}
        onConverseClick={handleConverseClick}
        onCallClick={handleCallClick}
        onHelpClick={handleHelpClick}
        isConversationMode={isConversationMode}
      />

      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full">
          <Avatar3D
            avatarUrl={aiConfig?.avatarUrl}
            animationState={animationState}
            position={aiConfig?.avatarPosition || { x: 0, y: 0, z: 0 }}
            scale={aiConfig?.avatarPosition?.scale || 1}
            rotation={aiConfig?.avatarPosition?.rotation || { x: 0, y: 0, z: 0 }}
          />
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 pointer-events-none"></div>

        <InfoBox
          isVisible={showInfoBox}
          content={brandConfig?.infoBoxContent}
          mediaUrl={brandConfig?.infoBoxMediaUrl}
          mediaType={brandConfig?.infoBoxMediaType}
        />
      </main>

      <Footer
        logo1Url={brandConfig?.footerLogo1Url}
        logo2Url={brandConfig?.footerLogo2Url}
      />

      <AdvisorModal
        isOpen={showAdvisorModal}
        advisors={advisors}
        onClose={() => setShowAdvisorModal(false)}
        onSelectAdvisor={handleSelectAdvisor}
      />

      <HelpModal
        isOpen={showHelpModal}
        helpText={brandConfig?.helpText}
        onClose={() => setShowHelpModal(false)}
      />

      <ChatBox
        messages={messages}
        isRecording={isRecording}
        isProcessing={false}
        currentTranscript=""
        onToggle={() => setShowChatBox(!showChatBox)}
        isVisible={showChatBox}
      />

      {/* Full Conversation Component */}
      {showFullConversation && audioAPI && aiConfig && (
        <div className="fixed bottom-20 right-4 z-50">
          <FullConversation
            apiKey={aiConfig.llmApiKey}
            config={{
              agentName: aiConfig.agentName,
              agentMission: aiConfig.agentMission,
              agentPersonality: aiConfig.agentPersonality,
              llmModel: aiConfig.llmModel,
              temperature: aiConfig.temperature,
              sttLanguage: aiConfig.sttLanguage,
              ttsVoice: aiConfig.ttsVoice,
              ttsSpeed: aiConfig.ttsSpeed
            }}
            userContext={userContext}
            onTranscript={handleTranscript}
            onResponse={handleResponse}
            onError={handleConversationError}
          />
        </div>
      )}

      {/* Call Status Component */}
      {isCallActive && currentAdvisor && (
        <CallStatus
          advisor={currentAdvisor}
          isActive={isCallActive}
          onCallComplete={handleCallComplete}
          onCancel={handleCancelCall}
        />
      )}

    </div>
  )
}

export default function Home() {
  return (
    <ConversationProvider>
      <MainContent />
    </ConversationProvider>
  )
}