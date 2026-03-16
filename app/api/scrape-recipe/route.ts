import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'node-html-parser'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }
    
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 400 })
    }
    
    const html = await response.text()
    const root = parse(html)
    
    // Try to extract JSON-LD recipe data first
    const jsonLdScripts = root.querySelectorAll('script[type="application/ld+json"]')
    
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.text)
        const recipe = Array.isArray(data) 
          ? data.find(item => item['@type'] === 'Recipe')
          : data['@type'] === 'Recipe' ? data : null
        
        if (recipe) {
          return NextResponse.json({
            name: recipe.name,
            description: recipe.description || '',
            duration: parseDuration(recipe.totalTime || recipe.cookTime),
            servings: parseInt(recipe.recipeYield) || 4,
            ingredients: Array.isArray(recipe.recipeIngredient) 
              ? recipe.recipeIngredient.map((ing: string) => parseIngredient(ing))
              : [],
            steps: Array.isArray(recipe.recipeInstructions)
              ? recipe.recipeInstructions.map((step: any) => 
                  typeof step === 'string' ? step : step.text || ''
                ).filter(Boolean)
              : [],
            image_url: recipe.image?.url || recipe.image || null,
            tags: recipe.keywords ? recipe.keywords.split(',').map((k: string) => k.trim()) : [],
          })
        }
      } catch (e) {
        // Continue to next script
      }
    }
    
    // Fallback: try to extract from HTML structure
    const name = root.querySelector('h1')?.text.trim() || 'Recette importée'
    const ingredients = root.querySelectorAll('.ingredient, [itemprop="recipeIngredient"], li')
      .map(el => el.text.trim())
      .filter(text => text.length > 0 && text.length < 200)
      .slice(0, 20)
      .map(parseIngredient)
    
    const steps = root.querySelectorAll('.step, .instruction, [itemprop="recipeInstructions"] p, ol li')
      .map(el => el.text.trim())
      .filter(text => text.length > 10)
      .slice(0, 15)
    
    return NextResponse.json({
      name,
      description: '',
      duration: 30,
      servings: 4,
      ingredients,
      steps,
      image_url: null,
      tags: [],
    })
    
  } catch (error) {
    console.error('Recipe scraping error:', error)
    return NextResponse.json(
      { error: 'Failed to parse recipe' },
      { status: 500 }
    )
  }
}

// Helper to parse ingredient string
function parseIngredient(text: string) {
  // Try to extract quantity, unit, and name
  const match = text.match(/^([\d\s\/.,]+)?\s*(g|kg|ml|l|cl|tsp|tbsp|cup|c\.|cuillère|cuillères)?\.?\s*(.+)$/i)
  
  if (match) {
    const [, qty, unit, name] = match
    return {
      name: name.trim(),
      quantity: parseFloat(qty?.trim().replace(',', '.') || '1'),
      unit: unit?.toLowerCase() || 'unité',
    }
  }
  
  return {
    name: text,
    quantity: 1,
    unit: 'unité',
  }
}

// Helper to parse ISO 8601 duration (PT1H30M)
function parseDuration(duration?: string): number {
  if (!duration) return 30
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (match) {
    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    return hours * 60 + minutes
  }
  
  return 30
}
