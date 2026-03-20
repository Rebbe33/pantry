import { Recipe, RecipeIngredient, PantryItem } from '@/lib/store'

/**
 * Get ingredients for a recipe, preferring linked ingredients over legacy text-based ones
 */
export function getRecipeIngredients(recipe: Recipe): Array<{
  id?: string
  name: string
  quantity: number
  unit: string
  pantry_item?: PantryItem
  pantry_item_id?: string
}> {
  // Prefer recipe_ingredients (new linked system)
  if (recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0) {
    return recipe.recipe_ingredients.map(ing => ({
      id: ing.id,
      name: ing.pantry_item?.name || 'Ingrédient inconnu',
      quantity: ing.quantity,
      unit: ing.unit,
      pantry_item: ing.pantry_item,
      pantry_item_id: ing.pantry_item_id
    }))
  }
  
  // Fallback to legacy ingredients field
  return recipe.ingredients || []
}

/**
 * Check if we have enough of an ingredient in pantry
 */
export function hasEnoughIngredient(
  ingredient: { quantity: number; unit: string; pantry_item_id?: string },
  pantryItems: PantryItem[]
): boolean {
  if (!ingredient.pantry_item_id) return false
  
  const pantryItem = pantryItems.find(item => item.id === ingredient.pantry_item_id)
  if (!pantryItem) return false
  
  // Same unit
  if (pantryItem.unit === ingredient.unit) {
    return pantryItem.quantity >= ingredient.quantity
  }
  
  // Unit conversions
  if (pantryItem.unit === 'kg' && ingredient.unit === 'g') {
    return pantryItem.quantity * 1000 >= ingredient.quantity
  }
  if (pantryItem.unit === 'g' && ingredient.unit === 'kg') {
    return pantryItem.quantity >= ingredient.quantity * 1000
  }
  if (pantryItem.unit === 'l' && ingredient.unit === 'ml') {
    return pantryItem.quantity * 1000 >= ingredient.quantity
  }
  if (pantryItem.unit === 'ml' && ingredient.unit === 'l') {
    return pantryItem.quantity >= ingredient.quantity * 1000
  }
  
  // For different units, just check if we have some
  return pantryItem.quantity > 0
}

/**
 * Format ingredient for display
 */
export function formatIngredient(ingredient: {
  name: string
  quantity: number
  unit: string
}): string {
  return `${ingredient.quantity}${ingredient.unit} ${ingredient.name}`
}

/**
 * Parse ingredient text like "200g farine" into structured data
 */
export function parseIngredientText(text: string): {
  quantity: number
  unit: string
  name: string
} {
  const match = text.match(/^([\d.,]+)\s*([a-zA-Zéèê]+)?\s+(.+)$/)
  
  if (match) {
    return {
      quantity: parseFloat(match[1].replace(',', '.')),
      unit: match[2] || 'pièce(s)',
      name: cleanIngredientName(match[3])
    }
  }
  
  return {
    quantity: 1,
    unit: 'pièce(s)',
    name: cleanIngredientName(text)
  }
}

/**
 * Clean ingredient name from common prefixes/suffixes
 * Removes: "de ", "d'", "du ", "des ", "la ", "le ", "l'", "un ", "une "
 */
export function cleanIngredientName(name: string): string {
  let cleaned = name.trim()
  
  // Remove common French articles and prepositions at the beginning
  const prefixes = [
    /^de\s+/i,
    /^d'/i,
    /^du\s+/i,
    /^des\s+/i,
    /^de\s+la\s+/i,
    /^de\s+l'/i,
    /^la\s+/i,
    /^le\s+/i,
    /^l'/i,
    /^un\s+/i,
    /^une\s+/i,
  ]
  
  for (const prefix of prefixes) {
    cleaned = cleaned.replace(prefix, '')
  }
  
  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  
  return cleaned.trim()
}
