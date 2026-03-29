import { NextRequest, NextResponse } from 'next/server'
import { db, Notification } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// GET — list notifications (admin polls this)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined
  const notifications = db.getNotifications(status)
  return NextResponse.json(notifications)
}

// POST — create notification (customer sends check-bill / call-staff)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const now = new Date().toISOString()

  const notification: Notification = {
    id: uuidv4(),
    type: body.type,
    tableNo: body.tableNo,
    orderId: body.orderId,
    message: body.message || getDefaultMessage(body.type, body.tableNo),
    status: 'unread',
    createdAt: now,
  }

  db.addNotification(notification)
  return NextResponse.json(notification, { status: 201 })
}

// PATCH — mark notification(s) as read
export async function PATCH(req: NextRequest) {
  const body = await req.json()

  if (body.markAllRead) {
    db.markAllNotificationsRead()
    return NextResponse.json({ ok: true })
  }

  if (body.id) {
    db.markNotificationRead(body.id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Missing id or markAllRead' }, { status: 400 })
}

function getDefaultMessage(type: string, tableNo?: string): string {
  const table = tableNo ? `โต๊ะ ${tableNo}` : 'ลูกค้า'
  switch (type) {
    case 'check-bill': return `${table} ขอเช็คบิล`
    case 'call-staff': return `${table} เรียกพนักงาน`
    default: return `${table} แจ้งเตือน`
  }
}
