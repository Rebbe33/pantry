import { NextRequest, NextResponse } from 'next/server'

// API pour rechercher des recettes en ligne basées sur les ingrédients disponibles
export async function POST(request: NextRequest) {
  try {
    const { ingredients } = await request.json()
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'Ingredients are required' }, { status: 400 })
    }
    
    // Liste des ingrédients pour la recherche
    const ingredientQuery = ingredients.slice(0, 5).join(',')
    
    // Utiliser l'API Edamam Recipe Search (gratuite avec 10 req/min)
    // Vous devrez créer un compte sur https://developer.edamam.com/
    const APP_ID = process.env.EDAMAM_APP_ID
    const APP_KEY = process.env.EDAMAM_APP_KEY
    
    if (!APP_ID || !APP_KEY) {
      // Fallback: générer des suggestions basiques sans API
      return NextResponse.json({
        recipes: generateFallbackSuggestions(ingredients),
        source: 'fallback',
      })
    }
    
    // Construire l'URL de recherche Edamam
    const url = new URL('https://api.edamam.com/api/recipes/v2')
    url.searchParams.set('type', 'public')
    url.searchParams.set('app_id', APP_ID)
    url.searchParams.set('app_key', APP_KEY)
    url.searchParams.set('q', ingredientQuery)
    url.searchParams.set('to', '12') // Limite à 12 résultats
    
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error('Failed to fetch recipes from Edamam')
    }
    
    const data = await response.json()
    
    // Transformer les résultats Edamam en format compatible
    const recipes = data.hits.map((hit: any) => {
      const recipe = hit.recipe
      
      return {
        name: recipe.label,
        image_url: recipe.image,
        source_url: recipe.url,
        duration: Math.round(recipe.totalTime) || 30,
        servings: recipe.yield,
        tags: recipe.cuisineType || [],
        ingredients: recipe.ingredientLines.map((line: string) => ({
          name: line,
          quantity: 0,
          unit: '',
        })),
        description: `Recette ${recipe.cuisineType?.[0] || 'internationale'}`,
        matchScore: calculateMatchScore(ingredients, recipe.ingredientLines),
      }
    })
    
    // Trier par score de correspondance
    recipes.sort((a: any, b: any) => b.matchScore - a.matchScore)
    
    return NextResponse.json({
      recipes: recipes.slice(0, 10),
      source: 'edamam',
    })
    
  } catch (error) {
    console.error('Recipe search error:', error)
    return NextResponse.json(
      { error: 'Failed to search recipes' },
      { status: 500 }
    )
  }
}

// Calcule le score de correspondance entre ingrédients disponibles et recette
function calculateMatchScore(availableIngredients: string[], recipeIngredients: string[]): number {
  const normalizedAvailable = availableIngredients.map(i => i.toLowerCase())
  let matches = 0
  
  recipeIngredients.forEach(recipeIng => {
    const normalized = recipeIng.toLowerCase()
    if (normalizedAvailable.some(avail => normalized.includes(avail) || avail.includes(normalized))) {
      matches++
    }
  })
  
  return (matches / recipeIngredients.length) * 100
}

// Fallback: suggestions simples sans API externe
function generateFallbackSuggestions(ingredients: string[]) {
  const suggestions = []
  
  // Suggestions basées sur ingrédients de base communs
  const hasDairy = ingredients.some(i => ['lait', 'beurre', 'crème', 'fromage'].some(d => i.toLowerCase().includes(d)))
  const hasEggs = ingredients.some(i => i.toLowerCase().includes('oeuf') || i.toLowerCase().includes('œuf'))
  const hasPasta = ingredients.some(i => i.toLowerCase().includes('pâte'))
  const hasRice = ingredients.some(i => i.toLowerCase().includes('riz'))
  const hasVeggies = ingredients.some(i => ['tomate', 'oignon', 'ail', 'carotte', 'courgette'].some(v => i.toLowerCase().includes(v)))
  
  if (hasPasta && hasVeggies) {
    suggestions.push({
      name: 'Pâtes aux légumes',
      description: 'Une recette simple et rapide avec les légumes de saison',
      duration: 20,
      servings: 4,
      tags: ['Rapide', 'Végétarien'],
      source_url: 'https://www.marmiton.org/recettes/recherche.aspx?aqt=' + ingredients.slice(0, 3).join('+'),
      matchScore: 80,
    })
  }
  
  if (hasRice && hasVeggies) {
    suggestions.push({
      name: 'Riz sauté aux légumes',
      description: 'Un classique asiatique facile à réaliser',
      duration: 25,
      servings: 4,
      tags: ['Asiatique', 'Complet'],
      source_url: 'https://www.750g.com/recherche_recette_1.htm?recherche=' + ingredients.slice(0, 3).join('+'),
      matchScore: 75,
    })
  }
  
  if (hasEggs && hasDairy) {
    suggestions.push({
      name: 'Omelette gourmande',
      description: 'Une omelette garnie avec vos ingrédients',
      duration: 15,
      servings: 2,
      tags: ['Rapide', 'Protéiné'],
      source_url: 'https://cuisine.journaldesfemmes.fr/recette/' + ingredients[0],
      matchScore: 70,
    })
  }
  
  // Toujours proposer une salade composée
  if (ingredients.length >= 3) {
    suggestions.push({
      name: 'Salade composée du moment',
      description: 'Utilisez vos ingrédients frais pour une salade colorée',
      duration: 10,
      servings: 2,
      tags: ['Rapide', 'Frais', 'Santé'],
      source_url: 'https://www.cuisineaz.com/recherche_v2.aspx?recherche=' + ingredients.slice(0, 3).join('+'),
      matchScore: 65,
    })
  }
  
  return suggestions
}
