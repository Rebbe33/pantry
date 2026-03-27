'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { getRecipeIngredients, hasEnoughIngredient } from '@/lib/recipe-helpers'
import { matchIngredientWithPantry, getSuggestionsForIngredient, cleanIngredientForMatching } from '@/lib/ingredient-matcher'
import { 
  Plus, 
  Search, 
  Clock,
  Users,
  Trash2,
  Edit,
  ExternalLink,
  Download,
  X,
  ChefHat,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Camera,
} from 'lucide-react'
import toast from 'react-hot-toast'

const RECIPE_CATEGORIES = [
  'Entrée',
  'Plat principal',
  'Dessert',
  'Apéritif',
  'Petit-déjeuner',
  'Goûter',
  'Accompagnement',
  'Sauce',
  'Boisson',
]

interface IngredientInput {
  pantry_item_id: string
  pantry_item_name: string
  quantity: string
  unit: string
}

export default function RecipesTab() {
  const { 
    recipes, 
    pantryItems,
    deleteRecipe, 
    addRecipe, 
    updateRecipe,
    linkOrCreateIngredient,
    deductIngredientsFromPantry
  } = useStore()
  
  const [search, setSearch] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({})
  const [showImportModal, setShowImportModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCookingMode, setShowCookingMode] = useState(false)
  const [showImportPreview, setShowImportPreview] = useState(false)
  const [importPreviewData, setImportPreviewData] = useState<any>(null)
  const [ingredientMatches, setIngredientMatches] = useState<Map<number, any>>(new Map())
  const [currentStep, setCurrentStep] = useState(0)
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false)

  // Create/Edit form state
  const [formName, setFormName] = useState('')
  const [formDuration, setFormDuration] = useState('')
  const [formServings, setFormServings] = useState('4')
  const [formDescription, setFormDescription] = useState('')
  const [formInstructions, setFormInstructions] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formCategories, setFormCategories] = useState<string[]>([])
  const [formIngredients, setFormIngredients] = useState<IngredientInput[]>([])
  
  // Autocomplete
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [showIngredientDropdown, setShowIngredientDropdown] = useState(false)

  const filtered = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(search.toLowerCase()) ||
      recipe.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || recipe.tags.includes(selectedCategory)
    return matchesSearch && matchesCategory
  })

  // Match ingredients with pantry when preview data changes
  useEffect(() => {
    if (importPreviewData && importPreviewData.ingredients) {
      const matches = new Map()
      
      importPreviewData.ingredients.forEach((ing: any, idx: number) => {
        const match = matchIngredientWithPantry(ing.name, pantryItems)
        const suggestions = match ? [] : getSuggestionsForIngredient(ing.name, pantryItems)
        
        matches.set(idx, {
          match, // Matched pantry item or null
          suggestions, // Suggested items if no match
          originalName: ing.name,
          cleanedName: cleanIngredientForMatching(ing.name)
        })
      })
      
      setIngredientMatches(matches)
    }
  }, [importPreviewData, pantryItems])

  const usedCategories = Array.from(new Set(
    recipes.flatMap(r => r.tags.filter(t => RECIPE_CATEGORIES.includes(t)))
  )).sort()

  const recipesByCategory = filtered.reduce((acc, recipe) => {
    const recipeCategories = recipe.tags.filter(t => RECIPE_CATEGORIES.includes(t))
    
    if (recipeCategories.length === 0) {
      if (!acc['Sans catégorie']) acc['Sans catégorie'] = []
      acc['Sans catégorie'].push(recipe)
    } else {
      recipeCategories.forEach(cat => {
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(recipe)
      })
    }
    return acc
  }, {} as Record<string, typeof recipes>)

  const selected = recipes.find(r => r.id === selectedRecipe)

  const canMakeRecipe = (recipe: typeof recipes[0]) => {
    const ingredients = getRecipeIngredients(recipe)
    return ingredients.every(ing => {
      if (ing.pantry_item_id) {
        return hasEnoughIngredient(
          { quantity: ing.quantity, unit: ing.unit, pantry_item_id: ing.pantry_item_id },
          pantryItems
        )
      }
      return false
    })
  }

  const getMissingIngredients = (recipe: typeof recipes[0]) => {
    const ingredients = getRecipeIngredients(recipe)
    return ingredients.filter(ing => {
      if (ing.pantry_item_id) {
        return !hasEnoughIngredient(
          { quantity: ing.quantity, unit: ing.unit, pantry_item_id: ing.pantry_item_id },
          pantryItems
        )
      }
      return true
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
      
      // Show preview instead of importing directly
      setImportPreviewData(data)
      setShowImportModal(false)
      setShowImportPreview(true)
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Impossible d\'importer cette recette')
    } finally {
      setIsImporting(false)
    }
  }

  const confirmImport = async () => {
    if (!importPreviewData) return

    try {
      // Create recipe first (without ingredients in the old field)
      const { data: newRecipe, error } = await supabase
        .from('pantry_recipes')
        .insert([{
          user_id: 'temp-user-id',
          name: importPreviewData.name,
          description: importPreviewData.description || null,
          duration: importPreviewData.duration || 30,
          servings: importPreviewData.servings || 4,
          steps: importPreviewData.steps || [],
          tags: importPreviewData.tags || [],
          image_url: importPreviewData.image_url || null,
          source_url: importUrl,
          ingredients: [], // Keep empty for legacy field
          note: null,
        }])
        .select()
        .single()

      if (error) throw error

      // Link ingredients using the new system
      if (importPreviewData.ingredients && importPreviewData.ingredients.length > 0) {
        for (const ing of importPreviewData.ingredients) {
          await linkOrCreateIngredient(
            newRecipe.id,
            ing.name,
            ing.quantity,
            ing.unit
          )
        }
      }

      toast.success('Recette importée et sauvegardée !')
      setShowImportPreview(false)
      setImportPreviewData(null)
      setImportUrl('')
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Impossible d\'importer cette recette')
    }
  }

  const updatePreviewIngredient = (index: number, field: 'name' | 'quantity' | 'unit', value: string | number) => {
    if (!importPreviewData) return
    
    const updated = [...importPreviewData.ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setImportPreviewData({ ...importPreviewData, ingredients: updated })
  }

  const removePreviewIngredient = (index: number) => {
    if (!importPreviewData) return
    
    const updated = importPreviewData.ingredients.filter((_: any, i: number) => i !== index)
    setImportPreviewData({ ...importPreviewData, ingredients: updated })
  }

  const updatePreviewStep = (index: number, value: string) => {
    if (!importPreviewData) return
    
    const updated = [...importPreviewData.steps]
    updated[index] = value
    setImportPreviewData({ ...importPreviewData, steps: updated })
  }

  const removePreviewStep = (index: number) => {
    if (!importPreviewData) return
    
    const updated = importPreviewData.steps.filter((_: any, i: number) => i !== index)
    setImportPreviewData({ ...importPreviewData, steps: updated })
  }

  const addPreviewStep = () => {
    if (!importPreviewData) return
    
    setImportPreviewData({
      ...importPreviewData,
      steps: [...importPreviewData.steps, '']
    })
  }

  const handlePhotoImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/photo-import', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Échec du traitement de l\'image')

      const data = await response.json()
      
      // Show preview
      setImportPreviewData(data)
      setShowImportPreview(true)
      
      toast.success('Photo traitée ! Vérifiez les ingrédients.')
    } catch (error) {
      console.error('Photo import error:', error)
      toast.error('Impossible de traiter la photo')
    } finally {
      setIsProcessingPhoto(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer la recette "${name}" ?`)) return

    try {
      await deleteRecipe(id)
      toast.success('Recette supprimée')
      if (selectedRecipe === id) setSelectedRecipe(null)
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleCreateRecipe = async () => {
    if (!formName.trim()) {
      toast.error('Le nom est requis')
      return
    }

    try {
      const allTags = [...formCategories, ...formTags.split(',').map(t => t.trim()).filter(Boolean)]
      
      // Create recipe first
      const { data: newRecipe, error } = await supabase
        .from('pantry_recipes')
        .insert([{
          user_id: 'temp-user-id',
          name: formName.trim(),
          duration: parseInt(formDuration) || 30,
          servings: parseInt(formServings) || 4,
          description: formDescription.trim() || null,
          steps: formInstructions.trim().split('\n').filter(Boolean),
          note: null,
          tags: allTags,
          ingredients: [],
          image_url: null,
          source_url: null,
        }])
        .select()
        .single()

      if (error) throw error

      // Link ingredients
      for (const ing of formIngredients) {
        if (ing.pantry_item_id && ing.quantity) {
          await linkOrCreateIngredient(
            newRecipe.id,
            ing.pantry_item_name,
            parseFloat(ing.quantity),
            ing.unit
          )
        }
      }

      toast.success('Recette créée !')
      setShowCreateModal(false)
      resetForm()
    } catch (error) {
      console.error('Create error:', error)
      toast.error('Erreur lors de la création')
    }
  }

  const handleEditRecipe = async () => {
    if (!selectedRecipe || !formName.trim()) return

    try {
      const allTags = [...formCategories, ...formTags.split(',').map(t => t.trim()).filter(Boolean)]
      
      await updateRecipe(selectedRecipe, {
        name: formName.trim(),
        duration: parseInt(formDuration) || 30,
        servings: parseInt(formServings) || 4,
        description: formDescription.trim() || null,
        steps: formInstructions.trim().split('\n').filter(Boolean),
        tags: allTags,
      })

      toast.success('Recette modifiée !')
      setShowEditModal(false)
      setSelectedRecipe(null)
    } catch (error) {
      toast.error('Erreur lors de la modification')
    }
  }

  const resetForm = () => {
    setFormName('')
    setFormDuration('')
    setFormServings('4')
    setFormDescription('')
    setFormInstructions('')
    setFormTags('')
    setFormCategories([])
    setFormIngredients([])
    setIngredientSearch('')
  }

  const openEditModal = (recipe: typeof recipes[0]) => {
    setFormName(recipe.name)
    setFormDuration(String(recipe.duration))
    setFormServings(String(recipe.servings))
    setFormDescription(recipe.description || '')
    setFormInstructions(recipe.steps.join('\n'))
    
    const categories = recipe.tags.filter(t => RECIPE_CATEGORIES.includes(t))
    const otherTags = recipe.tags.filter(t => !RECIPE_CATEGORIES.includes(t))
    
    setFormCategories(categories)
    setFormTags(otherTags.join(', '))
    
    const ingredients = getRecipeIngredients(recipe)
    setFormIngredients(ingredients.map(ing => ({
      pantry_item_id: ing.pantry_item_id || '',
      pantry_item_name: ing.name,
      quantity: String(ing.quantity),
      unit: ing.unit
    })))
    
    setSelectedRecipe(recipe.id)
    setShowEditModal(true)
  }

  const startCookingMode = () => {
    setCurrentStep(0)
    setShowCookingMode(true)
  }

  const finishCooking = async () => {
    if (!selected) return
    
    const shouldDeduct = confirm('Voulez-vous déduire les ingrédients utilisés de votre inventaire ?')
    
    if (shouldDeduct) {
      try {
        await deductIngredientsFromPantry(selected.id)
        toast.success('Ingrédients déduits de l\'inventaire ! Bon appétit ! 🎉')
      } catch (error) {
        toast.error('Erreur lors de la déduction')
      }
    } else {
      toast.success('Recette terminée ! Bon appétit ! 🎉')
    }
    
    setShowCookingMode(false)
    setSelectedRecipe(null)
  }

  const getIngredientFromStep = (stepText: string) => {
    if (!selected) return []
    
    const ingredients = getRecipeIngredients(selected)
    
    return ingredients.filter(ing => {
      const stepLower = stepText.toLowerCase()
      const ingredientLower = ing.name.toLowerCase()
      
      return stepLower.includes(ingredientLower) || 
             stepLower.includes(ingredientLower + 's') ||
             stepLower.includes(ingredientLower.slice(0, -1))
    })
  }

  const toggleCategory = (cat: string) => {
    if (formCategories.includes(cat)) {
      setFormCategories(formCategories.filter(c => c !== cat))
    } else {
      setFormCategories([...formCategories, cat])
    }
  }

  const addIngredient = (item: typeof pantryItems[0]) => {
    setFormIngredients([...formIngredients, {
      pantry_item_id: item.id,
      pantry_item_name: item.name,
      quantity: '1',
      unit: item.unit
    }])
    setIngredientSearch('')
    setShowIngredientDropdown(false)
  }

  const removeIngredient = (index: number) => {
    setFormIngredients(formIngredients.filter((_, i) => i !== index))
  }

  const updateIngredientQuantity = (index: number, quantity: string) => {
    const updated = [...formIngredients]
    updated[index].quantity = quantity
    setFormIngredients(updated)
  }

  const updateIngredientUnit = (index: number, unit: string) => {
    const updated = [...formIngredients]
    updated[index].unit = unit
    setFormIngredients(updated)
  }

  const filteredPantryItems = pantryItems.filter(item =>
    item.name.toLowerCase().includes(ingredientSearch.toLowerCase()) &&
    !formIngredients.some(ing => ing.pantry_item_id === item.id)
  )

  return (
    <>
      {showCookingMode && selected ? (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 p-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => {
                  setShowCookingMode(false)
                  setSelectedRecipe(null)
                }}
                className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selected.name}
              </h2>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {currentStep + 1}/{selected.steps.length}
              </div>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-8">
              <div 
                className="bg-gradient-to-r from-orange-500 to-amber-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / selected.steps.length) * 100}%` }}
              />
            </div>

            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl mb-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                  {currentStep + 1}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Étape {currentStep + 1}
                </h3>
              </div>

              <p className="text-base text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                {selected.steps[currentStep]}
              </p>

              {getIngredientFromStep(selected.steps[currentStep]).length > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 mb-4">
                  <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-200 mb-2 flex items-center gap-2">
                    <ChefHat className="w-4 h-4" />
                    Ingrédients nécessaires :
                  </h4>
                  <ul className="space-y-1">
                    {getIngredientFromStep(selected.steps[currentStep]).map((ing, idx) => (
                      <li key={idx} className="text-sm text-orange-800 dark:text-orange-300">
                        • {ing.quantity} {ing.unit} de {ing.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Précédent
              </button>
              
              {currentStep < selected.steps.length - 1 ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  Suivant
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={finishCooking}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Terminer
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div className="glass-strong p-4 rounded-2xl space-y-4 border-2 border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une recette..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {usedCategories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-orange-500 text-white shadow-lg'
                      : 'bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
                  }`}
                >
                  Toutes
                </button>
                {usedCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowImportModal(true)}
                className="px-2 sm:px-3 py-2.5 bg-purple-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-1 sm:gap-2 font-medium text-xs sm:text-sm"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Importer</span>
                <span className="sm:hidden">URL</span>
              </motion.button>

              <motion.label
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-2 sm:px-3 py-2.5 bg-blue-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-1 sm:gap-2 font-medium text-xs sm:text-sm cursor-pointer"
              >
                <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Photo</span>
                <span className="sm:hidden">📷</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoImport}
                  disabled={isProcessingPhoto}
                  className="hidden"
                />
              </motion.label>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCreateModal(true)}
                className="px-2 sm:px-3 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-1 sm:gap-2 font-medium text-xs sm:text-sm"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Créer</span>
              </motion.button>
            </div>
            
            {isProcessingPhoto && (
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                🔍 Analyse de la photo en cours...
              </div>
            )}
          </div>

          {Object.keys(recipesByCategory).length === 0 ? (
            <div className="text-center py-16 glass-strong rounded-2xl border-2 border-gray-200 dark:border-gray-700">
              <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Aucune recette
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Importez ou créez votre première recette
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(recipesByCategory).map(([category, catRecipes]) => {
                const isOpen = openCategories[category] ?? true

                return (
                  <div key={category} className="glass-strong rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setOpenCategories({
                        ...openCategories,
                        [category]: !isOpen
                      })}
                      className="w-full p-4 flex items-center justify-between hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {category}
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                          ({catRecipes.length})
                        </span>
                      </h3>
                      <ChevronDown 
                        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="p-3 pt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {catRecipes.map(recipe => {
                            const canMake = canMakeRecipe(recipe)
                            const missing = getMissingIngredients(recipe)

                            return (
                              <motion.div
                                key={recipe.id}
                                whileHover={{ y: -4 }}
                                onClick={() => setSelectedRecipe(recipe.id)}
                                className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden cursor-pointer hover:shadow-xl transition-all border-2 border-gray-200 dark:border-gray-700"
                              >
                                {recipe.image_url && (
                                  <img
                                    src={recipe.image_url}
                                    alt={recipe.name}
                                    className="w-full h-48 object-cover"
                                  />
                                )}
                                
                                <div className="p-4">
                                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 line-clamp-2">
                                    {recipe.name}
                                  </h3>

                                  {recipe.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                      {recipe.description}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-4 h-4" />
                                      <span>{recipe.duration} min</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Users className="w-4 h-4" />
                                      <span>{recipe.servings} pers.</span>
                                    </div>
                                  </div>

                                  {!canMake && missing.length > 0 && (
                                    <div className="text-xs text-orange-600 dark:text-orange-400 mb-3">
                                      Il manque {missing.length} ingrédient{missing.length > 1 ? 's' : ''}
                                    </div>
                                  )}

                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {recipe.tags.slice(0, 3).map(t => (
                                      <span
                                        key={t}
                                        className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-xs"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openEditModal(recipe)
                                      }}
                                      className="flex-1 p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-1"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDelete(recipe.id, recipe.name)
                                      }}
                                      className="flex-1 p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Recipe Detail Modal */}
      <AnimatePresence>
        {selectedRecipe && selected && !showCookingMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedRecipe(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {selected.image_url && (
                <img
                  src={selected.image_url}
                  alt={selected.name}
                  className="w-full h-64 object-cover rounded-t-2xl"
                />
              )}

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {selected.name}
                    </h2>
                    {selected.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {selected.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedRecipe(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-6 mb-6">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Clock className="w-5 h-5" />
                    <span>{selected.duration} min</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Users className="w-5 h-5" />
                    <span>{selected.servings} personnes</span>
                  </div>
                </div>

                {selected.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selected.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {getRecipeIngredients(selected).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Ingrédients
                    </h3>
                    <ul className="space-y-2">
                      {getRecipeIngredients(selected).map((ing, idx) => {
                        const hasEnough = ing.pantry_item_id 
                          ? hasEnoughIngredient(
                              { quantity: ing.quantity, unit: ing.unit, pantry_item_id: ing.pantry_item_id },
                              pantryItems
                            )
                          : false

                        return (
                          <li
                            key={idx}
                            className={`flex items-center gap-2 ${
                              hasEnough
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            <span className="text-lg">•</span>
                            <span>
                              {ing.quantity} {ing.unit} {ing.name}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {selected.steps.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Instructions
                    </h3>
                    <ol className="space-y-3">
                      {selected.steps.map((step, idx) => (
                        <li key={idx} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white text-sm flex items-center justify-center font-semibold">
                            {idx + 1}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300 flex-1">
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {selected.source_url && (
                  <a
                    href={selected.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 hover:underline mb-6"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Voir la source
                  </a>
                )}

                <button
                  onClick={startCookingMode}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <ChefHat className="w-5 h-5" />
                  Réaliser la recette
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Import Modal */}
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
                💡 Fonctionne avec : Marmiton, 750g, Cuisine AZ, AllRecipes
              </p>
              
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.marmiton.org/..."
                className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none mb-4"
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
                  className="flex-1 px-4 py-2.5 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
                >
                  {isImporting ? 'Import...' : 'Prévisualiser'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Import Preview Modal */}
        {showImportPreview && importPreviewData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowImportPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-playfair font-bold text-gray-900 dark:text-white">
                  Vérifier avant import
                </h2>
                <button
                  onClick={() => {
                    setShowImportPreview(false)
                    setImportPreviewData(null)
                  }}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-sm text-orange-800 dark:text-orange-200">
                ⚠️ Vérifiez et corrigez toutes les informations avant de valider l'import
              </div>

              <div className="space-y-6">
                {/* Recipe Info */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nom de la recette
                    </label>
                    <input
                      type="text"
                      value={importPreviewData.name}
                      onChange={(e) => setImportPreviewData({ ...importPreviewData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Durée (min)
                      </label>
                      <input
                        type="number"
                        value={importPreviewData.duration}
                        onChange={(e) => setImportPreviewData({ ...importPreviewData, duration: parseInt(e.target.value) || 30 })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Portions
                      </label>
                      <input
                        type="number"
                        value={importPreviewData.servings}
                        onChange={(e) => setImportPreviewData({ ...importPreviewData, servings: parseInt(e.target.value) || 4 })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Ingredients */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    Ingrédients ({importPreviewData.ingredients?.length || 0})
                    <span className="text-xs font-normal text-gray-500">
                      ✓ = Match trouvé dans l'inventaire
                    </span>
                  </h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {importPreviewData.ingredients?.map((ing: any, idx: number) => {
                      const matchInfo = ingredientMatches.get(idx)
                      const hasMatch = matchInfo?.match
                      const hasSuggestions = matchInfo?.suggestions?.length > 0
                      
                      return (
                        <div key={idx} className="space-y-1">
                          <div className={`flex gap-2 items-center p-2 rounded-lg ${
                            hasMatch 
                              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                              : 'bg-gray-50 dark:bg-gray-700/50'
                          }`}>
                            {/* Match indicator */}
                            {hasMatch && (
                              <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                            
                            <input
                              type="text"
                              value={ing.name}
                              onChange={(e) => updatePreviewIngredient(idx, 'name', e.target.value)}
                              className="flex-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-sm"
                              placeholder="Nom"
                            />
                            <input
                              type="number"
                              value={ing.quantity}
                              onChange={(e) => updatePreviewIngredient(idx, 'quantity', parseFloat(e.target.value) || 1)}
                              className="w-20 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-sm"
                              placeholder="Qté"
                            />
                            <select
                              value={ing.unit}
                              onChange={(e) => updatePreviewIngredient(idx, 'unit', e.target.value)}
                              className="w-24 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-sm"
                            >
                              <option value="g">g</option>
                              <option value="kg">kg</option>
                              <option value="ml">ml</option>
                              <option value="l">l</option>
                              <option value="cl">cl</option>
                              <option value="pièce(s)">pièce(s)</option>
                              <option value="c. à soupe">c. à soupe</option>
                              <option value="c. à café">c. à café</option>
                              <option value="gousse(s)">gousse(s)</option>
                              <option value="brin(s)">brin(s)</option>
                              <option value="tranche(s)">tranche(s)</option>
                              <option value="pincée(s)">pincée(s)</option>
                              <option value="botte(s)">botte(s)</option>
                              <option value="pot(s)">pot(s)</option>
                              <option value="sachet(s)">sachet(s)</option>
                              <option value="filet(s)">filet(s)</option>
                              <option value="noix">noix</option>
                              <option value="verre">verre</option>
                              <option value="tasse">tasse</option>
                            </select>
                            <button
                              onClick={() => removePreviewIngredient(idx)}
                              className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {/* Match info */}
                          {hasMatch && (
                            <div className="pl-8 text-xs text-green-700 dark:text-green-300">
                              → Match avec "{matchInfo.match.name}" dans {matchInfo.match.location}
                            </div>
                          )}
                          
                          {/* Suggestions for unmatched */}
                          {!hasMatch && hasSuggestions && (
                            <div className="pl-8">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Suggestions:
                              </p>
                              <div className="flex gap-1 flex-wrap">
                                {matchInfo.suggestions.map((suggestion: any) => (
                                  <button
                                    key={suggestion.id}
                                    onClick={() => updatePreviewIngredient(idx, 'name', suggestion.name)}
                                    className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                                  >
                                    {suggestion.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                         
                {/* Steps */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    Étapes ({importPreviewData.steps?.length || 0})
                    <button
                      onClick={addPreviewStep}
                      className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      + Ajouter
                    </button>
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {importPreviewData.steps?.map((step: string, idx: number) => (
                      <div key={idx} className="flex gap-2 items-start bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                        <span className="text-sm font-medium text-gray-500 mt-2 min-w-[20px]">
                          {idx + 1}.
                        </span>
                        <textarea
                          value={step}
                          onChange={(e) => updatePreviewStep(idx, e.target.value)}
                          className="flex-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-sm"
                          rows={2}
                          placeholder="Étape..."
                        />
                        <button
                          onClick={() => removePreviewStep(idx)}
                          className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowImportPreview(false)
                    setShowImportModal(true)
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={confirmImport}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  Confirmer l'import
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-playfair font-bold text-gray-900 dark:text-white">
                  Créer une recette
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom de la recette
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Pâtes carbonara"
                    className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Catégories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {RECIPE_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          formCategories.includes(cat)
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Durée (min)
                    </label>
                    <input
                      type="number"
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                      placeholder="30"
                      className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Portions
                    </label>
                    <input
                      type="number"
                      value={formServings}
                      onChange={(e) => setFormServings(e.target.value)}
                      placeholder="4"
                      className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Une délicieuse recette italienne..."
                    rows={2}
                    className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                  />
                </div>

                {/* Ingredients with Autocomplete */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ingrédients
                  </label>
                  
                  {/* Ingredient List */}
                  <div className="space-y-2 mb-3">
                    {formIngredients.map((ing, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                        <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                          {ing.pantry_item_name}
                        </div>
                        <input
                          type="number"
                          value={ing.quantity}
                          onChange={(e) => updateIngredientQuantity(idx, e.target.value)}
                          className="w-16 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-sm"
                          placeholder="1"
                        />
                        <select
                          value={ing.unit}
                          onChange={(e) => updateIngredientUnit(idx, e.target.value)}
                          className="w-20 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-sm"
                        >
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                          <option value="pièce(s)">pièce(s)</option>
                          <option value="c. à soupe">c. à soupe</option>
                          <option value="c. à café">c. à café</option>
                        </select>
                        <button
                          onClick={() => removeIngredient(idx)}
                          className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Autocomplete Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={ingredientSearch}
                      onChange={(e) => {
                        setIngredientSearch(e.target.value)
                        setShowIngredientDropdown(true)
                      }}
                      onFocus={() => setShowIngredientDropdown(true)}
                      placeholder="Ajouter un ingrédient de l'inventaire..."
                      className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    
                    {showIngredientDropdown && ingredientSearch && filteredPantryItems.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {filteredPantryItems.slice(0, 5).map(item => (
                          <button
                            key={item.id}
                            onClick={() => addIngredient(item)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Stock: {item.quantity} {item.unit} • {item.location}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Instructions (une par ligne)
                  </label>
                  <textarea
                    value={formInstructions}
                    onChange={(e) => setFormInstructions(e.target.value)}
                    placeholder="Faire bouillir l'eau&#10;Cuire les pâtes..."
                    rows={6}
                    className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags supplémentaires (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="Italien, Rapide, Facile"
                    className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateRecipe}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  Créer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-playfair font-bold text-gray-900 dark:text-white">
                  Modifier la recette
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom de la recette
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Catégories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {RECIPE_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          formCategories.includes(cat)
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Durée (min)
                    </label>
                    <input
                      type="number"
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Portions
                    </label>
                    <input
                      type="number"
                      value={formServings}
                      onChange={(e) => setFormServings(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ingrédients
                  </label>
                  <div className="space-y-2 mb-3">
                    {formIngredients.map((ing, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                        <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                          {ing.pantry_item_name}
                        </div>
                        <input
                          type="number"
                          value={ing.quantity}
                          onChange={(e) => updateIngredientQuantity(idx, e.target.value)}
                          className="w-16 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-sm"
                        />
                        <select
                          value={ing.unit}
                          onChange={(e) => updateIngredientUnit(idx, e.target.value)}
                          className="w-20 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-sm"
                        >
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                          <option value="pièce(s)">pièce(s)</option>
                          <option value="c. à soupe">c. à soupe</option>
                          <option value="c. à café">c. à café</option>
                        </select>
                        <button
                          onClick={() => removeIngredient(idx)}
                          className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={ingredientSearch}
                      onChange={(e) => {
                        setIngredientSearch(e.target.value)
                        setShowIngredientDropdown(true)
                      }}
                      onFocus={() => setShowIngredientDropdown(true)}
                      placeholder="Ajouter un ingrédient..."
                      className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    
                    {showIngredientDropdown && ingredientSearch && filteredPantryItems.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {filteredPantryItems.slice(0, 5).map(item => (
                          <button
                            key={item.id}
                            onClick={() => addIngredient(item)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Stock: {item.quantity} {item.unit} • {item.location}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Instructions (une par ligne)
                  </label>
                  <textarea
                    value={formInstructions}
                    onChange={(e) => setFormInstructions(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags supplémentaires
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleEditRecipe}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  Sauvegarder
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
