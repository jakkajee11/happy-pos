import { db } from '@/lib/db'
import SettingsClient from '@/components/SettingsClient'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  return (
    <SettingsClient
      initialSettings={db.getSettings()}
      initialStations={db.getStations()}
      initialPrinters={db.getPrinters()}
    />
  )
}
