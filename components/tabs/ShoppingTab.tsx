'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { Download, Plus, Check, ShoppingCart, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ShoppingTab() {
  const { menuItems, recipes, pantryItems } = useStore()
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [customItems, setCustomItems] = useState<string[]>([])
  const [newItem, setNewItem] = useState('')

  // Aggregate ingredients from menu
  const neededIngredients = menuItems.reduce((acc, menuItem) => {
    const recipe = recipes.find(r => r.id === menuItem.recipe_id)
    if (!recipe) return acc

    recipe.ingredients.forEach(ing => {
      const key = ing.name.toLowerCase()
      if (acc[key]) {
        acc[key].quantity += ing.quantity
      } else {
        acc[key] = { ...ing }
      }
    })

    return acc
  }, {} as Record<string, { name: string; quantity: number; unit: string }>)

  // Check against pantry
  const shoppingList = Object.values(neededIngredients).map(ing => {
    const pantryItem = pantryItems.find(
      p => p.name.toLowerCase() === ing.name.toLowerCase()
    )
    const hasQty = pantryItem?.quantity || 0
    const missing = Math.max(0, ing.quantity - hasQty)

    return {
      ...ing,
      hasQty,
      missing,
      needToBuy: missing > 0,
    }
  })

  const toBuy = shoppingList.filter(item => item.needToBuy)
  const inStock = shoppingList.filter(item => !item.needToBuy)

  const totalItems = toBuy.length + customItems.length
  const checkedCount = checkedItems.size
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0

  const toggleCheck = (itemName: string) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(itemName)) {
      newChecked.delete(itemName)
    } else {
      newChecked.add(itemName)
    }
    setCheckedItems(newChecked)
  }

  const addCustomItem = () => {
    if (!newItem.trim()) return
    setCustomItems([...customItems, newItem.trim()])
    setNewItem('')
  }

  const removeCustomItem = (index: number) => {
    setCustomItems(customItems.filter((_, i) => i !== index))
  }

  const exportList = () => {
    const lines = [
      '📋 LISTE DE COURSES\n',
      '─────────────────────',
      '\n📦 Ingrédients nécessaires :',
      ...toBuy.filter(i => !checkedItems.has(i.name)).map(
        i => `  ☐ ${i.name} — ${i.missing} ${i.unit}`
      ),
      customItems.length > 0 ? '\n🛍️ Articles personnalisés :' : '',
      ...customItems.filter(i => !checkedItems.has(i)).map(i => `  ☐ ${i}`),
    ].filter(Boolean).join('\n')

    const blob = new Blob([lines], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'liste-courses.txt'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Liste exportée')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress */}
      {totalItems > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-playfair font-bold text-gray-900 dark:text-white">
              Progression
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {checkedCount} / {totalItems}
            </span>
          </div>
          
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
            />
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="glass p-4 rounded-2xl flex items-center justify-between gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {toBuy.length === 0 && customItems.length === 0 ? (
            <span>Aucun article — planifiez votre menu d'abord</span>
          ) : (
            <span>{toBuy.length + customItems.length} article{(toBuy.length + customItems.length) > 1 ? 's' : ''}</span>
          )}
        </div>

        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCheckedItems(new Set())}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Tout décocher
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportList}
            className="px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl text-sm font-medium shadow-glow hover:shadow-glow-strong transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exporter
          </motion.button>
        </div>
      </div>

      {/* Shopping List */}
      <div className="space-y-4">
        {/* To Buy */}
        {toBuy.length > 0 && (
          <div className="glass p-6 rounded-2xl">
            <h3 className="font-playfair font-bold text-gray-900 dark:text-white mb-4">
              À acheter
            </h3>
            <div className="space-y-2">
              {toBuy.map((item, index) => {
                const isChecked = checkedItems.has(item.name)
                
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => toggleCheck(item.name)}
                    className={`
                      p-4 rounded-xl cursor-pointer transition-all flex items-center gap-4
                      ${isChecked 
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                        : 'bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    <div className={`
                      w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all
                      ${isChecked 
                        ? 'bg-green-500 border-green-500' 
                        : 'border-gray-300 dark:border-gray-600'
                      }
                    `}>
                      {isChecked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                    </div>

                    <div className="flex-1">
                      <div className={`font-medium ${isChecked ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        {item.name}
                      </div>
                      {item.hasQty > 0 && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {item.hasQty} {item.unit} en stock
                        </div>
                      )}
                    </div>

                    <div className={`font-bold ${isChecked ? 'text-gray-500' : 'text-orange-600 dark:text-orange-400'}`}>
                      {item.missing} {item.unit}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Custom Items */}
        <div className="glass p-6 rounded-2xl">
          <h3 className="font-playfair font-bold text-gray-900 dark:text-white mb-4">
            Articles personnalisés
          </h3>

          <div className="space-y-2 mb-4">
            {customItems.map((item, index) => {
              const isChecked = checkedItems.has(item)
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`
                    p-4 rounded-xl cursor-pointer transition-all flex items-center gap-4
                    ${isChecked 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                      : 'bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <div 
                    onClick={() => toggleCheck(item)}
                    className={`
                      w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all
                      ${isChecked 
                        ? 'bg-green-500 border-green-500' 
                        : 'border-gray-300 dark:border-gray-600'
                      }
                    `}
                  >
                    {isChecked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </div>

                  <div 
                    onClick={() => toggleCheck(item)}
                    className={`flex-1 font-medium ${isChecked ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}
                  >
                    {item}
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); removeCustomItem(index) }}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </motion.div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
              placeholder="Ajouter un article..."
              className="flex-1 px-4 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={addCustomItem}
              className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl shadow-glow hover:shadow-glow-strong transition-all"
            >
              <Plus className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Already in Stock */}
        {inStock.length > 0 && (
          <details className="glass p-6 rounded-2xl">
            <summary className="cursor-pointer font-playfair font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
              <Check className="w-5 h-5" />
              Déjà en stock ({inStock.length})
            </summary>
            <div className="mt-4 space-y-2">
              {inStock.map(item => (
                <div
                  key={item.name}
                  className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl flex justify-between items-center text-sm"
                >
                  <span className="text-green-700 dark:text-green-300 font-medium">
                    ✓ {item.name}
                  </span>
                  <span className="text-green-600 dark:text-green-400">
                    {item.hasQty} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Empty State */}
      {toBuy.length === 0 && customItems.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 glass rounded-2xl"
        >
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Liste vide
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Planifiez votre menu pour générer automatiquement votre liste de courses
          </p>
        </motion.div>
      )}
    </div>
  )
}
