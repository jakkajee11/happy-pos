import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

const IMAGE_DIR = path.join(process.cwd(), 'data', 'product-images')

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  // Look for image with any extension
  const exts = ['jpg', 'jpeg', 'png', 'webp']
  let filepath = ''
  let contentType = 'image/jpeg'

  for (const ext of exts) {
    const candidate = path.join(IMAGE_DIR, `${id}.${ext}`)
    if (fs.existsSync(candidate)) {
      filepath = candidate
      if (ext === 'png') contentType = 'image/png'
      else if (ext === 'webp') contentType = 'image/webp'
      else contentType = 'image/jpeg'
      break
    }
  }

  if (!filepath) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const buffer = fs.readFileSync(filepath)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}
