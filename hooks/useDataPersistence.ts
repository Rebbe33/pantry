'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// Hook pour charger et synchroniser les données depuis Supabase
export function useDataPersistence() {
  const { setPantryItems, setRecipes, setMenuItems, setIsLoading } = useStore()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    loadAllData()
    
    // S'abonner aux changements en temps réel
    const pantryChannel = supabase
      .channel('pantry-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'pantry_items' },
        (payload) => {
          console.log('Pantry changed:', payload)
          loadPantryItems()
        }
      )
      .subscribe()

    const recipesChannel = supabase
      .channel('recipes-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pantry_recipes' },
        (payload) => {
          console.log('Recipes changed:', payload)
          loadRecipes()
        }
      )
      .subscribe()

    const menuChannel = supabase
      .channel('menu-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pantry_menu_items' },
        (payload) => {
          console.log('Menu changed:', payload)
          loadMenuItems()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(pantryChannel)
      supabase.removeChannel(recipesChannel)
      supabase.removeChannel(menuChannel)
    }
  }, [])

  const loadAllData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadPantryItems(),
        loadRecipes(),
        loadMenuItems(),
      ])
      setIsInitialized(true)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setIsLoading(false)
    }
  }

  const loadPantryItems = async () => {
    const { data, error } = await supabase
      .from('pantry_items')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading pantry items:', error)
      return
    }

    setPantryItems(data || [])
  }

  const loadRecipes = async () => {
    const { data, error } = await supabase
      .from('pantry_recipes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading recipes:', error)
      return
    }

    setRecipes(data || [])
  }

  const loadMenuItems = async () => {
    const { data, error } = await supabase
      .from('pantry_menu_items')
      .select('*')

    if (error) {
      console.error('Error loading menu items:', error)
      return
    }

    setMenuItems(data || [])
  }

  return { isInitialized }
}
