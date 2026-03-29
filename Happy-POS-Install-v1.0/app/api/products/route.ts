import { NextRequest, NextResponse } from 'next/server'
import { db, Product } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('categoryId')
  const search = searchParams.get('search')
  let products = db.getProducts()
  if (categoryId) products = products.filter(p => p.categoryId === categoryId)
  if (search) products = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search))
  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const products = db.getProducts()
  const product: Product = {
    id: uuidv4(),
    name: body.name,
    price: Number(body.price),
    cost: Number(body.cost) || 0,
    categoryId: body.categoryId,
    stock: Number(body.stock) || 0,
    trackStock: body.trackStock ?? false,
    barcode: body.barcode,
    image: body.image,
    isActive: body.isActive ?? true,
    createdAt: new Date().toISOString(),
  }
  products.push(product)
  db.saveProducts(products)
  return NextResponse.json(product, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const products = db.getProducts()
  const idx = products.findIndex(p => p.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  products[idx] = { ...products[idx], ...body }
  db.saveProducts(products)
  return NextResponse.json(products[idx])
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const products = db.getProducts().filter(p => p.id !== id)
  db.saveProducts(products)
  return NextResponse.json({ ok: true })
}
