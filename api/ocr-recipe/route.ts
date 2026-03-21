export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
  
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Get API key from environment
    const apiKey = process.env.GOOGLE_VISION_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Vision API key not configured' },
        { status: 500 }
      )
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')

    // Call Google Vision API
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'DOCUMENT_TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('Vision API error:', error)
      return NextResponse.json(
        { error: 'Failed to process image' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const fullText = data.responses[0]?.fullTextAnnotation?.text || ''

    if (!fullText) {
      return NextResponse.json(
        { error: 'No text found in image' },
        { status: 400 }
      )
    }

    // Parse the OCR text to extract recipe components
    const parsed = parseRecipeFromOCR(fullText)

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('OCR error:', error)
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    )
  }
}

function parseRecipeFromOCR(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  
  let name = 'Recette importée'
  let ingredients: Array<{ name: string; quantity: number; unit: string }> = []
  let steps: string[] = []
  let duration = 30
  let servings = 4
  
  let section: 'header' | 'ingredients' | 'steps' = 'header'
  let stepBuffer: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lowerLine = line.toLowerCase()
    
    // Detect recipe name (usually first significant line or after "recette")
    if (section === 'header' && i < 5 && line.length > 5 && line.length < 100) {
      if (!lowerLine.includes('recette') || lowerLine.includes('recette de') || lowerLine.includes('recette :')) {
        if (line.match(/^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]/)) {
          name = line.replace(/^recette\s*(de|:)?\s*/i, '').trim()
        }
      }
    }
    
    // Detect ingredients section
    if (lowerLine.includes('ingrédient') || lowerLine.includes('ingredient')) {
      section = 'ingredients'
      continue
    }
    
    // Detect steps section
    if (
      lowerLine.includes('préparation') ||
      lowerLine.includes('preparation') ||
      lowerLine.includes('étapes') ||
      lowerLine.includes('etapes') ||
      lowerLine.includes('instructions')
    ) {
      section = 'steps'
      continue
    }
    
    // Detect duration
    const durationMatch = line.match(/(\d+)\s*(min|minutes?|h)/i)
    if (durationMatch && section === 'header') {
      const value = parseInt(durationMatch[1])
      if (durationMatch[2].toLowerCase().startsWith('h')) {
        duration = value * 60
      } else {
        duration = value
      }
    }
    
    // Detect servings
    const servingsMatch = line.match(/(\d+)\s*(personnes?|parts?|pers\.?)/i)
    if (servingsMatch) {
      servings = parseInt(servingsMatch[1])
    }
    
    // Parse ingredients
    if (section === 'ingredients' && line.length > 2) {
      // Skip section headers
      if (lowerLine.includes('préparation') || lowerLine.includes('étape')) {
        section = 'steps'
        continue
      }
      
      const ingredient = parseIngredientLine(line)
      if (ingredient) {
        ingredients.push(ingredient)
      }
    }
    
    // Parse steps
    if (section === 'steps' && line.length > 10) {
      // Check if it's a numbered step
      const stepMatch = line.match(/^(\d+)[.\s)]+(.+)/)
      if (stepMatch) {
        if (stepBuffer.length > 0) {
          steps.push(stepBuffer.join(' '))
          stepBuffer = []
        }
        stepBuffer.push(stepMatch[2].trim())
      } else if (stepBuffer.length > 0 || steps.length > 0) {
        // Continuation of previous step or new unnumbered step
        if (line.match(/^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]/)) {
          // New sentence, likely new step
          if (stepBuffer.length > 0) {
            steps.push(stepBuffer.join(' '))
            stepBuffer = []
          }
          stepBuffer.push(line)
        } else {
          // Continuation
          stepBuffer.push(line)
        }
      }
    }
  }
  
  // Add last step if any
  if (stepBuffer.length > 0) {
    steps.push(stepBuffer.join(' '))
  }
  
  // If no steps found, try to extract from remaining text
  if (steps.length === 0 && section === 'steps') {
    const stepLines = lines.filter(l => l.length > 20)
    if (stepLines.length > 0) {
      steps = stepLines
    }
  }
  
  return {
    name,
    description: '',
    duration,
    servings,
    ingredients,
    steps,
    tags: [],
    image_url: null,
  }
}

