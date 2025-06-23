'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import InfoBox from '@/components/InfoBox'
import AdvisorModal from '@/components/AdvisorModal'
import HelpModal from '@/components/HelpModal'
import ChatBox from '@/components/ChatBox'
import { ConversationProvider, useConversation } from '@/contexts/ConversationContext'
import { getUserContext, formatContextForAI } from '@/utils/userContext'
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
  const [showChatBox, setShowChatBox] = useState(false)
  const [animationState, setAnimationState] = useState<AnimationState>('idle')
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [isConversationMode, setIsConversationMode] = useState(false)
  const [recordingTimeout, setRecordingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isConverseButtonDisabled, setIsConverseButtonDisabled] = useState(false)
  
  const [audioRecorder] = useState(() => new AudioRecorder())
  const [audioPlayer] = useState(() => new AudioPlayer())
  const [openAIService, setOpenAIService] = useState<OpenAIService | null>(null)
  
  // Refs pour éviter les dépendances circulaires
  const startListeningRef = useRef<(() => Promise<void>) | null>(null)
  const processRecordingRef = useRef<(() => Promise<void>) | null>(null)

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

  // Fonction pour interrompre l'IA
  const stopAI = useCallback(() => {
    console.log('⛔ Interrupting AI...')
    
    // Arrêter l'audio immédiatement
    audioPlayer.stop()
    
    // Arrêter l'enregistrement si actif
    if (isRecording) {
      audioRecorder.stopRecording().catch(console.error)
    }
    
    // Nettoyer tous les timeouts
    if (recordingTimeout) {
      clearTimeout(recordingTimeout)
      setRecordingTimeout(null)
    }
    
    // Réinitialiser tous les états
    setAnimationState('idle')
    setIsProcessing(false)
    setCurrentTranscript('')
    
    // Si on est en mode conversation, redémarrer l'écoute après une petite pause
    if (isConversationMode) {
      console.log('🔄 Restarting listening after interruption...')
      setTimeout(() => {
        if (isConversationMode && startListeningRef.current) {
          startListeningRef.current()
        }
      }, 500)
    }
  }, [audioPlayer, recordingTimeout, isRecording, audioRecorder, isConversationMode])

  // Fonction pour traiter l'enregistrement 
  const processRecording = useCallback(async () => {
    console.log('🔄 processRecording called - openAI:', !!openAIService, 'userContext:', !!userContext, 'isRecording:', isRecording)
    
    if (!openAIService || !userContext || !isRecording) {
      console.log('❌ processRecording aborted - missing requirements')
      return
    }
    
    try {
      console.log('🛑 Processing user speech...')
      stopRecording()
      setIsProcessing(true)
      setAnimationState('thinking')
      
      const audioBlob = await audioRecorder.stopRecording()
      console.log('🎵 Audio recorded:', audioBlob.size, 'bytes')
      
      if (audioBlob.size < 1000) {
        console.log('⚠️ Audio too short, listening again...')
        setIsProcessing(false)
        if (isConversationMode && startListeningRef.current) {
          setTimeout(() => {
            if (startListeningRef.current) {
              startListeningRef.current()
            }
          }, 300)
        }
        return
      }
      
      // STT - Speech to Text
      console.log('📝 Converting speech to text...')
      const transcript = await openAIService.speechToText(audioBlob, aiConfig?.sttLanguage || 'fr')
      console.log('✅ User said:', transcript)
      
      if (transcript.trim()) {
        // Ajouter le message utilisateur
        addMessage({ role: 'user', content: transcript })
        
        // Récupérer le contexte utilisateur actualisé
        console.log('🌍 Updating user context...')
        const currentContext = await getUserContext()
        
        // Générer la réponse IA avec contexte actualisé
        const systemPrompt = `Tu es ${aiConfig?.agentName || 'un assistant virtuel'}.
${aiConfig?.agentMission || 'Tu aides les utilisateurs avec leurs questions.'}
${aiConfig?.agentPersonality || 'Tu es professionnel et serviable.'}

CONTEXTE UTILISATEUR:
${formatContextForAI(currentContext)}

Réponds de manière naturelle et conversationnelle en français. Garde tes réponses courtes et engageantes (maximum 2-3 phrases). 
Utilise le contexte temporel et géographique si pertinent pour la conversation.`

        console.log('🧠 Generating AI response...')
        const response = await openAIService.generateResponse(
          [...messages, { id: 'temp', role: 'user', content: transcript, timestamp: new Date() }],
          systemPrompt,
          currentContext,
          aiConfig?.llmModel || 'gpt-4',
          aiConfig?.temperature || 0.7
        )
        
        console.log('✅ AI response:', response)
        addMessage({ role: 'assistant', content: response })
        
        // TTS - Text to Speech et lecture
        setAnimationState('talking')
        console.log('🔊 Converting text to speech...')
        const audioBuffer = await openAIService.textToSpeech(
          response, 
          aiConfig?.ttsVoice || 'alloy',
          aiConfig?.ttsSpeed || 1.0
        )
        
        setIsProcessing(false)
        
        // Jouer l'audio
        await audioPlayer.playAudio(audioBuffer)
        console.log('✅ AI finished speaking')
        
        // Continuer la conversation si toujours en mode actif
        if (isConversationMode) {
          console.log('🔄 Continuing conversation...')
          setTimeout(async () => {
            if (startListeningRef.current) {
              await startListeningRef.current()
            }
          }, 800) // Petite pause pour éviter le feedback audio
        } else {
          setAnimationState('idle')
        }
      } else {
        console.log('⚠️ No speech detected, listening again...')
        setIsProcessing(false)
        if (isConversationMode) {
          setTimeout(async () => {
            if (startListeningRef.current) {
              await startListeningRef.current()
            }
          }, 500)
        } else {
          setAnimationState('idle')
        }
      }
    } catch (error) {
      console.error('❌ Error in conversation:', error)
      setIsProcessing(false)
      setAnimationState('idle')
      
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      
      // Gestion d'erreurs spécifiques avec retry intelligent
      if (errorMessage.includes('401') || errorMessage.includes('key') || errorMessage.includes('Unauthorized')) {
        alert('❌ Clé API OpenAI invalide ou expirée. Vérifiez votre configuration dans le Dashboard Brain.')
        setIsConversationMode(false)
      } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        console.log('⚠️ Rate limit detected, pausing conversation...')
        alert('⏳ Limite de taux OpenAI atteinte. Pause de 60 secondes...')
        setTimeout(() => {
          if (isConversationMode && startListeningRef.current) {
            console.log('🔄 Resuming after rate limit...')
            startListeningRef.current()
          }
        }, 60000) // Attendre 60 secondes
      } else if (errorMessage.includes('microphone') || errorMessage.includes('media') || errorMessage.includes('NotAllowed')) {
        alert('❌ Erreur microphone. Autorisez l\'accès au microphone et rechargez la page.')
        setIsConversationMode(false)
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        console.log('⚠️ Network error, retrying in 2 seconds...')
        if (isConversationMode) {
          setTimeout(async () => {
            if (isConversationMode && startListeningRef.current) {
              await startListeningRef.current()
            }
          }, 2000)
        }
      } else if (isConversationMode) {
        console.log('⚠️ Temporary error, retrying with backoff...')
        // Backoff exponentiel pour les erreurs temporaires
        const retryDelay = Math.min(1000 * Math.pow(2, 1), 5000) // Max 5 secondes
        setTimeout(async () => {
          if (isConversationMode && startListeningRef.current) {
            await startListeningRef.current()
          }
        }, retryDelay)
      }
    }
  }, [openAIService, userContext, audioRecorder, audioPlayer, stopRecording, messages, addMessage, aiConfig, isConversationMode, isRecording])

  // Fonction pour démarrer l'enregistrement avec détection de silence
  const startListening = useCallback(async () => {
    if (isRecording || !isConversationMode) return
    
    try {
      console.log('🎤 Starting to listen...')
      startRecording()
      setAnimationState('listening')
      setCurrentTranscript('')
      
      // Démarrer l'enregistrement avec détection de silence automatique (3 secondes)
      await audioRecorder.startRecording(async () => {
        console.log('🔇 3 seconds of silence detected - processing...')
        if (isRecording && processRecordingRef.current) {
          await processRecordingRef.current()
        }
      })
      
    } catch (error) {
      console.error('❌ Error starting recording:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      alert(`❌ Erreur microphone: ${errorMessage}\nAssurez-vous d'autoriser l'accès au microphone.`)
      setAnimationState('idle')
      setIsConversationMode(false)
    }
  }, [isRecording, audioRecorder, startRecording, isConversationMode])

  // Assigner les fonctions aux refs dans un useEffect
  useEffect(() => {
    startListeningRef.current = startListening
    processRecordingRef.current = processRecording
  }, [startListening, processRecording])

  // Fonction principale pour gérer la conversation (style OpenAI)
  const handleConverseClick = useCallback(async () => {
    // Protection contre les double-clics
    if (isConverseButtonDisabled) {
      console.log('🚫 Button click ignored - already processing')
      return
    }

    console.log('🎤 Conversation button clicked, current mode:', isConversationMode)
    console.log('🎤 OpenAI service available:', !!openAIService)
    console.log('🎤 User context available:', !!userContext)
    console.log('🎤 Is recording:', isRecording)
    console.log('🎤 Is processing:', isProcessing)
    
    // Désactiver temporairement le bouton
    setIsConverseButtonDisabled(true)
    setTimeout(() => setIsConverseButtonDisabled(false), 1000)
    
    if (!openAIService) {
      alert('⚠️ Clé OpenAI manquante. Configurez votre clé API dans le Dashboard Brain.')
      return
    }
    
    if (!userContext) {
      console.error('❌ User context not available')
      return
    }

    if (isConversationMode) {
      // STOP - Arrêter la conversation
      console.log('🛑 Stopping conversation...')
      setIsConversationMode(false)
      stopAI()
      setAnimationState('idle')
      
      // Masquer la chatbox après un délai
      setTimeout(() => {
        setShowChatBox(false)
      }, 2000)
    } else {
      // START - Démarrer la conversation fluide
      console.log('🚀 Starting conversation...')
      setIsConversationMode(true)
      setShowChatBox(true)
      
      // Message de bienvenue et démarrage
      addMessage({ 
        role: 'assistant', 
        content: 'Bonjour ! Je vous écoute, vous pouvez commencer à parler.' 
      })
      
      // Démarrer l'écoute après un court délai
      setTimeout(() => {
        if (startListeningRef.current) {
          startListeningRef.current()
        }
      }, 1000)
    }
  }, [openAIService, userContext, isConversationMode, stopAI, addMessage, isConverseButtonDisabled, isRecording, isProcessing])

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
        isConversationMode={isConversationMode}
        onStopAI={stopAI}
        isDisabled={isConverseButtonDisabled}
      />

      <main className="flex-1 relative overflow-hidden">
        {/* Canvas 3D en arrière-plan complet */}
        <div className="absolute inset-0 w-full h-full">
          <Avatar3D
            avatarUrl={aiConfig?.avatarUrl}
            animationState={animationState}
            position={aiConfig?.avatarPosition || { x: 0, y: 0, z: 0 }}
            scale={aiConfig?.avatarPosition?.scale || 1}
            rotation={aiConfig?.avatarPosition?.rotation || { x: 0, y: 0, z: 0 }}
          />
        </div>
        
        {/* Overlay gradient subtil */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 pointer-events-none"></div>

        {/* InfoBox par-dessus */}
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
