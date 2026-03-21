// API route for OCR recipe import - minimal test version
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

    // For now, return a simple test response
    return NextResponse.json({
      name: 'Test Recipe',
      description: 'OCR route is working!',
      duration: 30,
      servings: 4,
      ingredients: [
        { name: 'Test Ingredient', quantity: 1, unit: 'pièce(s)' }
      ],
      steps: ['Test step 1'],
      tags: [],
      image_url: null,
    })
  } catch (error) {
    console.error('OCR error:', error)
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    )
  }
}
