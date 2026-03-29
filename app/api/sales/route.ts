import { NextRequest, NextResponse } from 'next/server'
import { db, Sale, StockLog, KitchenOrder, KitchenOrderItem } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { generateReceiptNo } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const month = searchParams.get('month')
  const limit = searchParams.get('limit')
  let sales = db.getSales().filter(s => s.status === 'completed')
  if (date) sales = sales.filter(s => s.createdAt.startsWith(date))
  if (month) sales = sales.filter(s => s.createdAt.startsWith(month))
  sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  if (limit) sales = sales.slice(0, Number(limit))
  return NextResponse.json(sales)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const sales = db.getSales()
  const products = db.getProducts()
  const members = db.getMembers()
  const settings = db.getSettings()

  const now = new Date().toISOString()

  const sale: Sale = {
    id: uuidv4(),
    receiptNo: generateReceiptNo(),
    tableNo: body.tableNo,
    items: body.items,
    subtotal: body.subtotal,
    discount: body.discount || 0,
    discountNote: body.discountNote,
    total: body.total,
    paymentMethod: body.paymentMethod,
    cashReceived: body.cashReceived,
    change: body.change,
    memberId: body.memberId,
    memberName: body.memberName,
    pointsEarned: Math.floor(body.total / settings.pointsPerBaht),
    createdAt: now,
    status: 'completed',
  }

  // Deduct stock
  const stockLogs = db.getStockLogs()
  for (const item of body.items) {
    const prod = products.find(p => p.id === item.productId)
    if (prod && prod.trackStock) {
      prod.stock = Math.max(0, prod.stock - item.qty)
      stockLogs.push({
        id: uuidv4(),
        productId: prod.id,
        productName: prod.name,
        type: 'out',
        qty: item.qty,
        note: `ขาย #${sale.receiptNo}`,
        createdAt: now,
      })
    }
  }
  db.saveProducts(products)
  db.saveStockLogs(stockLogs)

  // Update member points
  if (body.memberId) {
    const memberIdx = members.findIndex(m => m.id === body.memberId)
    if (memberIdx !== -1) {
      members[memberIdx].points += sale.pointsEarned
      members[memberIdx].totalSpent += sale.total
      db.saveMembers(members)
    }
  }

  // ---- Route items to Kitchen Stations ----
  const stations = db.getStations().filter(s => s.isActive)
  const newKitchenOrders: KitchenOrder[] = []

  if (stations.length > 0) {
    // Group sale items by stationId
    const stationItemMap = new Map<string, KitchenOrderItem[]>()

    for (const item of body.items) {
      const prod = products.find(p => p.id === item.productId)
      if (!prod || !prod.stationId) continue  // skip items with no station assigned

      const existing = stationItemMap.get(prod.stationId) || []
      existing.push({
        productId: item.productId,
        productName: item.productName,
        qty: item.qty,
        note: item.note,
      })
      stationItemMap.set(prod.stationId, existing)
    }

    // Create one KitchenOrder per station that has items
    for (const [stationId, items] of Array.from(stationItemMap.entries())) {
      const station = stations.find(s => s.id === stationId)
      if (!station) continue

      newKitchenOrders.push({
        id: uuidv4(),
        saleId: sale.id,
        receiptNo: sale.receiptNo,
        stationId,
        stationName: station.name,
        tableNo: body.tableNo,
        items,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })
    }

    db.addKitchenOrders(newKitchenOrders)
  }

  sales.push(sale)
  db.saveSales(sales)

  // Return sale + kitchen orders for this sale (so POS can show KOT)
  return NextResponse.json({ ...sale, kitchenOrders: newKitchenOrders }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json() // void sale
  const sales = db.getSales()
  const idx = sales.findIndex(s => s.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  sales[idx].status = 'voided'
  db.saveSales(sales)
  return NextResponse.json(sales[idx])
}
