import { NextRequest, NextResponse } from 'next/server'
import { db, RecipeIngredient } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')
  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 })

  const recipe = db.getRecipeByProductId(productId)
  const available = db.getAvailableStock(productId)
  return NextResponse.json({ recipe, availableStock: available })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { productId, items }: { productId: string; items: { ingredientId: string; qtyPerUnit: number }[] } = body
  if (!productId || !items?.length) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

  const now = new Date().toISOString()
  const recipeItems: RecipeIngredient[] = items.map(item => ({
    id: uuidv4(),
    productId,
    ingredientId: item.ingredientId,
    qtyPerUnit: Number(item.qtyPerUnit),
    createdAt: now,
  }))
  db.saveRecipe(productId, recipeItems)

  const recipe = db.getRecipeByProductId(productId)
  const available = db.getAvailableStock(productId)
  return NextResponse.json({ recipe, availableStock: available }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')
  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 })

  db.deleteRecipe(productId)
  return NextResponse.json({ success: true })
}
