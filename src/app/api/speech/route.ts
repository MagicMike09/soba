import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const getOpenAIClient = (apiKey: string) => {
  return new OpenAI({
    apiKey: apiKey,
  })
}

// POST endpoint for TTS (Text-to-Speech)
export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'alloy', apiKey } = await request.json()
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clé API OpenAI manquante' },
        { status: 400 }
      )
    }
    
    if (!text) {
      return NextResponse.json(
        { error: 'Texte manquant pour la synthèse vocale' },
        { status: 400 }
      )
    }

    const openai = getOpenAIClient(apiKey)
    
    console.log('🔊 TTS API: Generating speech for text:', text.substring(0, 50) + '...')
    
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
      response_format: "mp3",
      speed: 1.0
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())
    
    console.log('✅ TTS API: Generated audio buffer size:', buffer.length)
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'attachment; filename="speech.mp3"',
        "Content-Length": buffer.length.toString(),
      },
    })
    
  } catch (error: unknown) {
    console.error('❌ TTS API Error:', error)
    
    let errorMessage = 'Erreur lors de la génération audio'
    let statusCode = 500
    
    const errorObj = error as { status?: number; message?: string }
    
    if (errorObj.status === 400) {
      errorMessage = 'Paramètres invalides - Vérifiez le texte et la voix'
      statusCode = 400
    } else if (errorObj.status === 401) {
      errorMessage = 'Clé API OpenAI invalide ou expirée'
      statusCode = 401
    } else if (errorObj.status === 429) {
      errorMessage = 'Limite de taux OpenAI dépassée - Veuillez patienter'
      statusCode = 429
    }
    
    return NextResponse.json(
      { error: errorMessage, details: errorObj.message || 'Erreur inconnue' },
      { status: statusCode }
    )
  }
}