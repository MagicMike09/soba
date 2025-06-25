import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const getOpenAIClient = (apiKey: string) => {
  return new OpenAI({
    apiKey: apiKey,
  })
}

// POST endpoint for STT (Speech-to-Text)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const apiKey = formData.get('apiKey') as string
    const language = formData.get('language') as string || 'fr'
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clé API OpenAI manquante' },
        { status: 400 }
      )
    }
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'Fichier audio manquant' },
        { status: 400 }
      )
    }
    
    // Validate file size (OpenAI limit is 25MB)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Fichier audio trop volumineux (max 25MB)' },
        { status: 400 }
      )
    }
    
    // Validate file is not empty
    if (audioFile.size < 1000) {
      return NextResponse.json(
        { error: 'Fichier audio trop petit' },
        { status: 400 }
      )
    }

    const openai = getOpenAIClient(apiKey)
    
    console.log('🎙️ STT API: Processing audio file:', audioFile.name, 'Size:', audioFile.size, 'Type:', audioFile.type)
    
    // Convert File to format compatible with OpenAI Whisper
    const audioBuffer = await audioFile.arrayBuffer()
    
    // Ensure proper MIME type for Whisper compatibility
    let mimeType = audioFile.type
    let fileName = 'audio.webm'
    
    if (audioFile.type.includes('webm')) {
      mimeType = 'audio/webm'
      fileName = 'audio.webm'
    } else if (audioFile.type.includes('mp4')) {
      mimeType = 'audio/mp4'
      fileName = 'audio.mp4'
    } else if (audioFile.type.includes('wav')) {
      mimeType = 'audio/wav'
      fileName = 'audio.wav'
    } else {
      // Force WebM for compatibility
      mimeType = 'audio/webm'
      fileName = 'audio.webm'
    }
    
    console.log('🎙️ Audio conversion:', { 
      originalType: audioFile.type, 
      finalType: mimeType, 
      fileName, 
      size: audioBuffer.byteLength 
    })
    
    const audioFileForAPI = new File([audioBuffer], fileName, { 
      type: mimeType 
    })
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFileForAPI,
      model: "whisper-1",
      language: language === 'auto' ? undefined : language,
      response_format: "text"
      // Paramètres par défaut pour meilleure précision
    })
    
    console.log('✅ STT API: Transcription completed:', {
      text: transcription,
      length: transcription?.length,
      type: typeof transcription
    })
    
    return NextResponse.json({
      transcript: transcription || '',
      language: language,
      success: true
    })
    
  } catch (error: unknown) {
    console.error('❌ STT API Error:', error)
    
    let errorMessage = 'Erreur lors de la transcription audio'
    let statusCode = 500
    
    const errorObj = error as { status?: number; message?: string }
    
    if (errorObj.status === 400) {
      errorMessage = 'Fichier audio invalide - Vérifiez le format et la taille'
      statusCode = 400
    } else if (errorObj.status === 401) {
      errorMessage = 'Clé API OpenAI invalide ou expirée'
      statusCode = 401
    } else if (errorObj.status === 429) {
      errorMessage = 'Limite de taux OpenAI dépassée - Veuillez patienter'
      statusCode = 429
    }
    
    return NextResponse.json(
      { error: errorMessage, details: errorObj.message || 'Erreur inconnue', success: false },
      { status: statusCode }
    )
  }
}