'use client'

import React, { useState } from 'react'
import { AudioAPI, SimpleAudioRecorder } from '@/utils/audioAPI'

interface ConversationTestProps {
  apiKey: string
  onTranscript?: (text: string) => void
  onResponse?: (text: string) => void
}

const ConversationTest: React.FC<ConversationTestProps> = ({ 
  apiKey, 
  onTranscript, 
  onResponse 
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')
  
  const [audioAPI] = useState(() => new AudioAPI(apiKey))
  const [recorder] = useState(() => new SimpleAudioRecorder())

  const handleStartRecording = async () => {
    try {
      setError('')
      setIsRecording(true)
      await recorder.startRecording()
      console.log('🎤 ConversationTest: Recording started')
    } catch (error: unknown) {
      setError(AudioAPI.handleAPIError(error))
      setIsRecording(false)
    }
  }

  const handleStopRecording = async () => {
    try {
      setIsProcessing(true)
      setIsRecording(false)
      
      const audioBlob = await recorder.stopRecording()
      console.log('🎵 ConversationTest: Got audio blob:', audioBlob.size)
      
      // STT - Speech to Text
      console.log('📝 ConversationTest: Converting speech to text...')
      const transcriptResult = await audioAPI.speechToText(audioBlob, 'fr')
      
      setTranscript(transcriptResult)
      onTranscript?.(transcriptResult)
      
      setIsProcessing(false)
      
    } catch (error: unknown) {
      setError(AudioAPI.handleAPIError(error))
      setIsProcessing(false)
    }
  }

  const handlePlayResponse = async (text: string) => {
    try {
      setError('')
      setIsPlaying(true)
      
      console.log('🔊 ConversationTest: Generating TTS for:', text.substring(0, 50) + '...')
      
      // TTS - Text to Speech
      const audioBuffer = await audioAPI.textToSpeech(text, 'alloy')
      
      // Play audio
      await audioAPI.playAudioBuffer(audioBuffer)
      
      setIsPlaying(false)
      
    } catch (error: unknown) {
      setError(AudioAPI.handleAPIError(error))
      setIsPlaying(false)
    }
  }

  const handleTestTTS = () => {
    const testText = response || 'Bonjour ! Je suis votre assistant virtuel. Comment puis-je vous aider aujourd\'hui ?'
    setResponse(testText)
    onResponse?.(testText)
    handlePlayResponse(testText)
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4 text-center">🎙️ Test Conversation</h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* STT Test */}
      <div className="mb-6">
        <h4 className="font-medium mb-2">🎤 Speech-to-Text</h4>
        <div className="flex gap-2 mb-3">
          <button
            onClick={handleStartRecording}
            disabled={isRecording || isProcessing}
            className={`px-4 py-2 rounded font-medium ${
              isRecording 
                ? 'bg-red-500 text-white' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isRecording ? '🔴 Enregistrement...' : '🎤 Commencer'}
          </button>
          
          <button
            onClick={handleStopRecording}
            disabled={!isRecording || isProcessing}
            className="px-4 py-2 bg-gray-500 text-white rounded font-medium hover:bg-gray-600 disabled:opacity-50"
          >
            {isProcessing ? '⏳ Traitement...' : '⏹️ Arrêter'}
          </button>
        </div>
        
        {transcript && (
          <div className="bg-gray-100 p-3 rounded">
            <strong>Transcription :</strong>
            <p className="mt-1">{transcript}</p>
          </div>
        )}
      </div>
      
      {/* TTS Test */}
      <div className="mb-4">
        <h4 className="font-medium mb-2">🔊 Text-to-Speech</h4>
        <div className="flex gap-2 mb-3">
          <button
            onClick={handleTestTTS}
            disabled={isPlaying}
            className={`px-4 py-2 rounded font-medium ${
              isPlaying 
                ? 'bg-orange-500 text-white' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isPlaying ? '🔊 Lecture...' : '🔊 Test Audio'}
          </button>
        </div>
        
        {response && (
          <div className="bg-gray-100 p-3 rounded">
            <strong>Réponse :</strong>
            <p className="mt-1">{response}</p>
          </div>
        )}
      </div>
      
      {/* Status */}
      <div className="text-sm text-gray-600 text-center">
        {isRecording && '🎤 En cours d\'enregistrement...'}
        {isProcessing && '⏳ Traitement de l\'audio...'}
        {isPlaying && '🔊 Lecture de l\'audio...'}
        {!isRecording && !isProcessing && !isPlaying && '✅ Prêt'}
      </div>
    </div>
  )
}

export default ConversationTest