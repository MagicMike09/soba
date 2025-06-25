/**
 * Enregistreur audio amélioré avec détection de silence intelligente
 * Optimisé pour STT et conversations fluides
 */
export class EnhancedAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private silenceDetectionTimer: NodeJS.Timeout | null = null
  private lastSoundTime: number = 0
  private isListeningForSilence: boolean = false
  private onSilenceDetected?: () => void
  private isInitialized: boolean = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    try {
      console.log('🎤 EnhancedAudioRecorder: Initializing...')
      
      // Configuration audio optimisée pour précision STT
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,  // Nettoyer l'audio
          noiseSuppression: true,  // Éliminer bruit de fond
          autoGainControl: true,   // Normaliser le volume
          sampleRate: 48000,       // Haute qualité pour précision
          channelCount: 1          // Mono pour STT
        } 
      })
      
      // Setup audio analysis pour détection de silence
      this.audioContext = new AudioContext({ sampleRate: 48000 })
      const source = this.audioContext.createMediaStreamSource(this.stream)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 2048 // Équilibré pour performance
      this.analyser.smoothingTimeConstant = 0.8 // Plus stable
      source.connect(this.analyser)
      
      this.isInitialized = true
      console.log('✅ EnhancedAudioRecorder: Initialized successfully')
      
    } catch (error) {
      console.error('❌ EnhancedAudioRecorder: Initialization error:', error)
      throw new Error('Impossible d\'accéder au microphone. Autorisez l\'accès et rechargez la page.')
    }
  }

  async startRecording(options?: { 
    silenceThreshold?: number
    silenceTimeout?: number 
    onSilenceDetected?: () => void
    maxRecordingTime?: number
  }): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (!this.stream) {
      throw new Error('Stream audio non disponible')
    }

    try {
      console.log('🎤 EnhancedAudioRecorder: Starting recording...')
      
      this.audioChunks = []
      
      // Configuration MediaRecorder pour compatibilité Whisper
      let mimeType = 'audio/webm'
      
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm'
      }
      
      console.log('🎙️ Using MIME type:', mimeType)
        
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 320000 // Très haute qualité pour précision STT
      })
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }
      
      // Sécurité: arrêt automatique après temps maximum
      if (options?.maxRecordingTime) {
        setTimeout(() => {
          if (this.isRecording()) {
            console.log('⏰ EnhancedAudioRecorder: Max recording time reached')
            this.stopRecording()
          }
        }, options.maxRecordingTime)
      }
      
      // Démarrer la détection de silence si demandée
      if (options?.onSilenceDetected) {
        this.onSilenceDetected = options.onSilenceDetected
        this.startSilenceDetection(
          options.silenceThreshold || -45, // dB
          options.silenceTimeout || 1500    // ms
        )
      }
      
      this.mediaRecorder.start(100) // Enregistrement par chunks de 100ms pour plus de réactivité
      console.log('✅ EnhancedAudioRecorder: Recording started')
      
    } catch (error) {
      console.error('❌ EnhancedAudioRecorder: Start error:', error)
      throw error
    }
  }

  private startSilenceDetection(silenceThreshold: number, silenceTimeout: number): void {
    if (!this.analyser) return
    
    this.isListeningForSilence = true
    this.lastSoundTime = Date.now()
    
    const checkAudioLevel = () => {
      if (!this.analyser || !this.isListeningForSilence) return
      
      const bufferLength = this.analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      this.analyser.getByteFrequencyData(dataArray)
      
      // Calculer le niveau audio avec détection intelligente de parole
      let sum = 0
      let peakCount = 0
      let strongPeakCount = 0
      
      for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] > 0) {
          sum += dataArray[i]
          if (dataArray[i] > 40) peakCount++ // Seuil modéré pour activité audio
          if (dataArray[i] > 80) strongPeakCount++ // Seuil élevé pour vraie parole
        }
      }
      
      const average = sum / bufferLength
      const decibels = average > 0 ? 20 * Math.log10(average / 255) : -100
      
      // Détection intelligente: nécessite à la fois niveau ET pics significatifs
      const hasAudioActivity = decibels > silenceThreshold
      const hasSpeechPeaks = strongPeakCount > bufferLength * 0.05 // 5% de pics forts requis
      const hasSpeech = hasAudioActivity && hasSpeechPeaks
      
      // Logging détaillé pour debug
      if (Math.random() < 0.1) { // Log 10% du temps pour éviter spam
        console.log(`🎤 Level: ${decibels.toFixed(1)}dB, Peaks: ${peakCount}, Strong: ${strongPeakCount}, Threshold: ${silenceThreshold}dB, Speech: ${hasSpeech}`)
      }
      
      if (hasSpeech) {
        // Son significatif détecté
        this.lastSoundTime = Date.now()
        if (Math.random() < 0.2) { // Log parfois quand parole détectée
          console.log('🗣️ Speech detected!')
        }
      } else {
        // Vérifier si le silence dure assez longtemps
        const silenceDuration = Date.now() - this.lastSoundTime
        if (silenceDuration > silenceTimeout) {
          console.log(`🔇 EnhancedAudioRecorder: Silence detected (${silenceDuration}ms), auto-stopping...`)
          this.isListeningForSilence = false
          this.onSilenceDetected?.()
          return
        }
      }
      
      // Continuer la détection avec fréquence adaptative
      const checkInterval = hasSpeech ? 50 : 150 // Plus fréquent pendant la parole
      this.silenceDetectionTimer = setTimeout(checkAudioLevel, checkInterval)
    }
    
    checkAudioLevel()
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      // Arrêter la détection de silence
      this.isListeningForSilence = false
      if (this.silenceDetectionTimer) {
        clearTimeout(this.silenceDetectionTimer)
        this.silenceDetectionTimer = null
      }

      if (!this.mediaRecorder) {
        reject(new Error('Enregistrement non démarré'))
        return
      }

      this.mediaRecorder.onstop = () => {
        console.log('✅ EnhancedAudioRecorder: Recording stopped')
        
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
        console.log('🎵 EnhancedAudioRecorder: Audio blob size:', audioBlob.size)
        
        resolve(audioBlob)
      }

      this.mediaRecorder.stop()
    })
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }

  cleanup(): void {
    this.isListeningForSilence = false
    if (this.silenceDetectionTimer) {
      clearTimeout(this.silenceDetectionTimer)
      this.silenceDetectionTimer = null
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    this.isInitialized = false
    console.log('🧹 EnhancedAudioRecorder: Cleanup completed')
  }

  // Méthode pour vérifier le niveau audio en temps réel (debug)
  getCurrentAudioLevel(): number {
    if (!this.analyser) return -100
    
    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    this.analyser.getByteFrequencyData(dataArray)
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength
    return average > 0 ? 20 * Math.log10(average / 255) : -100
  }
}