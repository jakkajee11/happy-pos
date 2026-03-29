import { db } from '@/lib/db'
import OrdersClient from '@/components/OrdersClient'

export const dynamic = 'force-dynamic'

export default function OrdersPage() {
  const orders = db.getOpenOrders().filter(o => o.status === 'open')
  orders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  return <OrdersClient initialOrders={orders} />
}
