// Ingredient matching helper for recipe imports
// Matches imported ingredients with existing pantry items

import { PantryItem } from './store'

// Compound ingredients that should NOT be split
const COMPOUND_INGREDIENTS = [
  'sauce tomate',
  'concentré de tomate',
  'purée de tomates',
  'coulis de tomates',
  'jaune d\'oeuf',
  'jaune d\'œuf',
  'blanc d\'oeuf',
  'blanc d\'œuf',
  'jus de citron',
  'jus d\'orange',
  'zeste de citron',
  'huile d\'olive',
  'huile de tournesol',
  'huile végétale',
  'vinaigre balsamique',
  'vinaigre de vin',
  'pâte feuilletée',
  'pâte brisée',
  'pâte sablée',
  'crème fraîche',
  'crème liquide',
  'lait de coco',
  'noix de coco',
  'poudre d\'amande',
  'poudre de cacao',
  'levure chimique',
  'bicarbonate de soude',
  'papier sulfurisé',
  'bouillon de légumes',
  'bouillon de poulet',
  'bouillon de boeuf',
  'fond de veau',
]

/**
 * Calculate Levenshtein distance between two strings
 * (for fuzzy matching)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[len1][len2]
}

/**
 * Clean and normalize ingredient name for matching
 */
export function cleanIngredientForMatching(name: string): string {
  let cleaned = name.toLowerCase().trim()
  
  // Remove quantities and units at the beginning
  cleaned = cleaned.replace(/^[\d\s\/.,]+\s*(g|kg|mg|ml|l|cl|dl|c\.?\s*à\s*s\.?|c\.?\s*à\s*c\.?|càs|càc|cuillère(s)?|pincée(s)?|brin(s)?|gousse(s)?|tranche(s)?|pot(s)?|sachet(s)?|botte(s)?|verre|tasse)\s*/i, '')
  
  // Check if it's a compound ingredient (don't split these)
  const isCompound = COMPOUND_INGREDIENTS.some(compound => 
    cleaned.includes(compound)
  )
  
  if (isCompound) {
    // Just remove articles but keep the compound
    cleaned = cleaned.replace(/^(de|d'|du|des|de la|de l'|la|le|l'|un|une)\s+/i, '')
    return cleaned.trim()
  }
  
  // Remove common prefixes for non-compound ingredients
  cleaned = cleaned.replace(/^(de|d'|du|des|de la|de l'|la|le|l'|un|une)\s+/i, '')
  
  // Remove descriptors at the end
  cleaned = cleaned.replace(/\s+(frais|fraîche|séché|séchée|haché|hachée|émincé|émincée|râpé|râpée|coupé|coupée|cuit|cuite)s?$/i, '')
  
  return cleaned.trim()
}

/**
 * Match an imported ingredient with existing pantry items
 * Returns the matched pantry item or null if no good match
 */
export function matchIngredientWithPantry(
  ingredientName: string,
  pantryItems: PantryItem[]
): PantryItem | null {
  const cleanedImport = cleanIngredientForMatching(ingredientName)
  
  if (!cleanedImport) return null
  
  // 1. Try exact match (case-insensitive)
  let match = pantryItems.find(
    item => item.name.toLowerCase() === cleanedImport
  )
  if (match) return match
  
  // 2. Try exact match with normalized form (remove accents)
  const normalizeAccents = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  
  const normalizedImport = normalizeAccents(cleanedImport)
  match = pantryItems.find(
    item => normalizeAccents(item.name.toLowerCase()) === normalizedImport
  )
  if (match) return match
  
  // 3. Try singular/plural variations
  // tomate → tomates or tomates → tomate
  const withS = cleanedImport.endsWith('s') 
    ? cleanedImport.slice(0, -1) 
    : cleanedImport + 's'
  
  match = pantryItems.find(
    item => item.name.toLowerCase() === withS
  )
  if (match) return match
  
  // 4. Try fuzzy matching (similarity threshold: 85%)
  const MAX_DISTANCE = 2 // Maximum Levenshtein distance allowed
  
  let bestMatch: PantryItem | null = null
  let bestDistance = Infinity
  
  for (const item of pantryItems) {
    const itemName = item.name.toLowerCase()
    const distance = levenshteinDistance(cleanedImport, itemName)
    
    // Only consider if very similar
    if (distance <= MAX_DISTANCE && distance < bestDistance) {
      bestDistance = distance
      bestMatch = item
    }
  }
  
  if (bestMatch) return bestMatch
  
  // 5. Try partial matching (ingredient contains pantry item or vice versa)
  // But be careful with short words (minimum 4 chars)
  match = pantryItems.find(item => {
    const itemName = item.name.toLowerCase()
    
    // Skip very short names to avoid false positives
    if (itemName.length < 4 || cleanedImport.length < 4) return false
    
    // Check if one is contained in the other
    return cleanedImport.includes(itemName) || itemName.includes(cleanedImport)
  })
  
  return match || null
}

/**
 * Get suggestions for unmatched ingredients
 * Returns top 3 similar items from pantry
 */
export function getSuggestionsForIngredient(
  ingredientName: string,
  pantryItems: PantryItem[],
  maxSuggestions: number = 3
): PantryItem[] {
  const cleanedImport = cleanIngredientForMatching(ingredientName)
  
  if (!cleanedImport) return []
  
  // Calculate similarity score for each pantry item
  const scored = pantryItems
    .map(item => ({
      item,
      distance: levenshteinDistance(cleanedImport, item.name.toLowerCase())
    }))
    .filter(({ distance }) => distance <= 4) // Max distance of 4 chars
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxSuggestions)
  
  return scored.map(s => s.item)
}
