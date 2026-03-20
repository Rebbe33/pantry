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
  // Clean the text first (remove HTML entities, extra spaces)
  let cleaned = text
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  
  // Special cases - return early for common patterns
  // "gousse(s) d'ail" → "ail"
  if (/^(\d+[\s\/,.]*)?\s*gousse(s)?\s+(d'|de\s+)?ail/i.test(cleaned)) {
    const qtyMatch = cleaned.match(/^([\d\/.,]+)/)
    return {
      name: 'Ail',
      quantity: qtyMatch ? parseFloat(qtyMatch[1].replace(',', '.')) : 1,
      unit: 'gousse(s)',
    }
  }
  
  // "filet de jus de citron" → "jus de citron"
  if (/^(\d+[\s\/,.]*)?\s*filet(s)?\s+(de|du|d')/i.test(cleaned)) {
    const restMatch = cleaned.match(/filet(s)?\s+(?:de|du|d')\s+(.+)$/i)
    if (restMatch) {
      return {
        name: capitalizeFirst(restMatch[2].trim()),
        quantity: 1,
        unit: 'filet(s)',
      }
    }
  }
  
  // "noix de beurre" → "beurre" (noix = petite quantité)
  if (/^(\d+[\s\/,.]*)?\s*noix\s+de\s+/i.test(cleaned)) {
    const restMatch = cleaned.match(/noix\s+de\s+(.+)$/i)
    if (restMatch) {
      return {
        name: capitalizeFirst(restMatch[1].trim()),
        quantity: 1,
        unit: 'noix',
      }
    }
  }
  
  // Main regex - try to extract quantity, unit, and name
  const match = cleaned.match(/^([\d\s\/.,]+)?\s*(g|kg|mg|ml|l|cl|dl|tasse|verre|c\.?\s*à\s*s\.?|c\.?\s*à\s*c\.?|càs|càc|cs|cc|cuillère(s)?(\s+à\s+(soupe|café))?|c\.\s*à\s*soupe|c\.\s*à\s*café|tsp|tbsp|cup|pincée(s)?|brin(s)?|gousse(s)?|tranche(s)?|morceau(x)?|feuille(s)?|sachet(s)?|boîte(s)?|paquet(s)?|pot(s)?)?\.?\s*(.+)$/i)
  
  if (match) {
    const [, qty, unit, , , , , , , name] = match
    
    // Clean the ingredient name
    let cleanedName = name ? name.trim() : cleaned
    
    // Remove articles and prepositions - but be careful with words starting with these letters!
    // Use word boundaries to avoid "gousse d'ail" → "ousse ail"
    cleanedName = cleanedName.replace(/^de\s+/i, '')
    cleanedName = cleanedName.replace(/^d'\s*/i, '')
    cleanedName = cleanedName.replace(/^du\s+/i, '')
    cleanedName = cleanedName.replace(/^des\s+/i, '')
    cleanedName = cleanedName.replace(/^de\s+la\s+/i, '')
    cleanedName = cleanedName.replace(/^de\s+l'\s*/i, '')
    cleanedName = cleanedName.replace(/^la\s+/i, '')
    cleanedName = cleanedName.replace(/^le\s+/i, '')
    cleanedName = cleanedName.replace(/^l'\s*/i, '')
    cleanedName = cleanedName.replace(/^un\s+/i, '')
    cleanedName = cleanedName.replace(/^une\s+/i, '')
    
    // Remove quantity words
    cleanedName = cleanedName.replace(/^quelques\s+/i, '')
    cleanedName = cleanedName.replace(/^un\s+peu\s+(de\s+)?/i, '')
    
    // Normalize unit
    let normalizedUnit = 'pièce(s)'
    if (unit) {
      const unitLower = unit.toLowerCase().replace(/\s+/g, ' ').trim()
      
      // Cuillères à soupe
      if (/^(cuillère(s)?(\s+à\s+soupe)?|c\.?\s*à\s*s\.?|càs|cs|c\.\s*à\s*soupe|tbsp)$/i.test(unitLower)) {
        normalizedUnit = 'c. à soupe'
      }
      // Cuillères à café
      else if (/^(cuillère(s)?(\s+à\s+café)?|c\.?\s*à\s*c\.?|càc|cc|c\.\s*à\s*café|tsp)$/i.test(unitLower)) {
        normalizedUnit = 'c. à café'
      }
      // Pincées
      else if (/^pincée(s)?$/i.test(unitLower)) {
        normalizedUnit = 'pincée(s)'
      }
      // Brins
      else if (/^brin(s)?$/i.test(unitLower)) {
        normalizedUnit = 'brin(s)'
      }
      // Gousses
      else if (/^gousse(s)?$/i.test(unitLower)) {
        normalizedUnit = 'gousse(s)'
      }
      // Tranches
      else if (/^tranche(s)?$/i.test(unitLower)) {
        normalizedUnit = 'tranche(s)'
      }
      // Morceaux
      else if (/^morceau(x)?$/i.test(unitLower)) {
        normalizedUnit = 'morceau(x)'
      }
      // Feuilles
      else if (/^feuille(s)?$/i.test(unitLower)) {
        normalizedUnit = 'feuille(s)'
      }
      // Sachets
      else if (/^sachet(s)?$/i.test(unitLower)) {
        normalizedUnit = 'sachet(s)'
      }
      // Boîtes
      else if (/^boîte(s)?$/i.test(unitLower)) {
        normalizedUnit = 'boîte(s)'
      }
      // Paquets
      else if (/^paquet(s)?$/i.test(unitLower)) {
        normalizedUnit = 'paquet(s)'
      }
      // Pots
      else if (/^pot(s)?$/i.test(unitLower)) {
        normalizedUnit = 'pot(s)'
      }
      // Tasse/verre
      else if (/^(tasse|verre|cup)$/i.test(unitLower)) {
        normalizedUnit = 'tasse'
      }
      // Standard units
      else {
        normalizedUnit = unitLower
      }
    }
    
    // Parse quantity (handle fractions)
    let parsedQty = 1
    if (qty) {
      const qtyStr = qty.trim().replace(',', '.').replace(/\s+/g, '')
      
      // Handle fractions like "1/2" or "1 1/2"
      if (qtyStr.includes('/')) {
        const parts = qtyStr.split(/[\s+]/)
        let total = 0
        
        for (const part of parts) {
          if (part.includes('/')) {
            const [num, denom] = part.split('/').map(parseFloat)
            if (denom) total += num / denom
          } else {
            total += parseFloat(part) || 0
          }
        }
        
        parsedQty = total || 1
      } else {
        parsedQty = parseFloat(qtyStr) || 1
      }
    }
    
    return {
      name: capitalizeFirst(cleanedName),
      quantity: parsedQty,
      unit: normalizedUnit,
    }
  }
  
  // If no match, clean the whole text as name
  let cleanedName = cleaned
  cleanedName = cleanedName.replace(/^de\s+/i, '')
  cleanedName = cleanedName.replace(/^d'\s*/i, '')
  cleanedName = cleanedName.replace(/^du\s+/i, '')
  cleanedName = cleanedName.replace(/^des\s+/i, '')
  cleanedName = cleanedName.replace(/^de\s+la\s+/i, '')
  cleanedName = cleanedName.replace(/^de\s+l'\s*/i, '')
  cleanedName = cleanedName.replace(/^la\s+/i, '')
  cleanedName = cleanedName.replace(/^le\s+/i, '')
  cleanedName = cleanedName.replace(/^l'\s*/i, '')
  cleanedName = cleanedName.replace(/^un\s+/i, '')
  cleanedName = cleanedName.replace(/^une\s+/i, '')
  cleanedName = cleanedName.replace(/^quelques\s+/i, '')
  cleanedName = cleanedName.replace(/^un\s+peu\s+(de\s+)?/i, '')
  
  return {
    name: capitalizeFirst(cleanedName),
    quantity: 1,
    unit: 'pièce(s)',
  }
}

// Helper to capitalize first letter
function capitalizeFirst(str: string): string {
  const trimmed = str.trim()
  if (trimmed.length === 0) return ''
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
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
