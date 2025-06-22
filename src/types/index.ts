export interface Advisor {
  id: string
  name: string
  firstName: string
  lastName: string
  phone: string
  email: string
  photoUrl?: string
  position: string
  isAvailable: boolean
}

export interface AIConfig {
  id: string
  agentName: string
  agentMission: string
  agentPersonality: string
  llmApiKey: string
  llmModel: string
  llmApiUrl: string
  temperature: number
  ttsVoice?: string
  avatarUrl?: string
  avatarPosition?: {
    x: number
    y: number
    z: number
    scale: number
    rotation: { x: number; y: number; z: number }
  }
}

export interface BrandConfig {
  id: string
  mainLogoUrl?: string
  footerLogo1Url?: string
  footerLogo2Url?: string
  helpText?: string
  infoBoxEnabled: boolean
  infoBoxContent?: string
  infoBoxMediaUrl?: string
  infoBoxMediaType?: 'image' | 'video'
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ConversationContext {
  messages: ConversationMessage[]
  isRecording: boolean
  isPlaying: boolean
  addMessage: (message: Omit<ConversationMessage, 'id' | 'timestamp'>) => void
  clearMessages: () => void
  startRecording: () => void
  stopRecording: () => void
}

export interface UserContext {
  location?: {
    latitude: number
    longitude: number
    city?: string
    country?: string
  }
  timestamp: Date
  timezone: string
}

export interface KnowledgeBase {
  id: string
  title: string
  content: string
  fileType: 'pdf' | 'csv' | 'txt' | 'json'
  fileUrl?: string
}

export interface RSSFeed {
  id: string
  name: string
  url: string
  active: boolean
}

export interface APITool {
  id: string
  name: string
  apiKey: string
  description: string
  apiUrl: string
  active: boolean
}

export interface Pronunciation {
  id: string
  word: string
  pronunciation: string
}

export type AnimationState = 'idle' | 'talking' | 'thinking' | 'waiting' | 'calling' | 'laughing' | 'listening'