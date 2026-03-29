import { db } from '@/lib/db'
import MenuClient from '@/components/MenuClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'เมนูอาหาร',
  description: 'สั่งอาหารผ่าน QR Code',
}

interface Props {
  searchParams: Promise<{ table?: string }>
}

export default async function CustomerMenuPage({ searchParams }: Props) {
  const { table } = await searchParams
  const products = db.getProducts().filter(p => p.isActive)
  const categories = db.getCategories()
  const settings = db.getSettings()
  const members = db.getMembers()
  const hasLoyalty = settings.pointsPerBaht > 0 && members.length > 0

  return (
    <MenuClient
      products={products}
      categories={categories}
      shopName={settings.shopName}
      tableNo={table ?? ''}
      loyaltyEnabled={hasLoyalty}
      pointsPerBaht={settings.pointsPerBaht}
    />
  )
}
