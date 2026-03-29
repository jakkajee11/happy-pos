import { db } from '@/lib/db'
import ReportsClient from '@/components/ReportsClient'

export const dynamic = 'force-dynamic'

export default function ReportsPage() {
  const allSales = db.getSales()
  const products = db.getProducts()
  return <ReportsClient allSales={allSales} products={products} />
}
