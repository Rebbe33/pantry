'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import { convertUnit, suggestBestUnit, formatConversion } from '@/lib/conversions'
import { Sparkles, Clock, Users, AlertCircle, Lightbulb, Globe, ArrowRightLeft, Loader } from 'lucide-react'
import { differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'

interface OnlineRecipe {
  name: string
  description?: string
  duration: number
  servings: number
  tags: string[]
  source_url?: string
  image_url?: string
  matchScore: number
}

export default function SuggestionsTab() {
  const { recipes, pantryItems } = useStore()
  const [showConverter, setShowConverter] = useState(false)
  const [showOnlineRecipes, setShowOnlineRecipes] = useState(false)
  const [onlineRecipes, setOnlineRecipes] = useState<OnlineRecipe[]>([])
  const [loadingOnline, setLoadingOnline] = useState(false)
  
  // Converter state
  const [convValue, setConvValue] = useState('100')
  const [convFromUnit, setConvFromUnit] = useState('g')
  const [convToUnit, setConvToUnit] = useState('ml')
  const [convIngredient, setConvIngredient] = useState('eau')
  const [convResult, setConvResult] = useState<string | null>(null)

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

  // Fetch online recipes
  const fetchOnlineRecipes = async () => {
    setLoadingOnline(true)
    try {
      const availableIngredients = pantryItems.map(item => item.name)
      
      const response = await fetch('/api/search-online-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: availableIngredients }),
      })

      if (!response.ok) throw new Error('Failed to fetch')

      const data = await response.json()
      setOnlineRecipes(data.recipes || [])
      setShowOnlineRecipes(true)
      
      if (data.source === 'fallback') {
        toast('Suggestions basiques générées (configurez Edamam API pour plus de résultats)', { icon: '💡' })
      } else {
        toast.success(`${data.recipes.length} recettes trouvées en ligne !`)
      }
    } catch (error) {
      toast.error('Impossible de charger les recettes en ligne')
    } finally {
      setLoadingOnline(false)
    }
  }

  // Handle conversion
  const handleConvert = () => {
    const value = parseFloat(convValue)
    if (isNaN(value)) {
      toast.error('Valeur invalide')
      return
    }

    const result = convertUnit(value, convFromUnit, convToUnit, convIngredient)
    if (result) {
      setConvResult(formatConversion(result))
      toast.success('Conversion effectuée !')
    } else {
      setConvResult(null)
      toast.error('Conversion impossible avec ces unités')
    }
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowConverter(!showConverter)}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl shadow-glow hover:shadow-glow-strong transition-all flex items-center gap-2 font-medium"
        >
          <ArrowRightLeft className="w-5 h-5" />
          Convertisseur
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={fetchOnlineRecipes}
          disabled={loadingOnline}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl shadow-glow hover:shadow-glow-strong transition-all flex items-center gap-2 font-medium disabled:opacity-50"
        >
          {loadingOnline ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <Globe className="w-5 h-5" />
          )}
          Chercher sur Internet
        </motion.button>
      </div>

      {/* Converter */}
      <AnimatePresence>
        {showConverter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass p-6 rounded-2xl"
          >
            <h3 className="font-playfair font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-purple-600" />
              Convertisseur intelligent
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ingrédient
                </label>
                <input
                  type="text"
                  value={convIngredient}
                  onChange={(e) => setConvIngredient(e.target.value)}
                  placeholder="Ex: eau, farine, tomate..."
                  className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valeur
                </label>
                <input
                  type="number"
                  value={convValue}
                  onChange={(e) => setConvValue(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  De
                </label>
                <select
                  value={convFromUnit}
                  onChange={(e) => setConvFromUnit(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="g">Grammes (g)</option>
                  <option value="kg">Kilogrammes (kg)</option>
                  <option value="ml">Millilitres (ml)</option>
                  <option value="l">Litres (L)</option>
                  <option value="cl">Centilitres (cl)</option>
                  <option value="pièce(s)">Pièce(s)</option>
                  <option value="cuillère à soupe">Cuillère à soupe</option>
                  <option value="cuillère à café">Cuillère à café</option>
                  <option value="tasse">Tasse</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vers
                </label>
                <select
                  value={convToUnit}
                  onChange={(e) => setConvToUnit(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="g">Grammes (g)</option>
                  <option value="kg">Kilogrammes (kg)</option>
                  <option value="ml">Millilitres (ml)</option>
                  <option value="l">Litres (L)</option>
                  <option value="cl">Centilitres (cl)</option>
                  <option value="pièce(s)">Pièce(s)</option>
                  <option value="cuillère à soupe">Cuillère à soupe</option>
                  <option value="cuillère à café">Cuillère à café</option>
                  <option value="tasse">Tasse</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConvert}
                className="px-6 py-2.5 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors"
              >
                Convertir
              </motion.button>

              {convResult && (
                <div className="flex-1 px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                  <span className="text-purple-900 dark:text-purple-100 font-semibold">
                    Résultat : {convResult}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              💡 La conversion utilise les densités réelles des ingrédients pour une précision maximale
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Online Recipes */}
      <AnimatePresence>
        {showOnlineRecipes && onlineRecipes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass p-6 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-playfair font-bold text-gray-900 dark:text-white">
                  Recettes trouvées en ligne
                </h2>
              </div>
              <button
                onClick={() => setShowOnlineRecipes(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {onlineRecipes.map((recipe, index) => (
                <motion.a
                  key={index}
                  href={recipe.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass p-4 rounded-xl hover:shadow-glow transition-all group cursor-pointer border border-blue-200 dark:border-blue-800"
                >
                  {recipe.image_url && (
                    <img
                      src={recipe.image_url}
                      alt={recipe.name}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  )}
                  
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {recipe.name}
                  </h3>
                  
                  {recipe.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {recipe.description}
                    </p>
                  )}

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

                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {recipe.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {Math.round(recipe.matchScore)}% match
                    </span>
                  </div>
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rest of the existing suggestions code... */}
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
