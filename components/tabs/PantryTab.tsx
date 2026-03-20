'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import { Plus, Search, AlertCircle, Trash2, Edit2, X, Check, Package, Snowflake, Home, Wine, ChevronDown } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

const LOCATIONS = [
  { id: 'Frigo', label: 'Frigo', icon: Package, color: 'bg-blue-500' },
  { id: 'Congélateur', label: 'Congélateur', icon: Snowflake, color: 'bg-cyan-500' },
  { id: 'Placard', label: 'Placard', icon: Home, color: 'bg-amber-500' },
  { id: 'Cave', label: 'Cave', icon: Wine, color: 'bg-purple-500' },
]

const CATEGORIES = [
  'Légumes', 'Fruits', 'Viande', 'Poisson', 'Produits laitiers',
  'Épicerie', 'Boissons', 'Condiments', 'Surgelés', 'Autre'
]

export default function PantryTab() {
  const { pantryItems, addPantryItem, updatePantryItem, deletePantryItem } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editUnit, setEditUnit] = useState('g')
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({})
  const [editingItemFull, setEditingItemFull] = useState<string | null>(null)
  const [editFormLocation, setEditFormLocation] = useState('')
  const [editFormCategory, setEditFormCategory] = useState('')
  const [editFormName, setEditFormName] = useState('')
  
  // Form state
  const [formName, setFormName] = useState('')
  const [formQuantity, setFormQuantity] = useState('')
  const [formUnit, setFormUnit] = useState('g')
  const [formLocation, setFormLocation] = useState('Frigo')
  const [formCategory, setFormCategory] = useState('Autre')
  const [formExpiry, setFormExpiry] = useState('')

  // Filter items
  const filteredItems = pantryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLocation = selectedLocation === 'all' || item.location === selectedLocation
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    return matchesSearch && matchesLocation && matchesCategory
  })

  // Group by category
  const itemsByCategory = filteredItems.reduce((acc, item) => {
    const cat = item.category || 'Autre'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {} as Record<string, typeof pantryItems>)

  const expiredCount = pantryItems.filter(item => {
    if (!item.expiry_date) return false
    return differenceInDays(new Date(item.expiry_date), new Date()) < 0
  }).length

  const expiringCount = pantryItems.filter(item => {
    if (!item.expiry_date) return false
    const days = differenceInDays(new Date(item.expiry_date), new Date())
    return days >= 0 && days <= 3
  }).length

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null
    const days = differenceInDays(new Date(expiryDate), new Date())
    if (days < 0) return { label: 'Expiré', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' }
    if (days <= 3) return { label: `${days}j`, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' }
    if (days <= 7) return { label: `${days}j`, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' }
    return { label: `${days}j`, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' }
  }

  const handleAddItem = async () => {
    if (!formName.trim() || !formQuantity) {
      toast.error('Nom et quantité requis')
      return
    }

    try {
      await addPantryItem({
        user_id: 'temp-user-id',
        name: formName.trim(),
        quantity: parseFloat(formQuantity),
        unit: formUnit,
        location: formLocation,
        category: formCategory,
        expiry_date: formExpiry || null,
      })
      
      toast.success('Produit ajouté !')
      setShowAddModal(false)
      setFormName('')
      setFormQuantity('')
      setFormUnit('g')
      setFormExpiry('')
    } catch (error) {
      toast.error('Erreur lors de l\'ajout')
    }
  }

  const handleUpdateQuantity = async (id: string) => {
    const qty = parseFloat(editQuantity)
    if (isNaN(qty) || qty < 0) {
      toast.error('Quantité invalide')
      return
    }

    try {
      await updatePantryItem(id, { quantity: qty, unit: editUnit })
      toast.success('Quantité mise à jour')
      setEditingItem(null)
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer "${name}" ?`)) return
    
    try {
      await deletePantryItem(id)
      toast.success('Produit supprimé')
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      {(expiredCount > 0 || expiringCount > 0) && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {expiredCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong p-3 sm:p-4 rounded-xl border-l-4 border-red-500"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-red-600">{expiredCount}</div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Expirés</div>
                </div>
              </div>
            </motion.div>
          )}
          
          {expiringCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong p-3 sm:p-4 rounded-xl border-l-4 border-orange-500"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-orange-600">{expiringCount}</div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">À consommer</div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="glass-strong p-3 sm:p-4 rounded-xl space-y-3 sm:space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
          />
        </div>

        {/* Location filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          <button
            onClick={() => setSelectedLocation('all')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              selectedLocation === 'all'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
            }`}
          >
            Tous
          </button>
          {LOCATIONS.map(loc => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocation(loc.id)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 sm:gap-2 ${
                selectedLocation === loc.id
                  ? `${loc.color} text-white shadow-lg`
                  : 'bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
              }`}
            >
              <loc.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{loc.label}</span>
            </button>
          ))}
        </div>

        {/* Category filter */}
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
          {CATEGORIES.map(cat => (
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

        {/* Add button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg sm:rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          Ajouter un produit
        </button>
      </div>

      {/* Items by category */}
      {Object.keys(itemsByCategory).length === 0 ? (
        <div className="text-center py-12 sm:py-16 glass-strong rounded-xl sm:rounded-2xl">
          <Package className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300 dark:text-gray-700" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Garde-manger vide
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Ajoutez vos premiers produits
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {Object.entries(itemsByCategory).map(([category, items]) => {
            const isOpen = openCategories[category] ?? true
            
            return (
              <div key={category} className="glass-strong rounded-2xl overflow-hidden mb-4">
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
                      ({items.length})
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                      {items.map((item, index) => {
                        const expiryStatus = getExpiryStatus(item.expiry_date)
                        const isEditing = editingItem === item.id
                        
                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.03 }}
                            className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-xl transition-all"
                          >
                            <div className="p-3 sm:p-4 flex flex-col h-full min-h-[180px]">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm sm:text-base line-clamp-2">
                                  {item.name}
                                </h4>

                                {isEditing ? (
                                  <div className="mb-2 space-y-1.5">
                                    <div className="grid grid-cols-2 gap-1.5">
                                      <input
                                        type="number"
                                        value={editQuantity}
                                        onChange={(e) => setEditQuantity(e.target.value)}
                                        className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                                        autoFocus
                                      />
                                      <select
                                        value={editUnit}
                                        onChange={(e) => setEditUnit(e.target.value)}
                                        className="w-full px-1.5 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                                      >
                                        <option value="g">g</option>
                                        <option value="kg">kg</option>
                                        <option value="ml">ml</option>
                                        <option value="l">L</option>
                                        <option value="pièce(s)">pc</option>
                                      </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      <button
                                        onClick={() => handleUpdateQuantity(item.id)}
                                        className="w-full py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs font-medium"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        onClick={() => setEditingItem(null)}
                                        className="w-full py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-xs font-medium"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingItem(item.id)
                                      setEditQuantity(String(item.quantity))
                                      setEditUnit(item.unit)
                                    }}
                                    className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400 mb-2 hover:text-orange-700 dark:hover:text-orange-300 transition-colors block w-full text-left"
                                  >
                                    {item.quantity} {item.unit}
                                  </button>
                                )}

                                {expiryStatus && (
                                  <div className={`text-xs px-2 py-1 rounded-lg mb-2 ${expiryStatus.bg}`}>
                                    <span className={`font-medium ${expiryStatus.color}`}>
                                      {expiryStatus.label}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-1 sm:gap-2 mt-auto">
                                <button
                                  onClick={() => {
                                    setEditingItemFull(item.id)
                                    setEditFormLocation(item.location)
                                    setEditFormCategory(item.category)
                                    setEditFormName(item.name)
                                  }}
                                  className="flex-1 p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mx-auto" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id, item.name)}
                                  className="flex-1 p-1.5 sm:p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mx-auto" />
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

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong p-4 sm:p-6 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  Ajouter un produit
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    placeholder="Ex: Tomates"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quantité
                    </label>
                    <input
                      type="number"
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Unité
                    </label>
                    <select
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="l">L</option>
                      <option value="pièce(s)">pièce(s)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Emplacement
                  </label>
                  <select
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  >
                    {LOCATIONS.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Catégorie
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date d'expiration (optionnel)
                  </label>
                  <input
                    type="date"
                    value={formExpiry}
                    onChange={(e) => setFormExpiry(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddItem}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  Ajouter
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {editingItemFull && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setEditingItemFull(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  Modifier le produit
                </h2>
                <button
                  onClick={() => setEditingItemFull(null)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom du produit
                  </label>
                  <input
                    type="text"
                    value={editFormName}
                    onChange={(e) => setEditFormName(e.target.value)}
                    placeholder="Ex: Tomates"
                    className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Emplacement
                  </label>
                  <select
                    value={editFormLocation}
                    onChange={(e) => setEditFormLocation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    {LOCATIONS.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Catégorie
                  </label>
                  <select
                    value={editFormCategory}
                    onChange={(e) => setEditFormCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingItemFull(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    if (!editFormName.trim()) {
                      toast.error('Le nom est requis')
                      return
                    }
                    try {
                      await updatePantryItem(editingItemFull, {
                        name: editFormName.trim(),
                        location: editFormLocation,
                        category: editFormCategory
                      })
                      toast.success('Produit modifié !')
                      setEditingItemFull(null)
                    } catch (error) {
                      toast.error('Erreur lors de la modification')
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  Sauvegarder
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
