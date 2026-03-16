'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import { 
  Plus, 
  Search, 
  Clock,
  Users,
  Trash2,
  Edit,
  ExternalLink,
  Download,
  Upload,
  Sparkles,
  ChefHat,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function RecipesTab() {
  const { recipes, pantryItems, deleteRecipe } = useStore()
  const [search, setSearch] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const filtered = recipes.filter(recipe => 
    recipe.name.toLowerCase().includes(search.toLowerCase()) ||
    recipe.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  )

  const selected = recipes.find(r => r.id === selectedRecipe)

  const canMakeRecipe = (recipe: typeof recipes[0]) => {
    return recipe.ingredients.every(ing => {
      const pantryItem = pantryItems.find(
        p => p.name.toLowerCase() === ing.name.toLowerCase()
      )
      return pantryItem && pantryItem.quantity >= ing.quantity
    })
  }

  const getMissingIngredients = (recipe: typeof recipes[0]) => {
    return recipe.ingredients.filter(ing => {
      const pantryItem = pantryItems.find(
        p => p.name.toLowerCase() === ing.name.toLowerCase()
      )
      return !pantryItem || pantryItem.quantity < ing.quantity
    })
  }

  const handleImport = async () => {
    if (!importUrl.trim()) {
      toast.error('Veuillez entrer une URL')
      return
    }

    setIsImporting(true)
    try {
      const response = await fetch('/api/scrape-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      })

      if (!response.ok) throw new Error('Échec de l\'import')

      const data = await response.json()
      
      // TODO: Open modal to review and save the imported recipe
      console.log('Imported recipe:', data)
      toast.success('Recette importée avec succès !')
      setShowImportModal(false)
      setImportUrl('')
    } catch (error) {
      toast.error('Impossible d\'importer cette recette')
    } finally {
      setIsImporting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteRecipe(id)
      toast.success('Recette supprimée')
      if (selectedRecipe === id) setSelectedRecipe(null)
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Recipe List */}
      <div className="lg:col-span-2 space-y-4">
        {/* Toolbar */}
        <div className="glass p-4 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une recette..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2.5 bg-purple-500 text-white rounded-xl shadow-glow hover:shadow-glow-strong transition-all flex items-center gap-2 font-medium"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">Importer</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl shadow-glow hover:shadow-glow-strong transition-all flex items-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Créer</span>
            </motion.button>
          </div>
        </div>

        {/* Recipes Grid */}
        <div className="space-y-3">
          {filtered.map((recipe, index) => {
            const canMake = canMakeRecipe(recipe)
            const missing = getMissingIngredients(recipe)
            const isSelected = selectedRecipe === recipe.id

            return (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedRecipe(recipe.id)}
                className={`
                  glass p-4 rounded-2xl cursor-pointer transition-all group
                  ${isSelected ? 'ring-2 ring-orange-500 shadow-glow' : 'hover:shadow-lg'}
                  ${canMake ? 'border-l-4 border-green-500' : 'border-l-4 border-gray-200 dark:border-gray-700'}
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {recipe.name}
                      </h3>
                      {recipe.source_url && (
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      )}
                    </div>

                    {recipe.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {recipe.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-3">
                      {recipe.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {recipe.duration} min
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {recipe.servings} pers.
                      </div>
                      {canMake ? (
                        <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                          <Sparkles className="w-4 h-4" />
                          Réalisable
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 text-xs">
                          {missing.length} manquant{missing.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation() }}
                      className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-orange-600" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id) }}
                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 glass rounded-2xl"
          >
            <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Aucune recette trouvée
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Commencez par créer ou importer vos premières recettes
            </p>
          </motion.div>
        )}
      </div>

      {/* Right: Recipe Detail */}
      <div className="lg:sticky lg:top-24 h-fit">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass p-6 rounded-2xl space-y-6"
            >
              {/* Header */}
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-2xl font-playfair font-bold text-gray-900 dark:text-white">
                    {selected.name}
                  </h2>
                  <button
                    onClick={() => setSelectedRecipe(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                {selected.description && (
                  <p className="text-gray-600 dark:text-gray-400">
                    {selected.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    {selected.duration} min
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    {selected.servings} portions
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Ingrédients
                </h3>
                <div className="space-y-2">
                  {selected.ingredients.map((ing, i) => {
                    const pantryItem = pantryItems.find(
                      p => p.name.toLowerCase() === ing.name.toLowerCase()
                    )
                    const hasEnough = pantryItem && pantryItem.quantity >= ing.quantity

                    return (
                      <div
                        key={i}
                        className={`
                          flex justify-between items-center p-2 rounded-lg
                          ${hasEnough 
                            ? 'bg-green-50 dark:bg-green-900/20' 
                            : 'bg-red-50 dark:bg-red-900/20'
                          }
                        `}
                      >
                        <span className={`text-sm ${hasEnough ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                          {hasEnough ? '✓' : '✗'} {ing.name}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {ing.quantity} {ing.unit}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Steps */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Préparation
                </h3>
                <div className="space-y-3">
                  {selected.steps.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Note */}
              {selected.note && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    💡 {selected.note}
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass p-12 rounded-2xl text-center"
            >
              <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
              <p className="text-gray-600 dark:text-gray-400">
                Sélectionnez une recette pour voir les détails
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowImportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong p-6 rounded-2xl max-w-md w-full"
            >
              <h2 className="text-xl font-playfair font-bold text-gray-900 dark:text-white mb-4">
                Importer une recette
              </h2>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Collez l'URL d'une recette depuis votre site de cuisine préféré
              </p>

              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://exemple.com/ma-recette"
                className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all mb-4"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-medium hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Import...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Importer
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
