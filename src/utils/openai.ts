import { ConversationMessage, UserContext } from '@/types'

export class OpenAIService {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async textToSpeech(text: string, voice: string = 'alloy'): Promise<ArrayBuffer> {
    console.log('🔊 TTS Request:', { textLength: text.length, voice, model: 'tts-1' })
    
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text.substring(0, 4000), // Limit to 4000 chars to avoid API limits
        voice: voice,
        response_format: 'mp3'
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ TTS API error:', response.status, response.statusText, errorText)
      throw new Error(`TTS API error: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    console.log('✅ TTS Response received, size:', arrayBuffer.byteLength, 'bytes')
    return arrayBuffer
  }

  async speechToText(audioBlob: Blob): Promise<string> {
    console.log('📝 STT Request:', { blobSize: audioBlob.size, blobType: audioBlob.type })
    
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'text')
    formData.append('language', 'fr') // Force French for better recognition

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
      throw new Error(`STT API error: ${response.status} ${response.statusText}`)
    }

    const transcript = await response.text()
    console.log('✅ STT Response:', transcript)
    return transcript
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
      console.log('🎤 Starting recording with silence detection...')
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      // Setup silence detection
      if (onSilenceDetected) {
        this.setupSilenceDetection(onSilenceDetected)
      }
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      this.chunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data)
        }
      }

      this.mediaRecorder.start(100) // Collect data every 100ms for real-time processing
      console.log('✅ Recording started successfully')
    } catch (error) {
      console.error('❌ Error starting recording:', error)
      throw new Error(`Failed to start recording: ${error}`)
    }
  }

  private setupSilenceDetection(onSilenceDetected: () => void): void {
    try {
      this.audioContext = new AudioContext()
      const source = this.audioContext.createMediaStreamSource(this.stream!)
      this.analyser = this.audioContext.createAnalyser()
      
      this.analyser.fftSize = 256
      source.connect(this.analyser)
      
      const bufferLength = this.analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      const checkSilence = () => {
        if (!this.analyser || !this.silenceDetection) return
        
        this.analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / bufferLength
        
        if (average < 10) { // Threshold for silence
          if (!this.silenceTimeout) {
            this.silenceTimeout = setTimeout(() => {
              console.log('🔇 Silence detected - stopping recording')
              onSilenceDetected()
            }, 3000) // 3 seconds of silence
          }
        } else {
          if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout)
            this.silenceTimeout = null
          }
        }
        
        if (this.silenceDetection) {
          requestAnimationFrame(checkSilence)
        }
      }
      
      this.silenceDetection = true
      checkSilence()
    } catch (error) {
      console.warn('⚠️ Silence detection setup failed:', error)
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