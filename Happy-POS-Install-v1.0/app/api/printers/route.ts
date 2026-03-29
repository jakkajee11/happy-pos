import { NextRequest, NextResponse } from 'next/server'
import { db, Printer } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  const printers = db.getPrinters()
  return NextResponse.json(printers)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const printers = db.getPrinters()

  // If this is set as default, unset others of same type
  if (body.isDefault) {
    printers.forEach(p => {
      if (p.type === body.type) p.isDefault = false
    })
  }

  const printer: Printer = {
    id: uuidv4(),
    name: body.name,
    type: body.type || 'general',
    connectionType: body.connectionType || 'browser',
    ipAddress: body.ipAddress,
    port: body.port || (body.connectionType === 'network' ? 9100 : undefined),
    usbVendorId: body.usbVendorId,
    bluetoothAddress: body.bluetoothAddress,
    paperWidth: body.paperWidth || 80,
    isDefault: body.isDefault ?? false,
    isActive: true,
    createdAt: new Date().toISOString(),
  }
  printers.push(printer)
  db.savePrinters(printers)
  return NextResponse.json(printer, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const printers = db.getPrinters()
  const idx = printers.findIndex(p => p.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If setting as default, unset others of same type
  if (body.isDefault) {
    printers.forEach((p, i) => {
      if (i !== idx && p.type === (body.type || printers[idx].type)) p.isDefault = false
    })
  }

  printers[idx] = { ...printers[idx], ...body }
  db.savePrinters(printers)
  return NextResponse.json(printers[idx])
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const printers = db.getPrinters().filter(p => p.id !== id)
  db.savePrinters(printers)
  return NextResponse.json({ ok: true })
}

// PATCH: test print / update lastSeen
export async function PATCH(req: NextRequest) {
  const body = await req.json() // { id, action: 'test' | 'ping' }
  const printers = db.getPrinters()
  const idx = printers.findIndex(p => p.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  printers[idx].lastSeen = new Date().toISOString()
  db.savePrinters(printers)
  return NextResponse.json({ ok: true, printer: printers[idx] })
}
