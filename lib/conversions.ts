// Base de données de densités et conversions pour ingrédients courants
// Densités en g/ml et équivalences standards

export interface IngredientData {
  density?: number // g/ml
  category: 'liquid' | 'solid' | 'powder' | 'semi-solid'
  equivalences?: {
    [key: string]: number // Ex: { 'cuillère à soupe': 15, 'tasse': 240 }
  }
}

export const INGREDIENT_DATABASE: Record<string, IngredientData> = {
  // Liquides
  'eau': { density: 1, category: 'liquid' },
  'lait': { density: 1.03, category: 'liquid' },
  'huile d\'olive': { density: 0.92, category: 'liquid' },
  'huile': { density: 0.92, category: 'liquid' },
  'vinaigre': { density: 1.01, category: 'liquid' },
  'vin': { density: 0.99, category: 'liquid' },
  'crème liquide': { density: 1.01, category: 'liquid' },
  'bouillon': { density: 1, category: 'liquid' },
  
  // Produits laitiers semi-solides
  'yaourt': { density: 1.05, category: 'semi-solid' },
  'crème fraîche': { density: 1.01, category: 'semi-solid' },
  'fromage blanc': { density: 1.03, category: 'semi-solid' },
  
  // Poudres et farines
  'farine': { density: 0.59, category: 'powder', equivalences: { 'tasse': 120, 'cuillère à soupe': 8 } },
  'sucre': { density: 0.85, category: 'powder', equivalences: { 'tasse': 200, 'cuillère à soupe': 12 } },
  'sucre glace': { density: 0.56, category: 'powder', equivalences: { 'tasse': 120 } },
  'cacao': { density: 0.48, category: 'powder', equivalences: { 'cuillère à soupe': 6 } },
  'sel': { density: 1.2, category: 'powder', equivalences: { 'cuillère à café': 6, 'cuillère à soupe': 18 } },
  'levure': { density: 0.4, category: 'powder' },
  
  // Miel et sirops
  'miel': { density: 1.42, category: 'semi-solid', equivalences: { 'cuillère à soupe': 21 } },
  'sirop': { density: 1.3, category: 'liquid' },
  
  // Beurre
  'beurre': { density: 0.91, category: 'solid', equivalences: { 'cuillère à soupe': 14, 'tasse': 227 } },
  
  // Riz et pâtes (non cuits)
  'riz': { density: 0.85, category: 'solid', equivalences: { 'tasse': 185 } },
  'pâtes': { density: 0.6, category: 'solid' },
  
  // Légumes courants (approximatifs pour pièces)
  'tomate': { density: 0.95, category: 'solid', equivalences: { 'pièce': 150 } },
  'tomates cerises': { density: 0.95, category: 'solid', equivalences: { 'pièce': 15 } },
  'oignon': { density: 0.9, category: 'solid', equivalences: { 'pièce': 150 } },
  'ail': { density: 1, category: 'solid', equivalences: { 'gousse': 5, 'tête': 40 } },
  'pomme de terre': { density: 1.08, category: 'solid', equivalences: { 'pièce': 200 } },
  'carotte': { density: 0.96, category: 'solid', equivalences: { 'pièce': 100 } },
  'courgette': { density: 0.94, category: 'solid', equivalences: { 'pièce': 200 } },
  
  // Fruits
  'pomme': { density: 0.83, category: 'solid', equivalences: { 'pièce': 180 } },
  'banane': { density: 0.94, category: 'solid', equivalences: { 'pièce': 120 } },
  'citron': { density: 1.05, category: 'solid', equivalences: { 'pièce': 100, 'jus': 30 } },
  'orange': { density: 0.96, category: 'solid', equivalences: { 'pièce': 150 } },
  
  // Œufs
  'oeuf': { density: 1.03, category: 'solid', equivalences: { 'pièce': 50, 'jaune': 20, 'blanc': 30 } },
  'œuf': { density: 1.03, category: 'solid', equivalences: { 'pièce': 50, 'jaune': 20, 'blanc': 30 } },
}

// Normalisation des noms d'ingrédients
export function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlève les accents
    .replace(/s$/, '') // Singularise
    .trim()
}

// Trouve les données d'un ingrédient
export function findIngredientData(name: string): IngredientData | null {
  const normalized = normalizeIngredientName(name)
  
  // Recherche exacte
  if (INGREDIENT_DATABASE[normalized]) {
    return INGREDIENT_DATABASE[normalized]
  }
  
  // Recherche partielle
  for (const [key, data] of Object.entries(INGREDIENT_DATABASE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return data
    }
  }
  
  return null
}

// Conversion entre unités
export interface ConversionResult {
  value: number
  unit: string
  confidence: 'high' | 'medium' | 'low'
  originalValue: number
  originalUnit: string
}

