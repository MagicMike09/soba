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
      console.log('🔊 AudioAPI: Playing audio buffer...')
      
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
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
        
        audio.play().catch(reject)
      })
      
    } catch (error) {
      console.error('❌ AudioAPI: Play audio error:', error)
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