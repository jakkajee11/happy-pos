import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  return NextResponse.json(db.getSettings())
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const settings = db.getSettings()
  const updated = { ...settings, ...body }
  db.saveSettings(updated)
  return NextResponse.json(updated)
}
