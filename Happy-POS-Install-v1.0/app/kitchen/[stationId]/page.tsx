export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import KitchenDisplay from '@/components/KitchenDisplay'

// Next.js 15+: params is now a Promise
interface Props {
  params: Promise<{ stationId: string }>
}

export default async function KitchenStationPage({ params }: Props) {
  const { stationId } = await params

  const station = db.getStations().find(s => s.id === stationId)
  if (!station) notFound()

  const printer = station.printerId
    ? db.getPrinters().find(p => p.id === station.printerId)
    : null

  const initialOrders = db.getKitchenOrders()
    .filter(o => o.stationId === stationId && o.status !== 'done')

  return (
    <KitchenDisplay
      station={station}
      printer={printer ?? null}
      initialOrders={initialOrders}
    />
  )
}