export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
  ingredientName: string
): ConversionResult | null {
  const data = findIngredientData(ingredientName)
  const from = fromUnit.toLowerCase()
  const to = toUnit.toLowerCase()
  
  // Même unité
  if (from === to) {
    return { value, unit: toUnit, confidence: 'high', originalValue: value, originalUnit: fromUnit }
  }
  
  // Conversions de volume standard
  const volumeConversions: Record<string, number> = {
    'ml': 1,
    'cl': 10,
    'dl': 100,
    'l': 1000,
    'cuillère à café': 5,
    'cuillère à soupe': 15,
    'tasse': 240,
    'cup': 240,
  }
  
  // Conversions de poids standard
  const weightConversions: Record<string, number> = {
    'g': 1,
    'kg': 1000,
    'mg': 0.001,
  }
  
  // Volume → Volume
  if (volumeConversions[from] && volumeConversions[to]) {
    const mlValue = value * volumeConversions[from]
    const result = mlValue / volumeConversions[to]
    return { value: Math.round(result * 100) / 100, unit: toUnit, confidence: 'high', originalValue: value, originalUnit: fromUnit }
  }
  
  // Poids → Poids
  if (weightConversions[from] && weightConversions[to]) {
    const gValue = value * weightConversions[from]
    const result = gValue / weightConversions[to]
    return { value: Math.round(result * 100) / 100, unit: toUnit, confidence: 'high', originalValue: value, originalUnit: fromUnit }
  }
  
  // Volume → Poids (nécessite densité)
  if (volumeConversions[from] && weightConversions[to] && data?.density) {
    const mlValue = value * volumeConversions[from]
    const gValue = mlValue * data.density
    const result = gValue / weightConversions[to]
    return { value: Math.round(result * 100) / 100, unit: toUnit, confidence: 'high', originalValue: value, originalUnit: fromUnit }
  }
  
  // Poids → Volume (nécessite densité)
  if (weightConversions[from] && volumeConversions[to] && data?.density) {
    const gValue = value * weightConversions[from]
    const mlValue = gValue / data.density
    const result = mlValue / volumeConversions[to]
    return { value: Math.round(result * 100) / 100, unit: toUnit, confidence: 'high', originalValue: value, originalUnit: fromUnit }
  }
  
  // Pièces → Poids (nécessite équivalence)
  if ((from === 'pièce' || from === 'pièce(s)' || from === 'piece' || from === 'pieces') && weightConversions[to] && data?.equivalences?.['pièce']) {
    const gValue = value * data.equivalences['pièce']
    const result = gValue / weightConversions[to]
    return { value: Math.round(result * 100) / 100, unit: toUnit, confidence: 'medium', originalValue: value, originalUnit: fromUnit }
  }
  
  // Poids → Pièces (nécessite équivalence)
  if (weightConversions[from] && (to === 'pièce' || to === 'pièce(s)' || to === 'piece' || to === 'pieces') && data?.equivalences?.['pièce']) {
    const gValue = value * weightConversions[from]
    const result = gValue / data.equivalences['pièce']
    return { value: Math.round(result * 10) / 10, unit: toUnit, confidence: 'medium', originalValue: value, originalUnit: fromUnit }
  }
  
  return null
}

// Suggère la meilleure unité pour un ingrédient
export function suggestBestUnit(ingredientName: string): string[] {
  const data = findIngredientData(ingredientName)
  
  if (!data) return ['g', 'pièce(s)']
  
  switch (data.category) {
    case 'liquid':
      return ['ml', 'l', 'cl']
    case 'solid':
      return ['g', 'kg', 'pièce(s)']
    case 'powder':
      return ['g', 'cuillère à soupe', 'cuillère à café']
    case 'semi-solid':
      return ['g', 'ml', 'cuillère à soupe']
    default:
      return ['g', 'ml', 'pièce(s)']
  }
}

// Formate une conversion pour affichage
export function formatConversion(conversion: ConversionResult): string {
  const confidence = conversion.confidence === 'high' ? '' : ' (approx.)'
  return `${conversion.value} ${conversion.unit}${confidence}`
}

// Convertit automatiquement vers l'unité la plus appropriée
export function autoConvert(value: number, unit: string, ingredientName: string): ConversionResult | null {
  const data = findIngredientData(ingredientName)
  
  // Si c'est déjà en grammes, parfait
  if (unit === 'g') {
    return { value, unit, confidence: 'high', originalValue: value, originalUnit: unit }
  }
  
  // Sinon essaie de convertir en grammes
  const converted = convertUnit(value, unit, 'g', ingredientName)
  if (converted) return converted
  
  // Si impossible, garde l'unité d'origine
  return { value, unit, confidence: 'medium', originalValue: value, originalUnit: unit }
}
