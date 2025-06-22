import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      advisors: {
        Row: {
          id: string
          name: string
          first_name: string
          last_name: string
          phone: string
          email: string
          photo_url: string | null
          position: string
          is_available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          first_name: string
          last_name: string
          phone: string
          email: string
          photo_url?: string | null
          position: string
          is_available?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          first_name?: string
          last_name?: string
          phone?: string
          email?: string
          photo_url?: string | null
          position?: string
          is_available?: boolean
          created_at?: string
        }
      }
      ai_config: {
        Row: {
          id: string
          agent_name: string
          agent_mission: string
          agent_personality: string
          llm_api_key: string
          llm_model: string
          llm_api_url: string
          temperature: number
          avatar_url: string | null
          avatar_position: object | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_name: string
          agent_mission: string
          agent_personality: string
          llm_api_key: string
          llm_model: string
          llm_api_url: string
          temperature?: number
          avatar_url?: string | null
          avatar_position?: object | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_name?: string
          agent_mission?: string
          agent_personality?: string
          llm_api_key?: string
          llm_model?: string
          llm_api_url?: string
          temperature?: number
          avatar_url?: string | null
          avatar_position?: object | null
          created_at?: string
          updated_at?: string
        }
      }
      brand_config: {
        Row: {
          id: string
          main_logo_url: string | null
          footer_logo_1_url: string | null
          footer_logo_2_url: string | null
          help_text: string | null
          info_box_enabled: boolean
          info_box_content: string | null
          info_box_media_url: string | null
          info_box_media_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          main_logo_url?: string | null
          footer_logo_1_url?: string | null
          footer_logo_2_url?: string | null
          help_text?: string | null
          info_box_enabled?: boolean
          info_box_content?: string | null
          info_box_media_url?: string | null
          info_box_media_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          main_logo_url?: string | null
          footer_logo_1_url?: string | null
          footer_logo_2_url?: string | null
          help_text?: string | null
          info_box_enabled?: boolean
          info_box_content?: string | null
          info_box_media_url?: string | null
          info_box_media_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      knowledge_base: {
        Row: {
          id: string
          title: string
          content: string
          file_type: string
          file_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          file_type: string
          file_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          file_type?: string
          file_url?: string | null
          created_at?: string
        }
      }
      rss_feeds: {
        Row: {
          id: string
          name: string
          url: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          url: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          url?: string
          active?: boolean
          created_at?: string
        }
      }
      api_tools: {
        Row: {
          id: string
          name: string
          api_key: string
          description: string
          api_url: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          api_key: string
          description: string
          api_url: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          api_key?: string
          description?: string
          api_url?: string
          active?: boolean
          created_at?: string
        }
      }
      pronunciations: {
        Row: {
          id: string
          word: string
          pronunciation: string
          created_at: string
        }
        Insert: {
          id?: string
          word: string
          pronunciation: string
          created_at?: string
        }
        Update: {
          id?: string
          word?: string
          pronunciation?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}