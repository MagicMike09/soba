import { AnimationState } from '@/types'

export class AnimationService {
  private static greetingWords = [
    'bonjour', 'bonsoir', 'salut', 'hello', 'hi', 'hey', 'coucou', 'bonsoir'
  ]

  private static farewellWords = [
    'au revoir', 'bye', 'goodbye', 'à bientôt', 'adieu', 'salut', 'tchao', 'ciao'
  ]

  private static thinkingWords = [
    'laisse-moi réfléchir', 'je réfléchis', 'hmm', 'je pense', 'attendez', 
    'voyons voir', 'en fait', 'peut-être', 'je me demande'
  ]

  private static questionWords = [
    'comment', 'pourquoi', 'quand', 'où', 'qui', 'quoi', 'que', 'quel'
  ]

  /**
   * Analyser le contenu d'un message pour déterminer l'animation appropriée
   */
  static analyzeMessage(content: string, context: 'user' | 'assistant' | 'system'): AnimationState {
    const lowerContent = content.toLowerCase().trim()

    // Messages système
    if (context === 'system') {
      if (lowerContent.includes('conversation arrêtée') || 
          lowerContent.includes('fin de') || 
          lowerContent.includes('terminé')) {
        return 'bye'
      }
      if (lowerContent.includes('conversation démarré') || 
          lowerContent.includes('bienvenue') ||
          lowerContent.includes('bonjour')) {
        return 'hello'
      }
      return 'idle'
    }

    // Messages utilisateur
    if (context === 'user') {
      // Vérifier les salutations
      if (this.containsWords(lowerContent, this.greetingWords)) {
        return 'hello'
      }

      // Vérifier les adieux
      if (this.containsWords(lowerContent, this.farewellWords)) {
        return 'bye'
      }

      // Si l'utilisateur pose une question
      if (this.containsWords(lowerContent, this.questionWords) || lowerContent.includes('?')) {
        return 'listening'
      }

      return 'listening'
    }

    // Messages de l'assistant
    if (context === 'assistant') {
      // Vérifier les salutations en début de message
      if (this.containsWords(lowerContent, this.greetingWords)) {
        return 'hello'
      }

      // Vérifier les adieux
      if (this.containsWords(lowerContent, this.farewellWords)) {
        return 'bye'
      }

      // Vérifier les expressions de réflexion
      if (this.containsWords(lowerContent, this.thinkingWords)) {
        return 'thinking'
      }

      // Message normal de l'assistant
      return 'talking'
    }

    return 'idle'
  }

  /**
   * Analyser le contexte de la conversation pour ajuster l'animation
   */
  static analyzeConversationState(
    isRecording: boolean,
    isProcessing: boolean,
    lastMessage?: { role: string; content: string },
    conversationStarted?: boolean
  ): AnimationState {
    
    // États prioritaires
    if (isRecording) {
      return 'listening'
    }

    if (isProcessing) {
      return 'thinking'
    }

    // Si conversation vient de commencer
    if (conversationStarted) {
      return 'hello'
    }

    // Analyser le dernier message si disponible
    if (lastMessage) {
      return this.analyzeMessage(
        lastMessage.content, 
        lastMessage.role as 'user' | 'assistant' | 'system'
      )
    }

    return 'idle'
  }

  /**
   * Créer une séquence d'animations temporelles
   */
  static createAnimationSequence(
    initialState: AnimationState,
    duration: number = 3000
  ): { state: AnimationState; duration: number }[] {
    
    const sequence: { state: AnimationState; duration: number }[] = []

    switch (initialState) {
      case 'hello':
        sequence.push(
          { state: 'hello', duration: 2000 },
          { state: 'idle', duration: duration - 2000 }
        )
        break

      case 'bye':
        sequence.push(
          { state: 'bye', duration: 2000 },
          { state: 'idle', duration: duration - 2000 }
        )
        break

      case 'talking':
        sequence.push(
          { state: 'talking', duration: duration }
        )
        break

      case 'thinking':
        sequence.push(
          { state: 'thinking', duration: Math.min(duration, 4000) },
          { state: 'idle', duration: Math.max(0, duration - 4000) }
        )
        break

      default:
        sequence.push({ state: initialState, duration })
    }

    return sequence.filter(item => item.duration > 0)
  }

  /**
   * Vérifier si le contenu contient certains mots
   */
  private static containsWords(content: string, words: string[]): boolean {
    return words.some(word => 
      content.includes(word) || 
      content.split(' ').some(w => w === word)
    )
  }

  /**
   * Obtenir l'animation par défaut selon l'heure
   */
  static getTimeBasedGreeting(): AnimationState {
    const hour = new Date().getHours()
    
    if (hour >= 6 && hour < 12) {
      return 'hello' // Matin
    } else if (hour >= 18 && hour < 22) {
      return 'hello' // Soir
    }
    
    return 'idle' // Nuit/après-midi
  }
}