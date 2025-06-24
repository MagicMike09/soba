// Utilitaires pour les APIs TTS et STT backend

export class AudioAPI {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Text-to-Speech avec streaming audio en temps réel
   */
  async textToSpeech(text: string, voice: string = 'alloy'): Promise<ArrayBuffer> {
    try {
      console.log('🔊 AudioAPI: TTS request for text:', text.substring(0, 50) + '...')
      
      const response = await fetch('/api/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text, 
          voice, 
          apiKey: this.apiKey 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la génération audio')
      }

      const audioBuffer = await response.arrayBuffer()
      console.log('✅ AudioAPI: TTS completed, buffer size:', audioBuffer.byteLength)
      
      return audioBuffer
      
    } catch (error) {
      console.error('❌ AudioAPI TTS Error:', error)
      throw error
    }
  }

  /**
   * Speech-to-Text avec upload de fichier audio
   */
  async speechToText(audioBlob: Blob, language: string = 'fr'): Promise<string> {
    try {
      console.log('🎙️ AudioAPI: STT request for audio blob size:', audioBlob.size)
      
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('apiKey', this.apiKey)
      formData.append('language', language)

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la transcription')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Transcription échouée')
      }

      console.log('✅ AudioAPI: STT completed, transcript:', result.transcript)
      
      return result.transcript
      
    } catch (error) {
      console.error('❌ AudioAPI STT Error:', error)
      throw error
    }
  }

  /**
   * Jouer un buffer audio avec gestion des erreurs
   */
  async playAudioBuffer(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      console.log('🔊 AudioAPI: Playing audio buffer, size:', audioBuffer.byteLength, 'bytes')
      
      if (audioBuffer.byteLength === 0) {
        throw new Error('Buffer audio vide')
      }
      
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
      // Add more event listeners for debugging
      audio.onloadstart = () => console.log('🔊 AudioAPI: Audio load started')
      audio.oncanplay = () => console.log('🔊 AudioAPI: Audio can play')
      audio.onplay = () => console.log('🔊 AudioAPI: Audio playing started')
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          console.log('✅ AudioAPI: Audio playback completed')
          URL.revokeObjectURL(audioUrl)
          resolve()
        }
        
        audio.onerror = (error) => {
          console.error('❌ AudioAPI: Audio playback error:', error)
          URL.revokeObjectURL(audioUrl)
          reject(new Error('Erreur lors de la lecture audio'))
        }
        
        // Try to play with user interaction check
        audio.play().then(() => {
          console.log('✅ AudioAPI: Audio play() succeeded')
        }).catch((playError) => {
          console.error('❌ AudioAPI: Audio play() failed:', playError)
          URL.revokeObjectURL(audioUrl)
          reject(new Error(`Erreur lecture audio: ${playError.message}`))
        })
      })
      
    } catch (error) {
      console.error('❌ AudioAPI: Play audio error:', error)
      throw error
    }
  }

  /**
   * LLM Chat Completion avec gestion du contexte
   */
  async generateResponse(
    messages: Array<{role: 'user' | 'assistant', content: string}>, 
    systemPrompt: string,
    userContext?: unknown,
    model: string = 'gpt-4',
    temperature: number = 0.7
  ): Promise<string> {
    try {
      console.log('🧠 AudioAPI: LLM request for', messages.length, 'messages')
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages, 
          systemPrompt,
          userContext,
          model,
          temperature,
          apiKey: this.apiKey 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la génération de réponse')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Génération de réponse échouée')
      }

      console.log('✅ AudioAPI: LLM completed, response:', result.response.substring(0, 100) + '...')
      
      return result.response
      
    } catch (error) {
      console.error('❌ AudioAPI LLM Error:', error)
      throw error
    }
  }

  /**
   * Flux de conversation complet: STT → LLM → TTS
   */
  async completeConversationFlow(
    audioBlob: Blob,
    conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
    config: {
      sttLanguage?: string
      systemPrompt?: string
      userContext?: unknown
      llmModel?: string
      temperature?: number
      ttsVoice?: string
      ttsSpeed?: number
    } = {}
  ): Promise<{
    transcript: string
    response: string
    audioBuffer: ArrayBuffer
  }> {
    try {
      console.log('🔄 AudioAPI: Starting complete conversation flow...')
      
      // 1. STT - Speech to Text
      console.log('📝 AudioAPI: Step 1 - STT conversion...')
      const transcript = await this.speechToText(audioBlob, config.sttLanguage || 'fr')
      
      if (!transcript.trim()) {
        throw new Error('Aucune parole détectée dans l\'audio')
      }
      
      // 2. LLM - Generate response
      console.log('🧠 AudioAPI: Step 2 - LLM generation...')
      const newMessages = [...conversationHistory, { role: 'user' as const, content: transcript }]
      const response = await this.generateResponse(
        newMessages,
        config.systemPrompt || 'Tu es un assistant virtuel français. Réponds de manière naturelle et conversationnelle.',
        config.userContext,
        config.llmModel || 'gpt-3.5-turbo',
        config.temperature || 0.1
      )
      
      // 3. TTS - Text to Speech
      console.log('🔊 AudioAPI: Step 3 - TTS generation...')
      const audioBuffer = await this.textToSpeech(response, config.ttsVoice || 'alloy')
      
      console.log('✅ AudioAPI: Complete conversation flow finished')
      
      return {
        transcript,
        response,
        audioBuffer
      }
      
    } catch (error) {
      console.error('❌ AudioAPI Complete Flow Error:', error)
      throw error
    }
  }

  /**
   * Gestion des erreurs API avec messages utilisateur
   */
  static handleAPIError(error: unknown): string {
    const errorObj = error as { message?: string }
    const message = errorObj.message || 'Erreur inconnue'
    
    if (message.includes('401') || message.includes('invalide')) {
      return '❌ Clé API OpenAI invalide. Vérifiez votre configuration dans le Dashboard Brain.'
    } else if (message.includes('429') || message.includes('limite')) {
      return '⏳ Limite de taux OpenAI atteinte. Veuillez patienter quelques minutes.'
    } else if (message.includes('400') || message.includes('invalide')) {
      return '⚠️ Données invalides. Vérifiez le texte ou le fichier audio.'
    } else if (message.includes('network') || message.includes('fetch')) {
      return '🌐 Erreur de connexion. Vérifiez votre connexion internet.'
    } else {
      return `❌ Erreur: ${message}`
    }
  }
}

/**
 * Utilitaire pour l'enregistrement audio simple
 */
export class SimpleAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null

  async startRecording(): Promise<void> {
    try {
      console.log('🎤 SimpleAudioRecorder: Starting recording...')
      
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      this.audioChunks = []
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }
      
      this.mediaRecorder.start()
      console.log('✅ SimpleAudioRecorder: Recording started')
      
    } catch (error) {
      console.error('❌ SimpleAudioRecorder: Start error:', error)
      throw new Error('Impossible d\'accéder au microphone. Autorisez l\'accès et rechargez la page.')
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Enregistrement non démarré'))
        return
      }

      this.mediaRecorder.onstop = () => {
        console.log('✅ SimpleAudioRecorder: Recording stopped')
        
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
        console.log('🎵 SimpleAudioRecorder: Audio blob size:', audioBlob.size)
        
        // Cleanup
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop())
          this.stream = null
        }
        
        resolve(audioBlob)
      }

      this.mediaRecorder.stop()
    })
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }
}