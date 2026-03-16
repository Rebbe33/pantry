'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore, PantryItem } from '@/lib/store'
import { 
  Plus, 
  Search, 
  Filter,
  Clock,
  AlertCircle,
  Trash2,
  Edit,
  Package,
  Snowflake,
  Home,
  Wine,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

const LOCATIONS = [
  { id: 'fridge', label: 'Frigo', icon: Package, color: 'blue' },
  { id: 'freezer', label: 'Congélateur', icon: Snowflake, color: 'cyan' },
  { id: 'pantry', label: 'Placard', icon: Home, color: 'amber' },
  { id: 'cellar', label: 'Cave', icon: Wine, color: 'purple' },
]

const CATEGORIES = [
  'Légumes', 'Fruits', 'Viande', 'Poisson', 'Produits laitiers',
  'Épicerie', 'Boissons', 'Condiments', 'Surgelés', 'Autre'
]

export default function PantryTab() {
  const { pantryItems, deletePantryItem } = useStore()
  const [search, setSearch] = useState('')
  const [filterLocation, setFilterLocation] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = pantryItems.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const matchLocation = filterLocation === 'all' || item.location === filterLocation
    const matchCategory = filterCategory === 'all' || item.category === filterCategory
    return matchSearch && matchLocation && matchCategory
  })

  const expiringSoon = pantryItems.filter(item => {
    if (!item.expiry_date) return false
    const days = differenceInDays(new Date(item.expiry_date), new Date())
    return days >= 0 && days <= 5
  })

  const expired = pantryItems.filter(item => {
    if (!item.expiry_date) return false
    return new Date(item.expiry_date) < new Date()
  })

  const handleDelete = async (id: string) => {
    try {
      await deletePantryItem(id)
      toast.success('Produit supprimé')
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null
    const days = differenceInDays(new Date(expiryDate), new Date())
    
    if (days < 0) {
      return { label: `Expiré depuis ${Math.abs(days)}j`, color: 'red', severity: 'high' }
    } else if (days === 0) {
      return { label: "Expire aujourd'hui", color: 'red', severity: 'high' }
    } else if (days <= 3) {
      return { label: `Expire dans ${days}j`, color: 'yellow', severity: 'medium' }
    } else if (days <= 7) {
      return { label: `Expire dans ${days}j`, color: 'orange', severity: 'low' }
    }
    return { label: `${days} jours`, color: 'green', severity: 'none' }
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {(expiringSoon.length > 0 || expired.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {expired.length > 0 && (
            <div className="glass p-4 rounded-2xl border-l-4 border-red-500">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-700 dark:text-red-400 mb-1">
                    {expired.length} produit{expired.length > 1 ? 's' : ''} expiré{expired.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {expired.map(item => item.name).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {expiringSoon.length > 0 && (
            <div className="glass p-4 rounded-2xl border-l-4 border-yellow-500">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-700 dark:text-yellow-400 mb-1">
                    {expiringSoon.length} produit{expiringSoon.length > 1 ? 's' : ''} à consommer rapidement
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {expiringSoon.map(item => item.name).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Toolbar */}
      <div className="glass p-4 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Filter Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`
              px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2
              ${showFilters 
                ? 'bg-orange-500 text-white shadow-glow' 
                : 'bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800'
              }
            `}
          >
            <Filter className="w-5 h-5" />
            <span className="hidden sm:inline">Filtres</span>
          </motion.button>

          {/* Add Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl shadow-glow hover:shadow-glow-strong transition-all flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Ajouter</span>
          </motion.button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700"
          >
            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Emplacement
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterLocation('all')}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${filterLocation === 'all'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800'
                    }
                  `}
                >
                  Tous
                </button>
                {LOCATIONS.map(loc => {
                  const Icon = loc.icon
                  const isActive = filterLocation === loc.id
                  return (
                    <button
                      key={loc.id}
                      onClick={() => setFilterLocation(loc.id)}
                      className={`
                        px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5
                        ${isActive
                          ? 'bg-orange-500 text-white'
                          : 'bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      {loc.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Catégorie
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
              >
                <option value="all">Toutes les catégories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((item, index) => {
          const expiryStatus = getExpiryStatus(item.expiry_date)
          const location = LOCATIONS.find(l => l.id === item.location)
          const LocationIcon = location?.icon || Package

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="glass p-4 rounded-2xl hover:shadow-glow transition-all group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {item.quantity} {item.unit}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors">
                    <Edit className="w-4 h-4 text-orange-600" />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  <LocationIcon className="w-3 h-3" />
                  {location?.label}
                </span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium">
                  {item.category}
                </span>
              </div>

              {/* Expiry */}
              {expiryStatus && (
                <div className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                  ${expiryStatus.severity === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                    expiryStatus.severity === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                    expiryStatus.severity === 'low' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  }
                `}>
                  <Clock className="w-3.5 h-3.5" />
                  {expiryStatus.label}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Aucun produit trouvé
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {search || filterLocation !== 'all' || filterCategory !== 'all'
              ? 'Essayez de modifier vos filtres'
              : 'Commencez par ajouter des produits à votre garde-manger'
            }
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl shadow-glow hover:shadow-glow-strong transition-all font-medium"
          >
            Ajouter un produit
          </motion.button>
        </motion.div>
      )}
    </div>
  )
}
