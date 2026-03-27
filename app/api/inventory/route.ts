import { NextRequest, NextResponse } from 'next/server'
import { db, StockLog } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')
  let logs = db.getStockLogs()
  if (productId) logs = logs.filter(l => l.productId === productId)
  logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return NextResponse.json(logs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const products = db.getProducts()
  const logs = db.getStockLogs()
  const prod = products.find(p => p.id === body.productId)
  if (!prod) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const qty = Number(body.qty)
  if (body.type === 'in') prod.stock += qty
  else if (body.type === 'out') prod.stock = Math.max(0, prod.stock - qty)
  else if (body.type === 'adjust') prod.stock = qty

  const log: StockLog = {
    id: uuidv4(),
    productId: prod.id,
    productName: prod.name,
    type: body.type,
    qty,
    note: body.note,
    createdAt: new Date().toISOString(),
  }
  logs.push(log)
  db.saveProducts(products)
  db.saveStockLogs(logs)
  return NextResponse.json({ product: prod, log }, { status: 201 })
}
