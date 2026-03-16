'use client'

import { motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { Sparkles, Clock, Users, AlertCircle, Lightbulb } from 'lucide-react'
import { differenceInDays } from 'date-fns'

export default function SuggestionsTab() {
  const { recipes, pantryItems } = useStore()

  // Calculate recipe score based on available ingredients
  const scoredRecipes = recipes.map(recipe => {
    const total = recipe.ingredients.length
    if (total === 0) return { ...recipe, score: 0, missing: [] }

    const available = recipe.ingredients.filter(ing => {
      const pantryItem = pantryItems.find(
        p => p.name.toLowerCase() === ing.name.toLowerCase()
      )
      return pantryItem && pantryItem.quantity >= ing.quantity
    })

    const missing = recipe.ingredients.filter(ing => {
      const pantryItem = pantryItems.find(
        p => p.name.toLowerCase() === ing.name.toLowerCase()
      )
      return !pantryItem || pantryItem.quantity < ing.quantity
    })

    return {
      ...recipe,
      score: (available.length / total) * 100,
      missing,
    }
  }).sort((a, b) => b.score - a.score)

  // Find expiring items
  const expiringItems = pantryItems.filter(item => {
    if (!item.expiry_date) return false
    const days = differenceInDays(new Date(item.expiry_date), new Date())
    return days >= 0 && days <= 5
  })

  // Find recipes that use expiring ingredients
  const useExpiringRecipes = scoredRecipes.filter(recipe => 
    recipe.ingredients.some(ing =>
      expiringItems.find(exp => exp.name.toLowerCase() === ing.name.toLowerCase())
    )
  )

  const perfectMatches = scoredRecipes.filter(r => r.score === 100)
  const partialMatches = scoredRecipes.filter(r => r.score >= 60 && r.score < 100)

  const getScoreColor = (score: number) => {
    if (score === 100) return 'green'
    if (score >= 75) return 'lime'
    if (score >= 50) return 'yellow'
    if (score >= 25) return 'orange'
    return 'red'
  }

  return (
    <div className="space-y-6">
      {/* Expiring Soon */}
      {useExpiringRecipes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6 rounded-2xl border-l-4 border-yellow-500"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-playfair font-bold text-gray-900 dark:text-white mb-2">
                À cuisiner en priorité
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ces recettes utilisent des produits qui expirent bientôt
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {useExpiringRecipes.slice(0, 4).map((recipe, index) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl"
              >
                <div className="font-semibold text-gray-900 dark:text-white mb-2">
                  {recipe.name}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {recipe.duration}min
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {recipe.servings}p
                  </span>
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300">
                  Utilise des produits qui expirent dans {
                    Math.min(...expiringItems
                      .filter(exp => recipe.ingredients.some(ing => 
                        ing.name.toLowerCase() === exp.name.toLowerCase()
                      ))
                      .map(exp => differenceInDays(new Date(exp.expiry_date!), new Date()))
                    )
                  } jours
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Perfect Matches */}
      {perfectMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-playfair font-bold text-gray-900 dark:text-white">
              Réalisables maintenant
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {perfectMatches.map((recipe, index) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass p-5 rounded-2xl border-l-4 border-green-500 hover:shadow-glow transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {recipe.name}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {recipe.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ✓
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {recipe.duration}min
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {recipe.servings}p
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* All Suggestions by Score */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <Lightbulb className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="text-xl font-playfair font-bold text-gray-900 dark:text-white">
            Toutes les suggestions
          </h2>
        </div>

        <div className="space-y-3">
          {scoredRecipes.map((recipe, index) => {
            const scoreColor = getScoreColor(recipe.score)
            const colorClasses = {
              green: 'from-green-500 to-emerald-500',
              lime: 'from-lime-500 to-green-500',
              yellow: 'from-yellow-500 to-amber-500',
              orange: 'from-orange-500 to-red-500',
              red: 'from-red-500 to-rose-500',
            }

            return (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="glass p-5 rounded-2xl hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="url(#gradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 36}`}
                        strokeDashoffset={`${2 * Math.PI * 36 * (1 - recipe.score / 100)}`}
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" className={`text-${scoreColor}-400`} stopColor="currentColor" />
                          <stop offset="100%" className={`text-${scoreColor}-600`} stopColor="currentColor" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-lg font-bold bg-gradient-to-br ${colorClasses[scoreColor]} bg-clip-text text-transparent`}>
                        {Math.round(recipe.score)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {recipe.name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {recipe.duration}min
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {recipe.servings}p
                      </span>
                    </div>
                    {recipe.missing.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Manque : {recipe.missing.map(m => m.name).join(', ')}
                      </div>
                    )}
                  </div>

                  {recipe.score === 100 && (
                    <div className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">
                      Réalisable
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Empty State */}
      {scoredRecipes.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 glass rounded-2xl"
        >
          <Lightbulb className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Aucune suggestion
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Ajoutez des recettes pour voir des suggestions basées sur votre stock
          </p>
        </motion.div>
      )}
    </div>
  )
}
