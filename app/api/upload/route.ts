import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

const IMAGE_DIR = path.join(process.cwd(), 'data', 'product-images')

// Ensure directory exists
if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File | null
    const productId = formData.get('productId') as string | null

    if (!file || !productId) {
      return NextResponse.json({ error: 'Missing image or productId' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'ไฟล์ต้องเป็น JPG, PNG หรือ WebP เท่านั้น' }, { status: 400 })
    }

    // Validate file size (max 5MB - client should have already resized)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'ไฟล์ใหญ่เกินไป (สูงสุด 5MB)' }, { status: 400 })
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Determine extension
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const filename = `${productId}.${ext}`
    const filepath = path.join(IMAGE_DIR, filename)

    // Remove old images for this product (different extensions)
    const exts = ['jpg', 'jpeg', 'png', 'webp']
    exts.forEach(e => {
      const old = path.join(IMAGE_DIR, `${productId}.${e}`)
      if (fs.existsSync(old)) fs.unlinkSync(old)
    })

    // Write file
    fs.writeFileSync(filepath, buffer)

    const imageUrl = `/api/images?id=${productId}`
    return NextResponse.json({ ok: true, image: imageUrl, filename })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

// DELETE - remove product image
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('id')

  if (!productId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const exts = ['jpg', 'jpeg', 'png', 'webp']
  exts.forEach(e => {
    const filepath = path.join(IMAGE_DIR, `${productId}.${e}`)
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
  })

  return NextResponse.json({ ok: true })
}
