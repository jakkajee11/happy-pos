import { NextRequest, NextResponse } from 'next/server'
import { db, Category } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  return NextResponse.json(db.getCategories())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const categories = db.getCategories()
  const category: Category = {
    id: uuidv4(),
    name: body.name,
    icon: body.icon || '📦',
    color: body.color || '#6B7280',
    createdAt: new Date().toISOString(),
  }
  categories.push(category)
  db.saveCategories(categories)
  return NextResponse.json(category, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const categories = db.getCategories()
  const idx = categories.findIndex(c => c.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  categories[idx] = { ...categories[idx], ...body }
  db.saveCategories(categories)
  return NextResponse.json(categories[idx])
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const categories = db.getCategories().filter(c => c.id !== id)
  db.saveCategories(categories)
  return NextResponse.json({ ok: true })
}
