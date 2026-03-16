import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface PantryItem {
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

export interface Recipe {
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

export interface MenuItem {
  id: string
  user_id: string
  day: string
  meal: string
  recipe_id: string
  created_at: string
  updated_at: string
}

export interface CustomShoppingItem {
  id: string
  user_id: string
  name: string
  is_checked: boolean
  created_at: string
  updated_at: string
}

interface AppStore {
  // Theme
  isDark: boolean
  toggleTheme: () => void
  
  // Pantry
  pantryItems: PantryItem[]
  setPantryItems: (items: PantryItem[]) => void
  addPantryItem: (item: Omit<PantryItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updatePantryItem: (id: string, updates: Partial<PantryItem>) => Promise<void>
  deletePantryItem: (id: string) => Promise<void>
  
  // Recipes
  recipes: Recipe[]
  setRecipes: (recipes: Recipe[]) => void
  addRecipe: (recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateRecipe: (id: string, updates: Partial<Recipe>) => Promise<void>
  deleteRecipe: (id: string) => Promise<void>
  
  // Menu
  menuItems: MenuItem[]
  setMenuItems: (items: MenuItem[]) => void
  addMenuItem: (item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  deleteMenuItem: (id: string) => Promise<void>
  
  // Custom Shopping Items
  customShoppingItems: CustomShoppingItem[]
  setCustomShoppingItems: (items: CustomShoppingItem[]) => void
  addCustomShoppingItem: (name: string) => Promise<void>
  toggleCustomShoppingItem: (id: string) => Promise<void>
  deleteCustomShoppingItem: (id: string) => Promise<void>
  
  // Loading states
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export const useStore = create<AppStore>((set, get) => ({
  // Theme
  isDark: false,
  toggleTheme: () => {
    set({ isDark: !get().isDark })
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark')
      localStorage.setItem('theme', get().isDark ? 'dark' : 'light')
    }
  },
  
  // Pantry
  pantryItems: [],
  setPantryItems: (items) => set({ pantryItems: items }),
  
  addPantryItem: async (item) => {
    const { data, error } = await supabase
      .from('pantry_items')
      .insert([item])
      .select()
      .single()
    
    if (error) throw error
    if (data) {
      set({ pantryItems: [...get().pantryItems, data] })
    }
  },
  
  updatePantryItem: async (id, updates) => {
    const { data, error } = await supabase
      .from('pantry_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    if (data) {
      set({
        pantryItems: get().pantryItems.map(item => 
          item.id === id ? data : item
        )
      })
    }
  },
  
  deletePantryItem: async (id) => {
    const { error } = await supabase
      .from('pantry_items')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    set({
      pantryItems: get().pantryItems.filter(item => item.id !== id)
    })
  },
  
  // Recipes
  recipes: [],
  setRecipes: (recipes) => set({ recipes }),
  
  addRecipe: async (recipe) => {
    const { data, error } = await supabase
      .from('pantry_recipes')
      .insert([recipe])
      .select()
      .single()
    
    if (error) throw error
    if (data) {
      set({ recipes: [...get().recipes, data] })
    }
  },
  
  updateRecipe: async (id, updates) => {
    const { data, error } = await supabase
      .from('pantry_recipes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    if (data) {
      set({
        recipes: get().recipes.map(recipe => 
          recipe.id === id ? data : recipe
        )
      })
    }
  },
  
  deleteRecipe: async (id) => {
    const { error } = await supabase
      .from('pantry_recipes')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    set({
      recipes: get().recipes.filter(recipe => recipe.id !== id)
    })
  },
  
  // Menu
  menuItems: [],
  setMenuItems: (items) => set({ menuItems: items }),
  
  addMenuItem: async (item) => {
    const { data, error } = await supabase
      .from('pantry_menu_items')
      .insert([item])
      .select()
      .single()
    
    if (error) throw error
    if (data) {
      set({ menuItems: [...get().menuItems, data] })
    }
  },
  
  deleteMenuItem: async (id) => {
    const { error } = await supabase
      .from('pantry_menu_items')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    set({
      menuItems: get().menuItems.filter(item => item.id !== id)
    })
  },
  
  // Custom Shopping Items
  customShoppingItems: [],
  setCustomShoppingItems: (items) => set({ customShoppingItems: items }),
  
  addCustomShoppingItem: async (name) => {
    const { data, error } = await supabase
      .from('pantry_custom_shopping_items')
      .insert([{ 
        user_id: 'temp-user-id', // À remplacer par auth
        name,
        is_checked: false 
      }])
      .select()
      .single()
    
    if (error) throw error
    if (data) {
      set({ customShoppingItems: [...get().customShoppingItems, data] })
    }
  },
  
  toggleCustomShoppingItem: async (id) => {
    const item = get().customShoppingItems.find(i => i.id === id)
    if (!item) return
    
    const { data, error } = await supabase
      .from('pantry_custom_shopping_items')
      .update({ is_checked: !item.is_checked })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    if (data) {
      set({
        customShoppingItems: get().customShoppingItems.map(i => 
          i.id === id ? data : i
        )
      })
    }
  },
  
  deleteCustomShoppingItem: async (id) => {
    const { error } = await supabase
      .from('pantry_custom_shopping_items')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    set({
      customShoppingItems: get().customShoppingItems.filter(i => i.id !== id)
    })
  },
  
  // Loading
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}))
