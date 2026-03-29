import { db } from '@/lib/db'
import ClosingClient from '@/components/ClosingClient'

export const dynamic = 'force-dynamic'

export default function ClosingPage() {
  const settings = db.getSettings()
  const today = new Date().toISOString().slice(0, 10)
  const sales = db.getSales().filter(s => s.status === 'completed' && s.createdAt.startsWith(today))
  sales.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <ClosingClient
      sales={sales}
      shopName={settings.shopName}
      shopAddress={settings.shopAddress}
      date={today}
    />
  )
}
