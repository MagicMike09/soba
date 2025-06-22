'use client'

import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import InfoBox from '@/components/InfoBox'
import AdvisorModal from '@/components/AdvisorModal'
import HelpModal from '@/components/HelpModal'
import { ConversationProvider, useConversation } from '@/contexts/ConversationContext'
import { getUserContext } from '@/utils/userContext'
import { OpenAIService, AudioRecorder, AudioPlayer } from '@/utils/openai'
import { supabase } from '@/lib/supabase'
import { Advisor, BrandConfig, AIConfig, AnimationState, UserContext } from '@/types'
import * as emailjs from '@emailjs/browser'

const Avatar3D = dynamic(() => import('@/components/Avatar3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-32 h-32 bg-gray-200 rounded-full animate-pulse"></div>
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
  const [showInfoBox, setShowInfoBox] = useState(false)
  const [animationState, setAnimationState] = useState<AnimationState>('idle')
  
  const [audioRecorder] = useState(() => new AudioRecorder())
  const [audioPlayer] = useState(() => new AudioPlayer())
  const [openAIService, setOpenAIService] = useState<OpenAIService | null>(null)

  // Load initial data
  useEffect(() => {
    loadData()
    loadUserContext()
  }, [])

  // Initialize OpenAI service when AI config is loaded
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

  const handleConverseClick = useCallback(async () => {
    if (!openAIService) {
      alert('⚠️ Clé OpenAI manquante. Configurez votre clé API dans le Dashboard Brain.')
      return
    }
    if (!userContext) {
      console.error('User context not available')
      return
    }

    if (isRecording) {
      try {
        stopRecording()
        setAnimationState('thinking')
        
        const audioBlob = await audioRecorder.stopRecording()
        const transcript = await openAIService.speechToText(audioBlob)
        
        if (transcript.trim()) {
          addMessage({ role: 'user', content: transcript })
          
          const systemPrompt = `Tu es ${aiConfig?.agentName || 'un assistant virtuel'}.
${aiConfig?.agentMission || 'Tu aides les utilisateurs avec leurs questions.'}
${aiConfig?.agentPersonality || 'Tu es professionnel et serviable.'}

Réponds de manière naturelle et conversationnelle en français.`

          const response = await openAIService.generateResponse(
            [...messages, { id: 'temp', role: 'user', content: transcript, timestamp: new Date() }],
            systemPrompt,
            userContext,
            aiConfig?.llmModel || 'gpt-4',
            aiConfig?.temperature || 0.7
          )
          
          addMessage({ role: 'assistant', content: response })
          
          setAnimationState('talking')
          const audioBuffer = await openAIService.textToSpeech(response)
          await audioPlayer.playAudio(audioBuffer)
          setAnimationState('idle')
        }
      } catch (error) {
        console.error('Error processing conversation:', error)
        setAnimationState('idle')
      }
    } else {
      try {
        startRecording()
        setAnimationState('waiting')
        await audioRecorder.startRecording()
        
        // Auto-stop after 3 seconds of silence (simplified implementation)
        setTimeout(async () => {
          if (isRecording) {
            handleConverseClick()
          }
        }, 5000) // 5 seconds timeout for demo
      } catch (error) {
        console.error('Error starting recording:', error)
        setAnimationState('idle')
      }
    }
  }, [isRecording, openAIService, userContext, audioRecorder, audioPlayer, messages, addMessage, startRecording, stopRecording, aiConfig])

  const handleCallClick = () => {
    setShowAdvisorModal(true)
  }

  const handleHelpClick = () => {
    setShowHelpModal(true)
  }

  const handleSelectAdvisor = async (advisor: Advisor) => {
    try {
      setAnimationState('calling')
      
      // Send email notification
      if (process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID) {
        await emailjs.send(
          process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
          process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
          {
            advisor_name: `${advisor.firstName} ${advisor.lastName}`,
            advisor_email: advisor.email,
            user_info: userContext ? `Location: ${userContext.location?.city || 'Unknown'}, Time: ${userContext.timestamp.toLocaleString()}` : 'No context available'
          },
          process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
        )
      }

      // Simulate WebRTC call attempt (45 second timeout)
      const callTimeout = setTimeout(() => {
        setAnimationState('idle')
        setShowAdvisorModal(false)
        alert('Aucune réponse détectée. L\'appel a été terminé automatiquement.')
      }, 45000)

      // For demo purposes, we'll just close after a short delay
      setTimeout(() => {
        clearTimeout(callTimeout)
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
        isRecording={isRecording}
      />

      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5"></div>
        
        <div className="relative w-full h-full">
          <Avatar3D
            avatarUrl={aiConfig?.avatarUrl}
            animationState={animationState}
            position={aiConfig?.avatarPosition || { x: 0, y: 0, z: 0 }}
            scale={aiConfig?.avatarPosition?.scale || 1}
            rotation={aiConfig?.avatarPosition?.rotation || { x: 0, y: 0, z: 0 }}
          />
        </div>

        <InfoBox
          isVisible={showInfoBox}
          content={brandConfig?.infoBoxContent}
          mediaUrl={brandConfig?.infoBoxMediaUrl}
          mediaType={brandConfig?.infoBoxMediaType}
          onClose={() => setShowInfoBox(false)}
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
