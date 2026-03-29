import { db } from '@/lib/db'
import InventoryClient from '@/components/InventoryClient'

export const dynamic = 'force-dynamic'

export default function InventoryPage() {
  const products = db.getProducts()
  const categories = db.getCategories()
  const logs = db.getStockLogs().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50)
  const settings = db.getSettings()
  return <InventoryClient initialProducts={products} categories={categories} recentLogs={logs} lowStockAlert={settings.lowStockAlert} />
}
