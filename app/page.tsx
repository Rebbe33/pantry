'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { 
  ChefHat, 
  ShoppingCart, 
  Book, 
  Calendar, 
  Lightbulb, 
  BarChart3,
  Moon,
  Sun,
  Plus,
  Settings,
  Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import PantryTab from '@/components/tabs/PantryTab'
import RecipesTab from '@/components/tabs/RecipesTab'
import MenuTab from '@/components/tabs/MenuTab'
import ShoppingTab from '@/components/tabs/ShoppingTab'
import SuggestionsTab from '@/components/tabs/SuggestionsTab'
import StatsTab from '@/components/tabs/StatsTab'

const tabs = [
  { id: 'pantry', label: 'Garde-manger', icon: ChefHat },
  { id: 'recipes', label: 'Recettes', icon: Book },
  { id: 'menu', label: 'Menu', icon: Calendar },
  { id: 'shopping', label: 'Courses', icon: ShoppingCart },
  { id: 'suggestions', label: 'Suggestions', icon: Lightbulb },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState('pantry')
  const { isDark, toggleTheme, pantryItems } = useStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
      useStore.setState({ isDark: true })
    }
  }, [])

  if (!mounted) {
    return null
  }

  const expiredCount = pantryItems.filter(item => {
    if (!item.expiry_date) return false
    return new Date(item.expiry_date) < new Date()
  }).length

  return (
    <div className="min-h-screen">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-orange-300/20 via-transparent to-transparent dark:from-orange-900/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-amber-300/20 via-transparent to-transparent dark:from-amber-900/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 glass-strong shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl blur-sm opacity-75" />
                <div className="relative bg-gradient-to-br from-orange-500 to-amber-600 p-2.5 sm:p-3 rounded-2xl shadow-glow">
                  <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="font-playfair text-lg sm:text-2xl font-bold text-gradient">
                  Mon Garde-Manger
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">
                  {pantryItems.length} produits en stock
                </p>
              </div>
            </motion.div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className="p-2 sm:p-2.5 rounded-xl glass hover:shadow-glow transition-all"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                )}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl shadow-glow hover:shadow-glow-strong transition-all"
              >
                <Settings className="w-4 h-4" />
                <span className="font-medium">Paramètres</span>
              </motion.button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center gap-2 px-3 sm:px-4 py-3 rounded-t-xl font-medium text-sm
                    transition-all whitespace-nowrap
                    ${isActive 
                      ? 'text-orange-600 dark:text-orange-400' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-300'
                    }
                  `}
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  
                  {tab.id === 'pantry' && expiredCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                      {expiredCount}
                    </span>
                  )}
                  
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'pantry' && <PantryTab />}
            {activeTab === 'recipes' && <RecipesTab />}
            {activeTab === 'menu' && <MenuTab />}
            {activeTab === 'shopping' && <ShoppingTab />}
            {activeTab === 'suggestions' && <SuggestionsTab />}
            {activeTab === 'stats' && <StatsTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Action Button (Mobile) */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="sm:hidden fixed bottom-6 right-6 p-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-full shadow-glow-strong z-40"
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </div>
  )
}
