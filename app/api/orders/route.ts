import { NextRequest, NextResponse } from 'next/server'
import { db, OpenOrder, KitchenOrder, KitchenOrderItem } from '@/lib/db'
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

  // ---- Route items to Kitchen Stations (same logic as sales) ----
  const stations = db.getStations().filter(s => s.isActive)
  let newKitchenOrders: KitchenOrder[] = []

  if (stations.length > 0) {
    const products = db.getProducts()
    const kitchenOrders = db.getKitchenOrders()
    const stationItemMap = new Map<string, KitchenOrderItem[]>()

    for (const item of body.items) {
      const prod = products.find((p: { id: string }) => p.id === item.productId)
      if (!prod || !prod.stationId) continue

      const existing = stationItemMap.get(prod.stationId) || []
      existing.push({
        productId: item.productId,
        productName: item.productName,
        qty: item.qty,
        note: item.note,
      })
      stationItemMap.set(prod.stationId, existing)
    }

    for (const [stationId, items] of Array.from(stationItemMap.entries())) {
      const station = stations.find(s => s.id === stationId)
      if (!station) continue

      const ko: KitchenOrder = {
        id: uuidv4(),
        saleId: order.id,          // ใช้ order id แทน sale id
        receiptNo: order.orderNo,  // ใช้ order no แทน receipt no
        stationId,
        stationName: station.name,
        tableNo: body.tableNo,
        items,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      }
      kitchenOrders.push(ko)
      newKitchenOrders.push(ko)
    }

    db.saveKitchenOrders(kitchenOrders)
  }

  return NextResponse.json({ ...order, kitchenOrders: newKitchenOrders }, { status: 201 })
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