function parseIngredientLine(line: string): { name: string; quantity: number; unit: string } | null {
  // Clean line
  let cleaned = line
    .replace(/[•\-*]/g, '') // Remove bullet points
    .replace(/\s+/g, ' ')
    .trim()
  
  if (cleaned.length < 2) return null
  
  // Try to parse quantity and unit
  const match = cleaned.match(/^([\d\s\/.,]+)?\s*(g|kg|mg|ml|l|cl|dl|c\.?\s*à\s*s\.?|c\.?\s*à\s*c\.?|càs|càc|cuillère(s)?(\s+à\s+(soupe|café))?|pincée(s)?|brin(s)?|gousse(s)?|tranche(s)?|pot(s)?|sachet(s)?|botte(s)?|verre|tasse)?\s*(.+)$/i)
  
  if (match) {
    const [, qty, unit, , , , , , , , name] = match
    
    // Clean ingredient name
    let cleanedName = name || cleaned
    cleanedName = cleanedName.replace(/^(de|d'|du|des|de la|de l'|la|le|l'|un|une)\s+/i, '')
    cleanedName = cleanedName.trim()
    
    if (cleanedName.length > 0) {
      cleanedName = cleanedName.charAt(0).toUpperCase() + cleanedName.slice(1)
    }
    
    // Parse quantity
    let parsedQty = 1
    if (qty) {
      const qtyStr = qty.trim().replace(',', '.').replace(/\s+/g, '')
      if (qtyStr.includes('/')) {
        const parts = qtyStr.split('/')
        parsedQty = parseFloat(parts[0]) / parseFloat(parts[1])
      } else {
        parsedQty = parseFloat(qtyStr) || 1
      }
    }
    
    // Normalize unit
    let normalizedUnit = 'pièce(s)'
    if (unit) {
      const unitLower = unit.toLowerCase().trim()
      if (/c\.?\s*à\s*s\.?|càs|cuillère(s)?\s+à\s+soupe/i.test(unitLower)) {
        normalizedUnit = 'c. à soupe'
      } else if (/c\.?\s*à\s*c\.?|càc|cuillère(s)?\s+à\s+café/i.test(unitLower)) {
        normalizedUnit = 'c. à café'
      } else if (/^pincée(s)?$/i.test(unitLower)) {
        normalizedUnit = 'pincée(s)'
      } else if (/^brin(s)?$/i.test(unitLower)) {
        normalizedUnit = 'brin(s)'
      } else if (/^gousse(s)?$/i.test(unitLower)) {
        normalizedUnit = 'gousse(s)'
      } else if (/^tranche(s)?$/i.test(unitLower)) {
        normalizedUnit = 'tranche(s)'
      } else if (/^pot(s)?$/i.test(unitLower)) {
        normalizedUnit = 'pot(s)'
      } else if (/^sachet(s)?$/i.test(unitLower)) {
        normalizedUnit = 'sachet(s)'
      } else if (/^botte(s)?$/i.test(unitLower)) {
        normalizedUnit = 'botte(s)'
      } else if (/^(verre|tasse)$/i.test(unitLower)) {
        normalizedUnit = 'verre'
      } else {
        normalizedUnit = unitLower
      }
    }
    
    return {
      name: cleanedName,
      quantity: parsedQty,
      unit: normalizedUnit,
    }
  }
  
  // If no match, treat whole line as ingredient name
  let cleanedName = cleaned.replace(/^(de|d'|du|des|de la|de l'|la|le|l'|un|une)\s+/i, '')
  if (cleanedName.length > 0) {
    cleanedName = cleanedName.charAt(0).toUpperCase() + cleanedName.slice(1)
  }
  
  return {
    name: cleanedName,
    quantity: 1,
    unit: 'pièce(s)',
  }
}
