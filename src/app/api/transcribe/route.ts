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

    const openai = getOpenAIClient(apiKey)
    
    console.log('🎙️ STT API: Processing audio file:', audioFile.name, 'Size:', audioFile.size)
    
    // Convert File to format compatible with OpenAI
    const audioBuffer = await audioFile.arrayBuffer()
    const audioBlob = new Blob([audioBuffer], { type: audioFile.type })
    
    // Create a File object with proper name and extension
    const audioFileForAPI = new File([audioBlob], 'audio.webm', { 
      type: audioFile.type 
    })
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFileForAPI,
      model: "whisper-1",
      language: language === 'auto' ? undefined : language,
      response_format: "text",
    })
    
    console.log('✅ STT API: Transcription completed:', transcription.substring(0, 100) + '...')
    
    return NextResponse.json({
      transcript: transcription,
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