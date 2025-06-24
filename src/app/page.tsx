'use client'

import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import InfoBox from '@/components/InfoBox'
import AdvisorModal from '@/components/AdvisorModal'
import HelpModal from '@/components/HelpModal'
import ChatBox from '@/components/ChatBox'
import SimpleConversation from '@/components/SimpleConversation'
import EmailDiagnostic from '@/components/EmailDiagnostic'
import { ConversationProvider, useConversation } from '@/contexts/ConversationContext'
import { getUserContext } from '@/utils/userContext'
import { AudioAPI } from '@/utils/audioAPI'
import { AdvisorService } from '@/utils/advisorService'
import { analyticsService } from '@/utils/analyticsService'
import { AnimationService } from '@/utils/animationService'
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
  const [showDiagnostic, setShowDiagnostic] = useState(false)
  const [showInfoBox, setShowInfoBox] = useState(true)
  const [showChatBox, setShowChatBox] = useState(false)
  const [animationState, setAnimationState] = useState<AnimationState>('idle')
  
  const [isConversationMode, setIsConversationMode] = useState(false)
  
  // New Audio API instances
  const [audioAPI, setAudioAPI] = useState<AudioAPI | null>(null)
  const [showFullConversation, setShowFullConversation] = useState(false)
  
  // Removed call status - email only
  const [advisorService] = useState(() => new AdvisorService())
  
  // Analytics tracking
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  
  // Animation states
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastAnimationChange, setLastAnimationChange] = useState<number>(Date.now())

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

  // Animation intelligence: analyser les messages pour déclencher les bonnes animations
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    
    if (lastMessage && Date.now() - lastAnimationChange > 1000) {
      const newAnimationState = AnimationService.analyzeMessage(
        lastMessage.content, 
        lastMessage.role
      )
      
      if (newAnimationState !== animationState) {
        console.log('🎭 Animation change:', animationState, '->', newAnimationState, 'for message:', lastMessage.content)
        setAnimationState(newAnimationState)
        setLastAnimationChange(Date.now())
        
        // Pour les animations temporaires (hello, bye), retourner à idle après un délai
        if (newAnimationState === 'hello' || newAnimationState === 'bye') {
          setTimeout(() => {
            if (Date.now() - lastAnimationChange >= 2800) { // Éviter conflits
              setAnimationState('idle')
              setLastAnimationChange(Date.now())
            }
          }, 3000)
        }
        
        // Pour talking, revenir à idle après le message
        if (newAnimationState === 'talking' && lastMessage.role === 'assistant') {
          const messageLength = lastMessage.content.length
          const duration = Math.max(2000, Math.min(messageLength * 50, 8000)) // 50ms par caractère, max 8s
          setTimeout(() => {
            if (Date.now() - lastAnimationChange >= duration - 200) { // Éviter conflits
              setAnimationState('idle')
              setLastAnimationChange(Date.now())
            }
          }, duration)
        }
      }
    }
  }, [messages])

  // Animation intelligence: états de conversation (recording, processing)
  useEffect(() => {
    const conversationState = AnimationService.analyzeConversationState(
      isRecording,
      isProcessing,
      messages[messages.length - 1],
      isConversationMode && messages.length === 0
    )
    
    if (conversationState !== animationState && Date.now() - lastAnimationChange > 500) {
      console.log('🎭 State animation change:', animationState, '->', conversationState)
      setAnimationState(conversationState)
      setLastAnimationChange(Date.now())
    }
  }, [isRecording, isProcessing, isConversationMode])

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
      
      // Terminer le tracking analytics
      if (currentSessionId) {
        analyticsService.endConversation(currentSessionId, {
          llmModel: aiConfig?.llmModel || 'gpt-4'
        }).catch(console.error)
        setCurrentSessionId(null)
      }
      
      setIsConversationMode(false)
      setShowChatBox(false)
      setShowFullConversation(false)
      setIsProcessing(false)
      
      // Animation d'au revoir (une seule fois)
      if (animationState !== 'bye') {
        setAnimationState('bye')
        setLastAnimationChange(Date.now())
        setTimeout(() => {
          setAnimationState('idle')
          setLastAnimationChange(Date.now())
        }, 3000)
      }
      
      addMessage({ 
        role: 'system', 
        content: '🛑 Conversation arrêtée - Au revoir !' 
      })
    } else {
      // START conversation
      console.log('🚀 SIMPLE: Starting conversation...')
      
      // Démarrer le tracking analytics
      const sessionId = analyticsService.generateSessionId()
      setCurrentSessionId(sessionId)
      analyticsService.startConversation(sessionId, userContext)
      
      setIsConversationMode(true)
      setShowChatBox(true)
      setShowFullConversation(true)
      
      // Animation de salutation (une seule fois)
      if (animationState !== 'hello') {
        setAnimationState('hello')
        setLastAnimationChange(Date.now())
        setTimeout(() => {
          setAnimationState('listening')
          setLastAnimationChange(Date.now())
        }, 2000)
      }
      
      const welcomeMessage = { 
        role: 'assistant' as const, 
        content: 'Bonjour ! Je vous écoute, vous pouvez commencer à parler.' 
      }
      addMessage(welcomeMessage)
      
      // Tracker le message de bienvenue
      if (sessionId) {
        analyticsService.addMessage(sessionId, welcomeMessage)
      }
    }
  }, [audioAPI, isConversationMode, addMessage])

  const handleCallClick = () => setShowAdvisorModal(true)
  const handleHelpClick = () => setShowHelpModal(true)
  const handleDiagnosticClick = () => setShowDiagnostic(true)

  const handleSelectAdvisor = async (advisor: Advisor) => {
    try {
      console.log('📧 Sending email to advisor:', advisor.firstName, advisor.lastName)
      
      // Fermer la modal
      setShowAdvisorModal(false)
      
      // Récupérer le résumé de conversation si disponible
      const conversationSummary = messages.length > 0 
        ? `Dernière conversation: ${messages.slice(-3).map(m => `${m.role}: ${m.content}`).join(' | ')}`
        : 'Demande de contact via l\'assistant virtuel'

      // Envoyer l'email
      const emailSent = await advisorService.sendEmailToAdvisor(
        advisor, 
        userContext, 
        conversationSummary
      )

      if (emailSent) {
        // Tracker l'envoi d'email au conseiller
        if (currentSessionId) {
          analyticsService.updateAdvisorContact(currentSessionId, advisor.email).catch(console.error)
        }
        
        addMessage({ 
          role: 'system', 
          content: `✅ Email envoyé à ${advisor.firstName} ${advisor.lastName}` 
        })
      } else {
        addMessage({ 
          role: 'system', 
          content: `❌ Échec de l'envoi email à ${advisor.firstName} ${advisor.lastName}` 
        })
      }

    } catch (error) {
      console.error('❌ Error sending email:', error)
      addMessage({ 
        role: 'system', 
        content: '❌ Erreur lors de l\'envoi email. Veuillez réessayer.' 
      })
    }
  }

  // Removed call handling functions - email only

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex flex-col">
      <Header
        logoUrl={brandConfig?.mainLogoUrl}
        onConverseClick={handleConverseClick}
        onCallClick={handleCallClick}
        onHelpClick={handleHelpClick}
        onDiagnosticClick={handleDiagnosticClick}
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

      <EmailDiagnostic
        isOpen={showDiagnostic}
        onClose={() => setShowDiagnostic(false)}
        userContext={userContext}
      />

      <ChatBox
        messages={messages}
        isRecording={isRecording}
        isProcessing={false}
        currentTranscript=""
        onToggle={() => setShowChatBox(!showChatBox)}
        isVisible={showChatBox}
      />

      {/* Simple Conversation Component */}
      {showFullConversation && audioAPI && aiConfig && (
        <div className="fixed bottom-16 right-2 sm:bottom-20 sm:right-4 z-50">
          <SimpleConversation
            apiKey={aiConfig.llmApiKey}
            config={{
              agentName: aiConfig.agentName,
              llmModel: aiConfig.llmModel,
              temperature: aiConfig.temperature,
              sttLanguage: aiConfig.sttLanguage,
              ttsVoice: aiConfig.ttsVoice
            }}
            userContext={userContext}
          />
        </div>
      )}

      {/* Removed CallStatus component - email only */}

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