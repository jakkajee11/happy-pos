import { db } from '@/lib/db'
import MembersClient from '@/components/MembersClient'

export const dynamic = 'force-dynamic'

export default function MembersPage() {
  const members = db.getMembers()
  const settings = db.getSettings()
  return <MembersClient initialMembers={members} settings={settings} />
}
