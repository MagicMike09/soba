import { supabase } from '@/lib/supabase'
import { UserContext } from '@/types'

interface ConversationMetrics {
  sessionId: string
  userContext?: UserContext | null
  llmModel?: string
  messages?: Array<{role: string, content: string}>
  durationSeconds?: number
  tokenCount?: number
  inputTokens?: number
  outputTokens?: number
  advisorContacted?: boolean
  advisorEmail?: string
}

export class AnalyticsService {
  private conversationSessions: Map<string, {
    startTime: number
    messageCount: number
    tokenCount: number
    messages: Array<{role: string, content: string, timestamp: string, tokens: number}>
  }> = new Map()

  /**
   * Démarre le tracking d'une nouvelle conversation
   */
  startConversation(sessionId: string, userContext?: UserContext | null): void {
    console.log('📊 Analytics: Starting conversation tracking:', sessionId)
    
    this.conversationSessions.set(sessionId, {
      startTime: Date.now(),
      messageCount: 0,
      tokenCount: 0,
      messages: []
    })

    // Créer l'entrée en base de données
    this.createConversationRecord(sessionId, userContext).catch(console.error)
  }

  /**
   * Ajoute un message à la conversation
   */
  addMessage(sessionId: string, message: { role: string, content: string }, tokenCount?: number): void {
    const session = this.conversationSessions.get(sessionId)
    if (!session) {
      console.warn('📊 Analytics: Session not found, starting new one:', sessionId)
      this.startConversation(sessionId)
      return this.addMessage(sessionId, message, tokenCount)
    }

    session.messageCount++
    session.messages.push({
      ...message,
      timestamp: new Date().toISOString(),
      tokens: tokenCount || 0
    })
    
    if (tokenCount) {
      session.tokenCount += tokenCount
    }

    console.log('📊 Analytics: Message added to session:', sessionId, 'Total messages:', session.messageCount)
  }

  /**
   * Termine une conversation et sauvegarde les métriques
   */
  async endConversation(sessionId: string, additionalData?: Partial<ConversationMetrics>): Promise<void> {
    const session = this.conversationSessions.get(sessionId)
    if (!session) {
      console.warn('📊 Analytics: No session found to end:', sessionId)
      return
    }

    const durationSeconds = Math.round((Date.now() - session.startTime) / 1000)
    
    console.log('📊 Analytics: Ending conversation:', sessionId, {
      duration: durationSeconds,
      messages: session.messageCount,
      tokens: session.tokenCount
    })

    // Calculer le coût estimé (GPT-4 pricing)
    const estimatedCost = this.calculateCost(session.tokenCount, additionalData?.llmModel || 'gpt-4')

    try {
      // Mettre à jour la base de données
      const { error } = await supabase
        .from('conversations')
        .update({
          duration_seconds: durationSeconds,
          message_count: session.messageCount,
          token_count: session.tokenCount,
          input_tokens: additionalData?.inputTokens || Math.round(session.tokenCount * 0.6),
          output_tokens: additionalData?.outputTokens || Math.round(session.tokenCount * 0.4),
          cost_usd: estimatedCost,
          messages: session.messages,
          conversation_summary: this.generateSummary(session.messages),
          llm_model: additionalData?.llmModel || 'gpt-4',
          advisor_contacted: additionalData?.advisorContacted || false,
          advisor_email: additionalData?.advisorEmail,
          status: 'completed'
        })
        .eq('session_id', sessionId)

      if (error) {
        console.error('📊 Analytics: Error updating conversation:', error)
      } else {
        console.log('📊 Analytics: Conversation saved successfully')
      }
    } catch (error) {
      console.error('📊 Analytics: Failed to save conversation:', error)
    }

    // Nettoyer la session locale
    this.conversationSessions.delete(sessionId)
  }

  /**
   * Met à jour les informations d'un conseiller contacté
   */
  async updateAdvisorContact(sessionId: string, advisorEmail: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          advisor_contacted: true,
          advisor_email: advisorEmail
        })
        .eq('session_id', sessionId)

      if (error) {
        console.error('📊 Analytics: Error updating advisor contact:', error)
      } else {
        console.log('📊 Analytics: Advisor contact updated:', advisorEmail)
      }
    } catch (error) {
      console.error('📊 Analytics: Failed to update advisor contact:', error)
    }
  }

  /**
   * Crée l'enregistrement initial de conversation
   */
  private async createConversationRecord(sessionId: string, userContext?: UserContext | null): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .insert({
          session_id: sessionId,
          user_location: userContext?.location ? {
            city: userContext.location.city,
            country: userContext.location.country,
            latitude: userContext.location.latitude,
            longitude: userContext.location.longitude
          } : null,
          status: 'active'
        })

      if (error) {
        console.error('📊 Analytics: Error creating conversation record:', error)
      }
    } catch (error) {
      console.error('📊 Analytics: Failed to create conversation record:', error)
    }
  }

  /**
   * Calcule le coût estimé basé sur le nombre de tokens
   */
  private calculateCost(tokenCount: number, model: string): number {
    // Prix au 1K tokens (mise à jour décembre 2024)
    const pricing: Record<string, { input: number, output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 }
    }

    const modelPricing = pricing[model] || pricing['gpt-4']
    const inputTokens = Math.round(tokenCount * 0.6) // Estimation 60% input
    const outputTokens = Math.round(tokenCount * 0.4) // Estimation 40% output

    return ((inputTokens * modelPricing.input) + (outputTokens * modelPricing.output)) / 1000
  }

  /**
   * Génère un résumé de conversation
   */
  private generateSummary(messages: Array<{role: string, content: string}>): string {
    if (messages.length === 0) return 'Conversation vide'
    
    const userMessages = messages.filter(m => m.role === 'user').length
    const assistantMessages = messages.filter(m => m.role === 'assistant').length
    const systemMessages = messages.filter(m => m.role === 'system').length

    return `Conversation avec ${userMessages} message(s) utilisateur, ${assistantMessages} réponse(s) assistant, ${systemMessages} message(s) système`
  }

  /**
   * Génère un ID de session unique
   */
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Récupère les métriques actuelles d'une session
   */
  getSessionMetrics(sessionId: string): { messageCount: number, tokenCount: number, duration: number } | null {
    const session = this.conversationSessions.get(sessionId)
    if (!session) return null

    return {
      messageCount: session.messageCount,
      tokenCount: session.tokenCount,
      duration: Math.round((Date.now() - session.startTime) / 1000)
    }
  }
}

// Instance singleton
export const analyticsService = new AnalyticsService()