import { ConversationMessage, UserContext } from '@/types'

export class OpenAIService {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async textToSpeech(text: string, voice: string = 'alloy', speed: number = 1.0): Promise<ArrayBuffer> {
    console.log('🔊 TTS Request:', { textLength: text.length, voice, model: 'tts-1' })
    
    // Nettoyer et limiter le texte
    const cleanText = text.trim().substring(0, 4000)
    if (!cleanText) {
      throw new Error('Texte vide pour la synthèse vocale')
    }
    
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: cleanText,
        voice: voice,
        response_format: 'mp3',
        speed: speed
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ TTS API error:', response.status, response.statusText, errorText)
      
      if (response.status === 401) {
        throw new Error('Clé API OpenAI invalide ou expirée')
      } else if (response.status === 429) {
        throw new Error('Limite de taux API atteinte. Attendez un moment.')
      } else {
        throw new Error(`Erreur TTS: ${response.status} ${response.statusText}`)
      }
    }

    const arrayBuffer = await response.arrayBuffer()
    console.log('✅ TTS Response received, size:', arrayBuffer.byteLength, 'bytes')
    
    if (arrayBuffer.byteLength === 0) {
      throw new Error('Audio TTS vide reçu')
    }
    
    return arrayBuffer
  }

  async speechToText(audioBlob: Blob, language: string = 'fr'): Promise<string> {
    console.log('📝 STT Request:', { blobSize: audioBlob.size, blobType: audioBlob.type })
    
    if (audioBlob.size < 1000) {
      throw new Error('Audio trop court pour la transcription')
    }
    
    // Préparer le fichier audio avec le bon nom et extension
    const fileName = audioBlob.type.includes('webm') ? 'audio.webm' : 
                    audioBlob.type.includes('mp4') ? 'audio.mp4' : 
                    audioBlob.type.includes('ogg') ? 'audio.ogg' : 'audio.wav'
    
    const formData = new FormData()
    formData.append('file', audioBlob, fileName)
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'text')
    formData.append('language', language === 'auto' ? '' : language) // Language setting
    formData.append('temperature', '0') // Plus précis

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ STT API error:', response.status, response.statusText, errorText)
      
      if (response.status === 401) {
        throw new Error('Clé API OpenAI invalide ou expirée')
      } else if (response.status === 429) {
        throw new Error('Limite de taux API atteinte. Attendez un moment.')
      } else {
        throw new Error(`Erreur STT: ${response.status} ${response.statusText}`)
      }
    }

    const transcript = await response.text()
    const cleanTranscript = transcript.trim()
    console.log('✅ STT Response:', cleanTranscript)
    
    if (!cleanTranscript) {
      console.log('⚠️ Empty transcript received')
    }
    
    return cleanTranscript
  }

  async generateResponse(
    messages: ConversationMessage[],
    systemPrompt: string,
    userContext: UserContext,
    model: string = 'gpt-4',
    temperature: number = 0.7
  ): Promise<string> {
    const contextMessage = {
      role: 'system' as const,
      content: `${systemPrompt}\n\nUser Context:\n${this.formatUserContext(userContext)}`
    }

    const chatMessages = [
      contextMessage,
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ]

    console.log('🧠 Chat Request:', { 
      model, 
      temperature, 
      messagesCount: chatMessages.length,
      systemPromptLength: systemPrompt.length
    })

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        temperature,
        max_tokens: 1000
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Chat API error:', response.status, response.statusText, errorText)
      throw new Error(`Chat API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const responseContent = data.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse.'
    console.log('✅ Chat Response:', { 
      responseLength: responseContent.length,
      usage: data.usage 
    })
    
    return responseContent
  }

  private formatUserContext(context: UserContext): string {
    let formatted = `Current time: ${context.timestamp.toLocaleString()}\nTimezone: ${context.timezone}`
    
    if (context.location) {
      formatted += `\nLocation: ${context.location.latitude}, ${context.location.longitude}`
      if (context.location.city) formatted += `\nCity: ${context.location.city}`
      if (context.location.country) formatted += `\nCountry: ${context.location.country}`
    }
    
    return formatted
  }
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private stream: MediaStream | null = null
  private silenceDetection: boolean = false
  private silenceTimeout: NodeJS.Timeout | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null

  async startRecording(onSilenceDetected?: () => void): Promise<void> {
    try {
      console.log('🎤 Starting recording...')
      
      // Nettoyer les ressources précédentes
      this.cleanup()
      
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Optimiser pour Whisper
        }
      })
      
      // Configurer MediaRecorder avec un format compatible
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus'
      ]
      
      let mimeType = 'audio/webm'
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          break
        }
      }
      
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType })
      this.chunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data)
        }
      }
      
      this.mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event)
      }

      // Setup silence detection si demandé
      if (onSilenceDetected) {
        this.setupSilenceDetection(onSilenceDetected)
      }

      this.mediaRecorder.start(250) // Collecter des données toutes les 250ms
      console.log('✅ Recording started with mime type:', mimeType)
    } catch (error) {
      console.error('❌ Error starting recording:', error)
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        throw new Error('Accès au microphone refusé. Veuillez autoriser l\'accès au microphone.')
      } else if (error instanceof DOMException && error.name === 'NotFoundError') {
        throw new Error('Aucun microphone détecté. Vérifiez votre matériel audio.')
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
        throw new Error(`Erreur microphone: ${errorMessage}`)
      }
    }
  }

  private setupSilenceDetection(onSilenceDetected: () => void): void {
    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const source = this.audioContext.createMediaStreamSource(this.stream!)
      this.analyser = this.audioContext.createAnalyser()
      
      // Configuration optimisée pour la détection de silence
      this.analyser.fftSize = 512
      this.analyser.smoothingTimeConstant = 0.3
      source.connect(this.analyser)
      
      const bufferLength = this.analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      let silenceCount = 0
      const silenceThreshold = 15 // Seuil plus robuste
      const requiredSilenceChecks = 12 // ~3 secondes à 250ms par check
      
      const checkSilence = () => {
        if (!this.analyser || !this.silenceDetection) return
        
        this.analyser.getByteFrequencyData(dataArray)
        
        // Calculer le niveau audio moyen
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength
        
        if (average < silenceThreshold) {
          silenceCount++
          console.log(`🔇 Silence detected (${silenceCount}/${requiredSilenceChecks}), level: ${average.toFixed(1)}`)
          
          if (silenceCount >= requiredSilenceChecks) {
            console.log('🔇 3 seconds of silence - triggering callback')
            this.silenceDetection = false
            onSilenceDetected()
            return
          }
        } else {
          if (silenceCount > 0) {
            console.log(`🔊 Audio detected, resetting silence count (level: ${average.toFixed(1)})`)
          }
          silenceCount = 0
        }
        
        if (this.silenceDetection) {
          setTimeout(checkSilence, 250) // Vérifier toutes les 250ms
        }
      }
      
      this.silenceDetection = true
      console.log('✅ Silence detection started')
      setTimeout(checkSilence, 250) // Démarrer après un délai
    } catch (error) {
      console.warn('⚠️ Silence detection setup failed:', error)
      // Fallback: déclencher après 5 secondes sans détection
      setTimeout(() => {
        console.log('🔇 Fallback: triggering after 5 seconds')
        onSilenceDetected()
      }, 5000)
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'))
        return
      }

      console.log('🛑 Stopping recording...')
      this.silenceDetection = false
      
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout)
        this.silenceTimeout = null
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' })
        console.log('📦 Audio blob created:', blob.size, 'bytes')
        this.cleanup()
        resolve(blob)
      }

      this.mediaRecorder.stop()
    })
  }

  private cleanup(): void {
    console.log('🧹 Cleaning up recording resources...')
    this.silenceDetection = false
    
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout)
      this.silenceTimeout = null
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    this.mediaRecorder = null
    this.analyser = null
    this.chunks = []
  }
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null
  private currentSource: AudioBufferSourceNode | null = null

  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext()
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      const audioData = await this.audioContext.decodeAudioData(audioBuffer)
      
      if (this.currentSource) {
        this.currentSource.stop()
      }

      this.currentSource = this.audioContext.createBufferSource()
      this.currentSource.buffer = audioData
      this.currentSource.connect(this.audioContext.destination)

      return new Promise((resolve) => {
        if (this.currentSource) {
          this.currentSource.onended = () => resolve()
          this.currentSource.start()
        }
      })
    } catch (error) {
      throw new Error(`Failed to play audio: ${error}`)
    }
  }

  stop(): void {
    if (this.currentSource) {
      this.currentSource.stop()
      this.currentSource = null
    }
  }
}