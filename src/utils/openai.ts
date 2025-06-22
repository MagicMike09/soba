import { ConversationMessage, UserContext } from '@/types'

export class OpenAIService {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async textToSpeech(text: string, voice: string = 'alloy'): Promise<ArrayBuffer> {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'mp3'
      }),
    })

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.statusText}`)
    }

    return response.arrayBuffer()
  }

  async speechToText(audioBlob: Blob): Promise<string> {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'text')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`STT API error: ${response.statusText}`)
    }

    return response.text()
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
      throw new Error(`Chat API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
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

  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.mediaRecorder = new MediaRecorder(this.stream)
      this.chunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        this.chunks.push(event.data)
      }

      this.mediaRecorder.start()
    } catch (error) {
      throw new Error(`Failed to start recording: ${error}`)
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'))
        return
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' })
        this.cleanup()
        resolve(blob)
      }

      this.mediaRecorder.stop()
    })
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    this.mediaRecorder = null
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