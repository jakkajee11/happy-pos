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
  orders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  return NextResponse.json(orders)
}

// POST — create new open order or merge into existing order for the same table
export async function POST(req: NextRequest) {
  const body = await req.json()
  const orders = db.getOpenOrders()
  const now = new Date().toISOString()

  // ── ถ้ามี tableNo → ค้นหาออเดอร์ที่เปิดอยู่ของโต๊ะเดียวกัน ──
  let order: OpenOrder
  let isExisting = false
  const existingIdx = body.tableNo
    ? orders.findIndex(o => o.status === 'open' && o.tableNo === body.tableNo)
    : -1

  if (existingIdx !== -1) {
    // รวมรายการเข้าออเดอร์เดิม
    isExisting = true
    const existing = orders[existingIdx]

    // เพิ่ม items ใหม่เข้าไป (merge qty ถ้า productId ซ้ำ)
    const mergedItems = [...existing.items]
    for (const newItem of body.items) {
      const idx = mergedItems.findIndex(i => i.productId === newItem.productId && (i.note ?? '') === (newItem.note ?? ''))
      if (idx !== -1) {
        mergedItems[idx] = {
          ...mergedItems[idx],
          qty: mergedItems[idx].qty + newItem.qty,
          total: (mergedItems[idx].qty + newItem.qty) * mergedItems[idx].price,
        }
      } else {
        mergedItems.push(newItem)
      }
    }

    const newSubtotal = mergedItems.reduce((s, i) => s + i.total, 0)
    orders[existingIdx] = {
      ...existing,
      items: mergedItems,
      note: [existing.note, body.note].filter(Boolean).join(' | ') || undefined,
      subtotal: newSubtotal,
      total: newSubtotal - existing.discount,
      updatedAt: now,
    }
    order = orders[existingIdx]
    db.saveOpenOrders(orders)
  } else {
    // สร้างออเดอร์ใหม่
    order = {
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
  }

  // ---- Route items to Kitchen Stations ----
  const stations = db.getStations().filter(s => s.isActive)
  const newKitchenOrders: KitchenOrder[] = []

  if (stations.length > 0) {
    const products = db.getProducts()
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

      newKitchenOrders.push({
        id: uuidv4(),
        saleId: order.id,
        receiptNo: order.orderNo,
        stationId,
        stationName: station.name,
        tableNo: body.tableNo,
        items,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })
    }

    // ใช้ addKitchenOrders (INSERT ตรงๆ) แทน saveKitchenOrders (replace all)
    db.addKitchenOrders(newKitchenOrders)
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
