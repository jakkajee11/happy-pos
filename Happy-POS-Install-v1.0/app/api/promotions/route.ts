import { NextRequest, NextResponse } from 'next/server'
import { db, Promotion } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  return NextResponse.json(db.getPromotions())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const promotions = db.getPromotions()
  const promo: Promotion = {
    id: uuidv4(),
    name: body.name,
    type: body.type,
    value: Number(body.value),
    minAmount: Number(body.minAmount) || 0,
    maxDiscount: body.maxDiscount ? Number(body.maxDiscount) : undefined,
    isActive: body.isActive ?? true,
    startDate: body.startDate || new Date().toISOString(),
    endDate: body.endDate,
    code: body.code,
  }
  promotions.push(promo)
  db.savePromotions(promotions)
  return NextResponse.json(promo, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const promotions = db.getPromotions()
  const idx = promotions.findIndex(p => p.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  promotions[idx] = { ...promotions[idx], ...body }
  db.savePromotions(promotions)
  return NextResponse.json(promotions[idx])
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  db.savePromotions(db.getPromotions().filter(p => p.id !== id))
  return NextResponse.json({ ok: true })
}
