import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const getOpenAIClient = (apiKey: string) => {
  return new OpenAI({
    apiKey: apiKey,
  })
}

// POST endpoint for LLM Chat Completion
export async function POST(request: NextRequest) {
  try {
    const { 
      messages, 
      systemPrompt, 
      model = 'gpt-4', 
      temperature = 0.7, 
      apiKey,
      userContext 
    } = await request.json()
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clé API OpenAI manquante' },
        { status: 400 }
      )
    }
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages manquants ou format invalide' },
        { status: 400 }
      )
    }

    const openai = getOpenAIClient(apiKey)
    
    console.log('🧠 Chat API: Generating response for', messages.length, 'messages')
    
    // Prepare messages for OpenAI
    const formattedMessages = [
      {
        role: 'system' as const,
        content: systemPrompt || 'Tu es un assistant virtuel français professionnel et serviable.'
      },
      ...messages.map((msg: { role: 'user' | 'assistant'; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ]
    
    // Add user context to system message if provided
    if (userContext) {
      formattedMessages[0].content += `\n\nCONTEXTE UTILISATEUR:\n${JSON.stringify(userContext, null, 2)}`
    }
    
    const completion = await openai.chat.completions.create({
      model: model,
      messages: formattedMessages,
      temperature: temperature,
      max_tokens: 1500,
      stream: false
    })

    const responseContent = completion.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.'
    
    console.log('✅ Chat API: Response generated:', responseContent.substring(0, 100) + '...')
    
    return NextResponse.json({
      response: responseContent,
      model: model,
      usage: completion.usage,
      success: true
    })
    
  } catch (error: unknown) {
    console.error('❌ Chat API Error:', error)
    
    let errorMessage = 'Erreur lors de la génération de réponse'
    let statusCode = 500
    
    const errorObj = error as { status?: number; message?: string }
    
    if (errorObj.status === 400) {
      errorMessage = 'Paramètres invalides - Vérifiez les messages et le modèle'
      statusCode = 400
    } else if (errorObj.status === 401) {
      errorMessage = 'Clé API OpenAI invalide ou expirée'
      statusCode = 401
    } else if (errorObj.status === 429) {
      errorMessage = 'Limite de taux OpenAI dépassée - Veuillez patienter'
      statusCode = 429
    } else if (errorObj.status === 402) {
      errorMessage = 'Quota OpenAI insuffisant - Vérifiez votre facturation'
      statusCode = 402
    }
    
    return NextResponse.json(
      { error: errorMessage, details: errorObj.message || 'Erreur inconnue', success: false },
      { status: statusCode }
    )
  }
}