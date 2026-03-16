import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      pantry_items: {
        Row: {
          id: string
          user_id: string
          name: string
          quantity: number
          unit: string
          location: string
          category: string
          expiry_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          quantity: number
          unit: string
          location: string
          category: string
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          quantity?: number
          unit?: string
          location?: string
          category?: string
          expiry_date?: string | null
          updated_at?: string
        }
      }
      pantry_recipes: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          duration: number
          servings: number
          tags: string[]
          ingredients: { name: string; quantity: number; unit: string }[]
          steps: string[]
          note: string | null
          image_url: string | null
          source_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          duration: number
          servings: number
          tags?: string[]
          ingredients: { name: string; quantity: number; unit: string }[]
          steps: string[]
          note?: string | null
          image_url?: string | null
          source_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          duration?: number
          servings?: number
          tags?: string[]
          ingredients?: { name: string; quantity: number; unit: string }[]
          steps?: string[]
          note?: string | null
          image_url?: string | null
          source_url?: string | null
          updated_at?: string
        }
      }
      pantry_menu_items: {
        Row: {
          id: string
          user_id: string
          day: string
          meal: string
          recipe_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          day: string
          meal: string
          recipe_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          day?: string
          meal?: string
          recipe_id?: string
          updated_at?: string
        }
      }
    }
  }
}
