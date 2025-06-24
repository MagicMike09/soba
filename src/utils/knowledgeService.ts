import { supabase } from '@/lib/supabase'

interface KnowledgeBase {
  id: string
  title: string
  content: string
  fileType: 'pdf' | 'csv' | 'txt' | 'json'
  fileUrl?: string
}

interface RSSFeed {
  id: string
  name: string
  url: string
  active: boolean
  lastContent?: string
}

interface APITool {
  id: string
  name: string
  apiKey: string
  description: string
  apiUrl: string
  active: boolean
}

export class KnowledgeService {
  private static instance: KnowledgeService
  private knowledgeCache: KnowledgeBase[] = []
  private rssCache: RSSFeed[] = []
  private apiToolsCache: APITool[] = []
  private lastCacheUpdate: number = 0
  private cacheValidityMs = 5 * 60 * 1000 // 5 minutes

  static getInstance(): KnowledgeService {
    if (!KnowledgeService.instance) {
      KnowledgeService.instance = new KnowledgeService()
    }
    return KnowledgeService.instance
  }

  async loadAllKnowledge(): Promise<void> {
    const now = Date.now()
    if (now - this.lastCacheUpdate < this.cacheValidityMs) {
      return // Cache encore valide
    }

    try {
      console.log('📚 KnowledgeService: Loading knowledge base...')

      const [kbResult, rssResult, apiResult] = await Promise.all([
        supabase.from('knowledge_base').select('*'),
        supabase.from('rss_feeds').select('*').eq('active', true),
        supabase.from('api_tools').select('*').eq('active', true)
      ])

      if (kbResult.data) {
        this.knowledgeCache = kbResult.data.map(kb => ({
          id: kb.id,
          title: kb.title,
          content: kb.content,
          fileType: kb.file_type as 'pdf' | 'csv' | 'txt' | 'json',
          fileUrl: kb.file_url
        }))
      }

      if (rssResult.data) {
        this.rssCache = rssResult.data
      }

      if (apiResult.data) {
        this.apiToolsCache = apiResult.data.map(api => ({
          id: api.id,
          name: api.name,
          apiKey: api.api_key,
          description: api.description,
          apiUrl: api.api_url,
          active: api.active
        }))
      }

      this.lastCacheUpdate = now
      console.log(`✅ KnowledgeService: Loaded ${this.knowledgeCache.length} KB, ${this.rssCache.length} RSS, ${this.apiToolsCache.length} APIs`)

    } catch (error) {
      console.error('❌ KnowledgeService: Error loading knowledge:', error)
    }
  }

  async buildEnhancedSystemPrompt(basePrompt: string): Promise<string> {
    await this.loadAllKnowledge()

    let enhancedPrompt = basePrompt + '\n\n'

    // Ajouter la base de connaissances
    if (this.knowledgeCache.length > 0) {
      enhancedPrompt += `📚 BASE DE CONNAISSANCES DISPONIBLE:\n`
      this.knowledgeCache.forEach(kb => {
        enhancedPrompt += `\n- ${kb.title}:\n${kb.content.substring(0, 500)}...\n`
      })
      enhancedPrompt += '\n'
    }

    // Ajouter les sources RSS récentes
    if (this.rssCache.length > 0) {
      enhancedPrompt += `📰 SOURCES D'ACTUALITÉS:\n`
      this.rssCache.forEach(rss => {
        enhancedPrompt += `- ${rss.name}: ${rss.url}\n`
      })
      enhancedPrompt += '\n'
    }

    // Ajouter les outils API disponibles
    if (this.apiToolsCache.length > 0) {
      enhancedPrompt += `🔧 OUTILS API DISPONIBLES:\n`
      this.apiToolsCache.forEach(api => {
        enhancedPrompt += `- ${api.name}: ${api.description}\n`
      })
      enhancedPrompt += '\n'
    }

    enhancedPrompt += `
INSTRUCTIONS IMPORTANTES:
- Utilise TOUJOURS les informations de la base de connaissances si elles sont pertinentes
- Si tu n'as pas l'information dans la base de connaissances, dis-le clairement
- Mentionne tes sources quand tu utilises la base de connaissances
- Sois précis et factuel basé sur les données disponibles
- Si une question nécessite des données en temps réel, propose de contacter un conseiller
- Garde tes réponses courtes mais informatives (max 2-3 phrases)
`

    return enhancedPrompt
  }

  searchKnowledge(query: string): KnowledgeBase[] {
    const queryLower = query.toLowerCase()
    return this.knowledgeCache.filter(kb => 
      kb.title.toLowerCase().includes(queryLower) ||
      kb.content.toLowerCase().includes(queryLower)
    )
  }

  getRelevantKnowledge(userMessage: string): string {
    const relevantKB = this.searchKnowledge(userMessage)
    
    if (relevantKB.length === 0) {
      return ''
    }

    let context = '\n📚 INFORMATIONS PERTINENTES:\n'
    relevantKB.slice(0, 3).forEach(kb => { // Limite à 3 résultats les plus pertinents
      context += `\n${kb.title}:\n${kb.content.substring(0, 300)}...\n`
    })
    
    return context
  }

  getAvailableTools(): APITool[] {
    return this.apiToolsCache
  }

  getRSSFeeds(): RSSFeed[] {
    return this.rssCache
  }

  getKnowledgeBase(): KnowledgeBase[] {
    return this.knowledgeCache
  }
}

export const knowledgeService = KnowledgeService.getInstance()