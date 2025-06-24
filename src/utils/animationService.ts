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
   * Basé sur les actions Blender : Idle, Hello, Talk, Think, Bye
   */
  static analyzeMessage(content: string, context: 'user' | 'assistant' | 'system'): AnimationState {
    const lowerContent = content.toLowerCase().trim()

    console.log('🎬 AnimationService analyzing:', context, content)

    // Messages système
    if (context === 'system') {
      if (lowerContent.includes('conversation arrêtée') || 
          lowerContent.includes('au revoir') ||
          lowerContent.includes('fin de') || 
          lowerContent.includes('terminé')) {
        console.log('🎬 System message → bye')
        return 'bye'
      }
      if (lowerContent.includes('conversation démarré') || 
          lowerContent.includes('bienvenue') ||
          lowerContent.includes('bonjour') ||
          lowerContent.includes('je vous écoute')) {
        console.log('🎬 System message → hello')
        return 'hello'
      }
      console.log('🎬 System message → idle')
      return 'idle'
    }

    // Messages utilisateur - l'IA doit écouter (idle) car l'utilisateur parle
    if (context === 'user') {
      // Vérifier les salutations pour répondre avec hello
      if (this.containsWords(lowerContent, this.greetingWords)) {
        console.log('🎬 User greeting → hello')
        return 'hello'
      }

      // Vérifier les adieux pour répondre avec bye
      if (this.containsWords(lowerContent, this.farewellWords)) {
        console.log('🎬 User farewell → bye')
        return 'bye'
      }

      // Utilisateur parle normalement - avatar écoute (idle)
      console.log('🎬 User speaking → idle (listening)')
      return 'idle'
    }

    // Messages de l'assistant - l'IA parle (talk)
    if (context === 'assistant') {
      // Vérifier les salutations en début de message
      if (this.containsWords(lowerContent, this.greetingWords)) {
        console.log('🎬 Assistant greeting → hello')
        return 'hello'
      }

      // Vérifier les adieux
      if (this.containsWords(lowerContent, this.farewellWords)) {
        console.log('🎬 Assistant farewell → bye')
        return 'bye'
      }

      // Vérifier les expressions de réflexion
      if (this.containsWords(lowerContent, this.thinkingWords)) {
        console.log('🎬 Assistant thinking → thinking')
        return 'thinking'
      }

      // Message normal de l'assistant - animation talk
      console.log('🎬 Assistant speaking → talking')
      return 'talking'
    }

    console.log('🎬 Default → idle')
    return 'idle'
  }

  /**
   * Analyser le contexte de la conversation pour ajuster l'animation
   * États prioritaires selon les actions Blender : Idle, Hello, Talk, Think, Bye
   */
  static analyzeConversationState(
    isRecording: boolean,
    isProcessing: boolean,
    lastMessage?: { role: string; content: string },
    conversationStarted?: boolean
  ): AnimationState {
    
    console.log('🎬 ConversationState - recording:', isRecording, 'processing:', isProcessing, 'started:', conversationStarted)
    
    // États prioritaires
    if (isRecording) {
      console.log('🎬 ConversationState → idle (user speaking, avatar listening)')
      return 'idle'  // Avatar écoute pendant que l'utilisateur parle
    }

    if (isProcessing) {
      console.log('🎬 ConversationState → thinking (processing)')
      return 'thinking'  // Animation Think de Blender
    }

    // Si conversation vient de commencer
    if (conversationStarted) {
      console.log('🎬 ConversationState → hello (conversation started)')
      return 'hello'  // Animation Hello de Blender
    }

    // Analyser le dernier message si disponible
    if (lastMessage) {
      const state = this.analyzeMessage(
        lastMessage.content, 
        lastMessage.role as 'user' | 'assistant' | 'system'
      )
      console.log('🎬 ConversationState → based on last message:', state)
      return state
    }

    console.log('🎬 ConversationState → idle (default)')
    return 'idle'  // Animation Idle de Blender par défaut
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