import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// API endpoint pour le widget - retourne la liste de courses
export async function GET(request: NextRequest) {
  try {
    // Récupérer l'user_id depuis le header ou query param
    const userId = request.nextUrl.searchParams.get('user_id')
    const widgetToken = request.nextUrl.searchParams.get('token')
    
    if (!userId || !widgetToken) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 401 })
    }

    // Vérifier le token du widget (vous devriez stocker ça en DB)
    // Pour l'instant, on simplifie
    
    // Récupérer le menu de la semaine
    const { data: menuItems, error: menuError } = await supabase
      .from('pantry_menu_items')
      .select('*, recipe:pantry_recipes(*)')
      .eq('user_id', userId)
    
    if (menuError) throw menuError

    // Récupérer les produits du garde-manger
    const { data: pantryItems, error: pantryError } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('user_id', userId)
    
    if (pantryError) throw pantryError

    // Calculer les ingrédients nécessaires
    const needed: Record<string, { name: string; quantity: number; unit: string; missing: number }> = {}
    
    menuItems?.forEach(menuItem => {
      const recipe = menuItem.recipe
      if (!recipe || !recipe.ingredients) return

      recipe.ingredients.forEach((ing: any) => {
        const key = ing.name.toLowerCase()
        if (!needed[key]) {
          needed[key] = { name: ing.name, quantity: 0, unit: ing.unit, missing: 0 }
        }
        needed[key].quantity += ing.quantity
      })
    })

    // Calculer ce qui manque
    Object.values(needed).forEach(item => {
      const pantryItem = pantryItems?.find(p => p.name.toLowerCase() === item.name.toLowerCase())
      const hasQty = pantryItem?.quantity || 0
      item.missing = Math.max(0, item.quantity - hasQty)
    })

    // Filtrer uniquement ce qui manque
    const shoppingList = Object.values(needed)
      .filter(item => item.missing > 0)
      .map(item => ({
        name: item.name,
        quantity: item.missing,
        unit: item.unit,
      }))
      .slice(0, 20) // Limite pour le widget

    return NextResponse.json({
      items: shoppingList,
      totalItems: shoppingList.length,
      lastUpdate: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Widget API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shopping list' },
      { status: 500 }
    )
  }
}

// POST pour marquer un item comme acheté depuis le widget
export async function POST(request: NextRequest) {
  try {
    const { itemName, userId, widgetToken } = await request.json()
    
    if (!userId || !widgetToken) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 401 })
    }

    // Ici, vous pourriez stocker les items cochés dans une table séparée
    // Pour l'instant, on retourne juste un succès
    
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Widget POST error:', error)
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    )
  }
}
