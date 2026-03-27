import { NextRequest, NextResponse } from 'next/server'
import { db, Member } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')
  let members = db.getMembers()
  if (search) {
    members = members.filter(m =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search)
    )
  }
  return NextResponse.json(members)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const members = db.getMembers()
  // Check duplicate phone
  if (members.find(m => m.phone === body.phone)) {
    return NextResponse.json({ error: 'เบอร์โทรนี้มีในระบบแล้ว' }, { status: 400 })
  }
  const member: Member = {
    id: uuidv4(),
    name: body.name,
    phone: body.phone,
    email: body.email,
    points: 0,
    totalSpent: 0,
    joinedAt: new Date().toISOString(),
    notes: body.notes,
  }
  members.push(member)
  db.saveMembers(members)
  return NextResponse.json(member, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const members = db.getMembers()
  const idx = members.findIndex(m => m.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  members[idx] = { ...members[idx], ...body }
  db.saveMembers(members)
  return NextResponse.json(members[idx])
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const members = db.getMembers().filter(m => m.id !== id)
  db.saveMembers(members)
  return NextResponse.json({ ok: true })
}
