import { NextRequest, NextResponse } from 'next/server'
import { db, OpenOrder } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

function generateOrderNo(): string {
  const orders = db.getOpenOrders()
  const allOrders = [...orders, ...db.getSales()]  // avoid duplication
  const seq = String(orders.length + 1).padStart(3, '0')
  const today = new Date().toISOString().slice(5, 10).replace('-', '')  // MMDD
  return `ORD-${today}-${seq}`
}

// GET — list open orders (status=open by default)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'open'
  const orders = db.getOpenOrders().filter(o => o.status === status)
  orders.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return NextResponse.json(orders)
}

// POST — create new open order (hold order from POS)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const orders = db.getOpenOrders()
  const now = new Date().toISOString()

  const order: OpenOrder = {
    id: uuidv4(),
    orderNo: generateOrderNo(),
    tableNo: body.tableNo,
    items: body.items,
    note: body.note,
    memberId: body.memberId,
    memberName: body.memberName,
    discount: body.discount || 0,
    discountNote: body.discountNote,
    subtotal: body.subtotal,
    total: body.total,
    status: 'open',
    createdAt: now,
    updatedAt: now,
  }

  orders.push(order)
  db.saveOpenOrders(orders)
  return NextResponse.json(order, { status: 201 })
}

// PUT — update existing open order (add items, edit)
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const orders = db.getOpenOrders()
  const idx = orders.findIndex(o => o.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  orders[idx] = {
    ...orders[idx],
    tableNo: body.tableNo ?? orders[idx].tableNo,
    items: body.items ?? orders[idx].items,
    note: body.note ?? orders[idx].note,
    memberId: body.memberId ?? orders[idx].memberId,
    memberName: body.memberName ?? orders[idx].memberName,
    discount: body.discount ?? orders[idx].discount,
    discountNote: body.discountNote ?? orders[idx].discountNote,
    subtotal: body.subtotal ?? orders[idx].subtotal,
    total: body.total ?? orders[idx].total,
    updatedAt: new Date().toISOString(),
  }

  db.saveOpenOrders(orders)
  return NextResponse.json(orders[idx])
}

// DELETE — cancel an open order
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const orders = db.getOpenOrders()
  const idx = orders.findIndex(o => o.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  orders[idx].status = 'cancelled'
  orders[idx].updatedAt = new Date().toISOString()
  db.saveOpenOrders(orders)
  return NextResponse.json({ ok: true })
}
