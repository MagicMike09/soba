'use client'

import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import InfoBox from '@/components/InfoBox'
import AdvisorModal from '@/components/AdvisorModal'
import HelpModal from '@/components/HelpModal'
import ChatBox from '@/components/ChatBox'
import { ConversationProvider, useConversation } from '@/contexts/ConversationContext'
import { getUserContext } from '@/utils/userContext'
import { OpenAIService, AudioRecorder, AudioPlayer } from '@/utils/openai'
import { supabase } from '@/lib/supabase'
import { Advisor, BrandConfig, AIConfig, AnimationState, UserContext } from '@/types'
import * as emailjs from '@emailjs/browser'

const Avatar3D = dynamic(() => import('@/components/Avatar3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  )
})

function MainContent() {
  const { messages, isRecording, addMessage, startRecording, stopRecording } = useConversation()
  
  const [advisors, setAdvisors] = useState<Advisor[]>([])
  const [brandConfig, setBrandConfig] = useState<BrandConfig | null>(null)
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null)
  const [userContext, setUserContext] = useState<UserContext | null>(null)
  const [showAdvisorModal, setShowAdvisorModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showInfoBox, setShowInfoBox] = useState(true)
  const [showChatBox, setShowChatBox] = useState(false)
  const [animationState, setAnimationState] = useState<AnimationState>('idle')
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [isConversationMode, setIsConversationMode] = useState(false)
  
  const [audioRecorder] = useState(() => new AudioRecorder())
  const [audioPlayer] = useState(() => new AudioPlayer())
  const [openAIService, setOpenAIService] = useState<OpenAIService | null>(null)

  // Load data
  useEffect(() => {
    loadData()
    loadUserContext()
  }, [])

  useEffect(() => {
    if (aiConfig?.llmApiKey) {
      setOpenAIService(new OpenAIService(aiConfig.llmApiKey))
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

  // ULTRA-SIMPLE conversation handler
  const handleConverseClick = useCallback(async () => {
    console.log('🆕 ULTRA-SIMPLE conversation V3, mode:', isConversationMode)
    
    if (!openAIService) {
      alert('⚠️ Clé OpenAI manquante. Configurez votre clé API dans le Dashboard Brain.')
      return
    }

    if (isConversationMode) {
      // STOP
      console.log('🛑 ULTRA-SIMPLE: Stopping...')
      setIsConversationMode(false)
      if (isRecording) {
        audioRecorder.stopRecording().catch(console.error)
      }
      setAnimationState('idle')
      setTimeout(() => setShowChatBox(false), 2000)
    } else {
      // START
      console.log('🚀 ULTRA-SIMPLE: Starting...')
      setIsConversationMode(true)
      setShowChatBox(true)
      
      addMessage({ 
        role: 'assistant', 
        content: 'ULTRA-SIMPLE V3: Parlez maintenant, je vous écoute pendant 4 secondes!' 
      })
      
      // Start immediately
      recordAndProcess()
    }
  }, [openAIService, isConversationMode, isRecording, addMessage])

  // Direct function without useCallback
  const recordAndProcess = async () => {
    try {
      console.log('🎙️ ULTRA-SIMPLE: Starting recording...')
      startRecording()
      setAnimationState('listening')
      
      await audioRecorder.startRecording()
      
      // Fixed 4 second timer
      setTimeout(async () => {
        try {
          console.log('⏱️ ULTRA-SIMPLE: 4 seconds up, processing...')
          stopRecording()
          setIsProcessing(true)
          setAnimationState('thinking')
          
          const audioBlob = await audioRecorder.stopRecording()
          console.log('🎵 ULTRA-SIMPLE: Audio size:', audioBlob.size)
          
          if (audioBlob.size > 1000) {
            // STT
            console.log('📝 ULTRA-SIMPLE: STT...')
            const transcript = await openAIService!.speechToText(audioBlob, 'fr')
            console.log('✅ ULTRA-SIMPLE: Transcript:', transcript)
            
            if (transcript.trim()) {
              addMessage({ role: 'user', content: transcript })
              
              // LLM
              console.log('🧠 ULTRA-SIMPLE: LLM...')
              const response = await openAIService!.generateResponse(
                [...messages, { id: Date.now().toString(), role: 'user', content: transcript, timestamp: new Date() }],
                'Tu es un assistant virtuel français. Réponds brièvement et clairement.',
                userContext!,
                'gpt-4',
                0.7
              )
              
              console.log('✅ ULTRA-SIMPLE: Response:', response)
              addMessage({ role: 'assistant', content: response })
            }
          } else {
            console.log('⚠️ ULTRA-SIMPLE: Audio too short')
          }
          
          setIsProcessing(false)
          setAnimationState('idle')
          
        } catch (error) {
          console.error('❌ ULTRA-SIMPLE: Error:', error)
          setIsProcessing(false)
          setAnimationState('idle')
          alert('Erreur: ' + (error as Error).message)
        }
      }, 4000)
      
    } catch (error) {
      console.error('❌ ULTRA-SIMPLE: Recording error:', error)
      setIsConversationMode(false)
      alert('Erreur microphone: ' + (error as Error).message)
    }
  }

  const handleCallClick = () => setShowAdvisorModal(true)
  const handleHelpClick = () => setShowHelpModal(true)

  const handleSelectAdvisor = async (advisor: Advisor) => {
    try {
      setAnimationState('calling')
      
      if (process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID) {
        await emailjs.send(
          process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
          process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
          {
            advisor_name: `${advisor.firstName} ${advisor.lastName}`,
            advisor_email: advisor.email,
            advisor_phone: advisor.phone,
            user_context: JSON.stringify(userContext)
          },
          process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
        )
      }

      setTimeout(() => {
        setAnimationState('idle')
        setShowAdvisorModal(false)
        alert(`Appel initié avec ${advisor.firstName} ${advisor.lastName}`)
      }, 3000)

    } catch (error) {
      console.error('Error calling advisor:', error)
      setAnimationState('idle')
      alert('Erreur lors de l\'appel. Veuillez réessayer.')
    }
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
        isProcessing={isProcessing}
        currentTranscript={currentTranscript}
        onToggle={() => setShowChatBox(!showChatBox)}
        isVisible={showChatBox}
      />
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