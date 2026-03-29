import { db } from '@/lib/db'
import PromotionsClient from '@/components/PromotionsClient'

export const dynamic = 'force-dynamic'

export default function PromotionsPage() {
  return <PromotionsClient initialPromotions={db.getPromotions()} />
}
