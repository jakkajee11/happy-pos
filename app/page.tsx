import { db } from '@/lib/db'
import DashboardClient from '@/components/DashboardClient'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10)
  const month = new Date().toISOString().slice(0, 7)

  const allSales = db.getSales().filter(s => s.status === 'completed')
  const todaySales = allSales.filter(s => s.createdAt.startsWith(today))
  const monthSales = allSales.filter(s => s.createdAt.startsWith(month))

  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0)
  const monthRevenue = monthSales.reduce((sum, s) => sum + s.total, 0)
  const todayOrders = todaySales.length
  const avgOrder = todayOrders > 0 ? todayRevenue / todayOrders : 0

  // Top products today
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {}
  for (const sale of monthSales) {
    for (const item of sale.items) {
      if (!productMap[item.productId]) {
        productMap[item.productId] = { name: item.productName, qty: 0, revenue: 0 }
      }
      productMap[item.productId].qty += item.qty
      productMap[item.productId].revenue += item.total
    }
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Daily sales for chart (last 7 days)
  const dailyData: { date: string; revenue: number; orders: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const daySales = allSales.filter(s => s.createdAt.startsWith(dateStr))
    dailyData.push({
      date: d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
      revenue: daySales.reduce((sum, s) => sum + s.total, 0),
      orders: daySales.length,
    })
  }

  // Payment method breakdown today
  const paymentBreakdown = todaySales.reduce((acc, s) => {
    acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.total
    return acc
  }, {} as Record<string, number>)

  const products = db.getProducts()
  const lowStock = products.filter(p => p.trackStock && p.stock <= db.getSettings().lowStockAlert)
  const members = db.getMembers()

  const recentSales = allSales
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const openOrdersCount = db.getOpenOrders().filter(o => o.status === 'open').length

  return (
    <DashboardClient
      stats={{
        todayRevenue,
        monthRevenue,
        todayOrders,
        avgOrder,
        totalMembers: members.length,
        lowStockCount: lowStock.length,
      }}
      dailyData={dailyData}
      topProducts={topProducts}
      paymentBreakdown={paymentBreakdown}
      recentSales={recentSales}
      lowStockItems={lowStock.slice(0, 5)}
      openOrdersCount={openOrdersCount}
    />
  )
}
