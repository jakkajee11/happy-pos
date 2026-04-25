import { NextRequest, NextResponse } from 'next/server'
import { db, Ingredient, StockLog } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  const ingredients = db.getIngredients()
  return NextResponse.json(ingredients)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.action === 'adjustStock') {
    const ingredients = db.getIngredients()
    const ing = ingredients.find(i => i.id === body.ingredientId)
    if (!ing) return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })

    const qty = Number(body.qty)
    if (body.type === 'in') ing.stock += qty
    else if (body.type === 'out') ing.stock = Math.max(0, ing.stock - qty)
    else if (body.type === 'adjust') ing.stock = qty

    db.saveIngredients(ingredients)
    db.addStockLog({
      id: uuidv4(),
      productId: '',
      productName: '',
      ingredientId: ing.id,
      ingredientName: ing.name,
      type: body.type,
      qty,
      note: body.note,
      createdAt: new Date().toISOString(),
    })
    return NextResponse.json({ ingredient: ing }, { status: 201 })
  }

  const ingredient: Ingredient = {
    id: uuidv4(),
    name: body.name,
    unit: body.unit || 'pcs',
    stock: Number(body.stock) || 0,
    lowStockThreshold: Number(body.lowStockThreshold) || 0,
    createdAt: new Date().toISOString(),
  }
  const ingredients = db.getIngredients()
  ingredients.push(ingredient)
  db.saveIngredients(ingredients)
  return NextResponse.json(ingredient, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const ingredients = db.getIngredients()
  const idx = ingredients.findIndex(i => i.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })

  ingredients[idx] = {
    ...ingredients[idx],
    name: body.name ?? ingredients[idx].name,
    unit: body.unit ?? ingredients[idx].unit,
    lowStockThreshold: body.lowStockThreshold ?? ingredients[idx].lowStockThreshold,
  }
  db.saveIngredients(ingredients)
  return NextResponse.json(ingredients[idx])
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  db.deleteIngredient(id)
  return NextResponse.json({ success: true })
}
