'use client'

import { motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { Package, AlertTriangle, Clock, ChefHat, Calendar, TrendingUp } from 'lucide-react'
import { differenceInDays } from 'date-fns'

const LOCATIONS = ['fridge', 'freezer', 'pantry', 'cellar']
const LOCATION_LABELS = { fridge: 'Frigo', freezer: 'Congélateur', pantry: 'Placard', cellar: 'Cave' }

export default function StatsTab() {
  const { pantryItems, recipes, menuItems } = useStore()

  // Calculate stats
  const expiredCount = pantryItems.filter(item => {
    if (!item.expiry_date) return false
    return new Date(item.expiry_date) < new Date()
  }).length

  const expiringSoonCount = pantryItems.filter(item => {
    if (!item.expiry_date) return false
    const days = differenceInDays(new Date(item.expiry_date), new Date())
    return days >= 0 && days <= 5
  }).length

  const byLocation = LOCATIONS.map(loc => ({
    location: LOCATION_LABELS[loc as keyof typeof LOCATION_LABELS],
    count: pantryItems.filter(p => p.location === loc).length,
  }))

  const categories = [...new Set(pantryItems.map(p => p.category))]
  const byCategory = categories
    .map(cat => ({
      category: cat,
      count: pantryItems.filter(p => p.category === cat).length,
    }))
    .sort((a, b) => b.count - a.count)

  const totalMenuSlots = 14 // 7 days × 2 meals
  const filledMenuSlots = menuItems.length

  const stats = [
    {
      label: 'Produits en stock',
      value: pantryItems.length,
      icon: Package,
      color: 'from-orange-400 to-amber-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      textColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      label: 'Produits expirés',
      value: expiredCount,
      icon: AlertTriangle,
      color: expiredCount > 0 ? 'from-red-400 to-rose-500' : 'from-green-400 to-emerald-500',
      bgColor: expiredCount > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30',
      textColor: expiredCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Expirent bientôt',
      value: expiringSoonCount,
      icon: Clock,
      color: expiringSoonCount > 0 ? 'from-yellow-400 to-orange-500' : 'from-green-400 to-emerald-500',
      bgColor: expiringSoonCount > 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-green-100 dark:bg-green-900/30',
      textColor: expiringSoonCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Recettes',
      value: recipes.length,
      icon: ChefHat,
      color: 'from-purple-400 to-pink-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Repas planifiés',
      value: `${filledMenuSlots}/${totalMenuSlots}`,
      icon: Calendar,
      color: 'from-blue-400 to-cyan-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass p-6 rounded-2xl hover:shadow-glow transition-all group"
            >
              <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
              <div className={`text-3xl font-bold font-playfair bg-gradient-to-br ${stat.color} bg-clip-text text-transparent mb-1`}>
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Location */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass p-6 rounded-2xl"
        >
          <h3 className="font-playfair font-bold text-gray-900 dark:text-white mb-6">
            Répartition par emplacement
          </h3>
          <div className="space-y-4">
            {byLocation.map((item, index) => {
              const percentage = pantryItems.length > 0 
                ? (item.count / pantryItems.length) * 100 
                : 0

              return (
                <div key={item.location}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {item.location}
                    </span>
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      {item.count}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* By Category */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass p-6 rounded-2xl"
        >
          <h3 className="font-playfair font-bold text-gray-900 dark:text-white mb-6">
            Top catégories
          </h3>
          <div className="space-y-4">
            {byCategory.slice(0, 5).map((item, index) => {
              const maxCount = byCategory[0]?.count || 1
              const percentage = (item.count / maxCount) * 100

              return (
                <div key={item.category}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {item.category}
                    </span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      {item.count}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* Menu Completion */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-6 rounded-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-playfair font-bold text-gray-900 dark:text-white">
            Planification hebdomadaire
          </h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filledMenuSlots} / {totalMenuSlots} repas
          </span>
        </div>
        
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(filledMenuSlots / totalMenuSlots) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full relative overflow-hidden"
          >
            <div className="absolute inset-0 shimmer" />
          </motion.div>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {filledMenuSlots === totalMenuSlots ? (
            <span className="text-green-600 dark:text-green-400 font-medium">
              ✓ Votre semaine est complètement planifiée !
            </span>
          ) : filledMenuSlots >= totalMenuSlots / 2 ? (
            <span className="text-blue-600 dark:text-blue-400">
              Vous êtes sur la bonne voie ! Encore {totalMenuSlots - filledMenuSlots} repas à planifier.
            </span>
          ) : (
            <span>
              Planifiez vos repas pour optimiser vos courses et réduire le gaspillage.
            </span>
          )}
        </div>
      </motion.div>

      {/* Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-6 rounded-2xl border-l-4 border-orange-500"
        >
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Emplacement le plus utilisé
            </h4>
          </div>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 font-playfair">
            {byLocation.reduce((max, loc) => loc.count > max.count ? loc : max, byLocation[0])?.location || 'N/A'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {byLocation.reduce((max, loc) => loc.count > max.count ? loc : max, byLocation[0])?.count || 0} produits
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass p-6 rounded-2xl border-l-4 border-purple-500"
        >
          <div className="flex items-center gap-3 mb-2">
            <ChefHat className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Recettes disponibles
            </h4>
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-playfair">
            {recipes.length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {recipes.length === 0 
              ? 'Commencez à créer des recettes !' 
              : `Moyenne ${Math.round(recipes.reduce((sum, r) => sum + r.duration, 0) / recipes.length)} min`
            }
          </p>
        </motion.div>
      </div>
    </div>
  )
}
