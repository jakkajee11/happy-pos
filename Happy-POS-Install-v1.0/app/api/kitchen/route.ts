import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const stationId = searchParams.get('stationId')
  const status = searchParams.get('status')  // pending,preparing,ready,done
  const saleId = searchParams.get('saleId')

  let orders = db.getKitchenOrders()

  if (stationId) orders = orders.filter(o => o.stationId === stationId)
  if (status) {
    const statuses = status.split(',')
    orders = orders.filter(o => statuses.includes(o.status))
  }
  if (saleId) orders = orders.filter(o => o.saleId === saleId)

  // Sort: newest first, but pending/preparing before ready/done
  const statusOrder = { pending: 0, preparing: 1, ready: 2, done: 3 }
  orders.sort((a, b) => {
    const sd = statusOrder[a.status] - statusOrder[b.status]
    if (sd !== 0) return sd
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return NextResponse.json(orders)
}

export async function PATCH(req: NextRequest) {
  // Update status of a kitchen order
  const body = await req.json() // { id, status, note? }
  const orders = db.getKitchenOrders()
  const idx = orders.findIndex(o => o.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  orders[idx] = {
    ...orders[idx],
    status: body.status ?? orders[idx].status,
    note: body.note ?? orders[idx].note,
    updatedAt: new Date().toISOString(),
  }
  db.saveKitchenOrders(orders)
  return NextResponse.json(orders[idx])
}

export async function DELETE(req: NextRequest) {
  // Mark all 'done' orders as archived (just delete from active list)
  const { searchParams } = new URL(req.url)
  const stationId = searchParams.get('stationId')
  let orders = db.getKitchenOrders()
  if (stationId) {
    orders = orders.filter(o => !(o.stationId === stationId && o.status === 'done'))
  } else {
    orders = orders.filter(o => o.status !== 'done')
  }
  db.saveKitchenOrders(orders)
  return NextResponse.json({ ok: true })
}
