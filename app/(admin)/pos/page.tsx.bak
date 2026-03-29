import { db } from '@/lib/db'
import POSClient from '@/components/POSClient'

export const dynamic = 'force-dynamic'

export default async function POSPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const { orderId } = await searchParams
  const products = db.getProducts().filter(p => p.isActive)
  const categories = db.getCategories()
  const members = db.getMembers()
  const promotions = db.getPromotions().filter(p => p.isActive)
  const settings = db.getSettings()

  // Resume an existing open order if orderId param is present
  const resumeOrder = orderId
    ? db.getOpenOrders().find(o => o.id === orderId && o.status === 'open') ?? null
    : null

  return (
    <POSClient
      initialProducts={products}
      categories={categories}
      members={members}
      promotions={promotions}
      settings={settings}
      resumeOrder={resumeOrder}
    />
  )
}
