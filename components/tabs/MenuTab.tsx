'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { Shuffle, Trash2, Plus, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const MEALS = ['Midi', 'Soir']

export default function MenuTab() {
  const { recipes, menuItems, addMenuItem, deleteMenuItem } = useStore()
  const [showRecipeSelector, setShowRecipeSelector] = useState<{ day: string; meal: string } | null>(null)

  const getRecipeForSlot = (day: string, meal: string) => {
    const menuItem = menuItems.find(item => item.day === day && item.meal === meal)
    if (!menuItem) return null
    return recipes.find(r => r.id === menuItem.recipe_id)
  }

  const handleAssign = async (day: string, meal: string, recipeId: string) => {
    try {
      // Remove existing if any
      const existing = menuItems.find(item => item.day === day && item.meal === meal)
      if (existing) {
        await deleteMenuItem(existing.id)
      }
      
      // Add new
      await addMenuItem({
        user_id: 'temp-user-id', // This should come from auth
        day,
        meal,
        recipe_id: recipeId,
      })
      
      toast.success('Recette ajoutée au menu')
      setShowRecipeSelector(null)
    } catch (error) {
      toast.error('Erreur lors de l\'ajout')
    }
  }

  const handleRemove = async (day: string, meal: string) => {
    const menuItem = menuItems.find(item => item.day === day && item.meal === meal)
    if (!menuItem) return

    try {
      await deleteMenuItem(menuItem.id)
      toast.success('Recette retirée du menu')
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleShuffle = async () => {
    try {
      // Clear existing menu
      for (const item of menuItems) {
        await deleteMenuItem(item.id)
      }

      // Generate random menu
      for (const day of DAYS) {
        for (const meal of MEALS) {
          if (recipes.length > 0) {
            const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)]
            await addMenuItem({
              user_id: 'temp-user-id',
              day,
              meal,
              recipe_id: randomRecipe.id,
            })
          }
        }
      }
      
      toast.success('Menu généré aléatoirement')
    } catch (error) {
      toast.error('Erreur lors de la génération')
    }
  }

  const handleClear = async () => {
    try {
      for (const item of menuItems) {
        await deleteMenuItem(item.id)
      }
      toast.success('Menu vidé')
    } catch (error) {
      toast.error('Erreur lors du nettoyage')
    }
  }

  const filledSlots = menuItems.length
  const totalSlots = DAYS.length * MEALS.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass p-4 rounded-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-playfair font-bold text-gray-900 dark:text-white mb-1">
              Planning de la semaine
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filledSlots} / {totalSlots} repas planifiés
            </p>
          </div>

          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleClear}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Vider
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleShuffle}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-medium shadow-glow hover:shadow-glow-strong transition-all flex items-center gap-2"
            >
              <Shuffle className="w-4 h-4" />
              Générer
            </motion.button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass p-4 sm:p-6 rounded-2xl overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 gap-3">
            {/* Header Row */}
            <div className="col-span-1" />
            {DAYS.map(day => (
              <div key={day} className="text-center">
                <div className="font-playfair font-bold text-orange-600 dark:text-orange-400 text-sm mb-1">
                  {day.slice(0, 3)}.
                </div>
                <div className="h-0.5 bg-gradient-to-r from-orange-200 via-orange-400 to-orange-200 dark:from-orange-800 dark:via-orange-600 dark:to-orange-800 rounded-full" />
              </div>
            ))}

            {/* Meal Rows */}
            {MEALS.map(meal => (
              <div key={meal} className="col-span-8 grid grid-cols-8 gap-3">
                {/* Meal Label */}
                <div className="flex items-center justify-end pr-3">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {meal}
                  </span>
                </div>

                {/* Day Cells */}
                {DAYS.map(day => {
                  const recipe = getRecipeForSlot(day, meal)
                  
                  return (
                    <motion.div
                      key={`${day}-${meal}`}
                      whileHover={{ scale: 1.02 }}
                      className="aspect-square"
                    >
                      {recipe ? (
                        <div className="h-full bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 border border-orange-200 dark:border-orange-800 rounded-xl p-2 relative group cursor-pointer">
                          <div className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
                            {recipe.name}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            ⏱ {recipe.duration}min
                          </div>
                          <button
                            onClick={() => handleRemove(day, meal)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowRecipeSelector({ day, meal })}
                          className="h-full w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all flex items-center justify-center group"
                        >
                          <Plus className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                        </button>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recipe Selector Modal */}
      {showRecipeSelector && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowRecipeSelector(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong p-6 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <h2 className="text-xl font-playfair font-bold text-gray-900 dark:text-white mb-4">
              {showRecipeSelector.day} — {showRecipeSelector.meal}
            </h2>
            
            <div className="space-y-2">
              {recipes.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => handleAssign(showRecipeSelector.day, showRecipeSelector.meal, recipe.id)}
                  className="w-full text-left p-4 bg-white/50 dark:bg-gray-800/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-gray-200 dark:border-gray-700 rounded-xl transition-all"
                >
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">
                    {recipe.name}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>⏱ {recipe.duration}min</span>
                    <span>👤 {recipe.servings}p</span>
                    <div className="flex gap-1">
                      {recipe.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {recipes.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                <p className="text-gray-600 dark:text-gray-400">
                  Aucune recette disponible. Créez-en une d'abord !
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
