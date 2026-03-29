import { NextRequest, NextResponse } from 'next/server'
import { db, Station } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  const stations = db.getStations()
  return NextResponse.json(stations)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const stations = db.getStations()
  const station: Station = {
    id: uuidv4(),
    name: body.name,
    color: body.color || '#6b7280',
    printerId: body.printerId || undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
  }
  stations.push(station)
  db.saveStations(stations)
  return NextResponse.json(station, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const stations = db.getStations()
  const idx = stations.findIndex(s => s.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  stations[idx] = { ...stations[idx], ...body }
  db.saveStations(stations)
  return NextResponse.json(stations[idx])
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const stations = db.getStations().filter(s => s.id !== id)
  db.saveStations(stations)
  return NextResponse.json({ ok: true })
}
