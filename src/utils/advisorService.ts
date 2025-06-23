import * as emailjs from '@emailjs/browser'
import { Advisor, UserContext } from '@/types'

// Service pour gérer les communications avec les conseillers
export class AdvisorService {
  private serviceId: string
  private templateId: string
  private publicKey: string

  constructor() {
    this.serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || ''
    this.templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || ''
    this.publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || ''
  }

  /**
   * Envoie un email automatique au conseiller sélectionné
   */
  async sendEmailToAdvisor(
    advisor: Advisor, 
    userContext: UserContext | null,
    conversationSummary?: string
  ): Promise<boolean> {
    try {
      if (!this.serviceId || !this.templateId || !this.publicKey) {
        console.warn('⚠️ EmailJS configuration missing')
        return false
      }

      console.log('📧 AdvisorService: Sending email to advisor:', advisor.email)

      // Préparer le contexte utilisateur pour l'email
      const contextText = userContext ? `
📍 Localisation: ${userContext.location?.city || 'Non définie'}, ${userContext.location?.country || ''}
🕐 Heure de contact: ${userContext.timestamp.toLocaleString('fr-FR')}
🌐 Fuseau horaire: ${userContext.timezone}
📡 Coordonnées: ${userContext.location?.latitude?.toFixed(4) || 'N/A'}, ${userContext.location?.longitude?.toFixed(4) || 'N/A'}
      `.trim() : 'Contexte utilisateur non disponible'

      const emailParams = {
        // Informations conseiller
        advisor_name: `${advisor.firstName} ${advisor.lastName}`,
        advisor_email: advisor.email,
        advisor_phone: advisor.phone,
        advisor_position: advisor.position,
        
        // Contexte utilisateur
        user_context: contextText,
        contact_time: new Date().toLocaleString('fr-FR'),
        
        // Résumé de conversation si disponible
        conversation_summary: conversationSummary || 'Demande de contact via l\'assistant virtuel',
        
        // Informations système
        system_timestamp: new Date().toISOString(),
        urgency_level: 'Normal'
      }

      await emailjs.send(
        this.serviceId,
        this.templateId,
        emailParams,
        this.publicKey
      )

      console.log('✅ AdvisorService: Email sent successfully to', advisor.email)
      return true

    } catch (error) {
      console.error('❌ AdvisorService: Email sending failed:', error)
      return false
    }
  }

  /**
   * Initie un appel WebRTC avec le conseiller (simulation)
   */
  async initiateCall(advisor: Advisor): Promise<{
    success: boolean
    callId?: string
    status: string
  }> {
    try {
      console.log('📞 AdvisorService: Initiating call with advisor:', advisor.firstName, advisor.lastName)

      // Simulation d'un appel WebRTC
      const callId = `call_${Date.now()}_${advisor.id}`
      
      // Dans un vrai système, ici on ferait:
      // 1. Connexion WebRTC
      // 2. Signal au conseiller via WebSocket
      // 3. Gestion des états d'appel
      
      return new Promise((resolve) => {
        // Simuler une tentative d'appel avec différents résultats possibles
        const outcomes = [
          { success: true, status: 'Conseiller contacté avec succès' },
          { success: false, status: 'Conseiller occupé, veuillez réessayer' },
          { success: false, status: 'Conseiller non disponible actuellement' }
        ]
        
        // Simuler un délai de connexion
        setTimeout(() => {
          const outcome = outcomes[Math.floor(Math.random() * outcomes.length)]
          resolve({
            ...outcome,
            callId: outcome.success ? callId : undefined
          })
        }, 2000 + Math.random() * 3000) // 2-5 secondes
      })

    } catch (error) {
      console.error('❌ AdvisorService: Call initiation failed:', error)
      return {
        success: false,
        status: 'Erreur technique lors de l\'appel'
      }
    }
  }

  /**
   * Surveille le statut d'un appel en cours
   */
  async monitorCallStatus(callId: string): Promise<{
    status: 'connecting' | 'connected' | 'failed' | 'ended'
    duration?: number
  }> {
    try {
      console.log('🔍 AdvisorService: Monitoring call status for:', callId)
      
      // Simulation du monitoring d'appel
      return new Promise((resolve) => {
        const statuses = ['connecting', 'connected', 'failed', 'ended'] as const
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
        
        setTimeout(() => {
          resolve({
            status: randomStatus,
            duration: randomStatus === 'connected' ? Math.floor(Math.random() * 300) : undefined
          })
        }, 1000)
      })

    } catch (error) {
      console.error('❌ AdvisorService: Call monitoring failed:', error)
      return { status: 'failed' }
    }
  }

  /**
   * Envoie une notification de suivi au conseiller
   */
  async sendFollowUpNotification(
    advisor: Advisor,
    callResult: 'completed' | 'missed' | 'failed',
    duration?: number
  ): Promise<boolean> {
    try {
      console.log('📨 AdvisorService: Sending follow-up notification to:', advisor.email)

      if (!this.serviceId || !this.templateId || !this.publicKey) {
        return false
      }

      const followUpParams = {
        advisor_name: `${advisor.firstName} ${advisor.lastName}`,
        advisor_email: advisor.email,
        call_result: callResult,
        call_duration: duration ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}` : 'N/A',
        follow_up_time: new Date().toLocaleString('fr-FR'),
        next_action: callResult === 'missed' ? 'Rappel client recommandé' : 'Suivi standard'
      }

      await emailjs.send(
        this.serviceId,
        `${this.templateId}_followup`, // Template spécifique pour le suivi
        followUpParams,
        this.publicKey
      )

      console.log('✅ AdvisorService: Follow-up notification sent')
      return true

    } catch (error) {
      console.error('❌ AdvisorService: Follow-up notification failed:', error)
      return false
    }
  }

  /**
   * Valide la configuration EmailJS
   */
  isConfigured(): boolean {
    return !!(this.serviceId && this.templateId && this.publicKey)
  }

  /**
   * Récupère les statistiques d'envoi d'emails
   */
  getEmailStats(): {
    configured: boolean
    serviceId: string
    hasTemplate: boolean
    hasPublicKey: boolean
  } {
    return {
      configured: this.isConfigured(),
      serviceId: this.serviceId ? `${this.serviceId.substring(0, 8)}...` : 'Non configuré',
      hasTemplate: !!this.templateId,
      hasPublicKey: !!this.publicKey
    }
  }
}