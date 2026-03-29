import { NextRequest, NextResponse } from 'next/server'

// Customer-accessible paths (QR menu)
// Uses exact match function to avoid matching /members, /menu, etc.
function isCustomerPath(pathname: string): boolean {
  return pathname === '/m' || pathname.startsWith('/m/')  || pathname.startsWith('/m?')
}

// APIs that customers are allowed to call
const CUSTOMER_API_WHITELIST = [
  { path: '/api/orders', methods: ['POST', 'GET'] },    // สร้าง + ดูออเดอร์ของตัวเอง
  { path: '/api/products', methods: ['GET'] },           // ดูรายการสินค้า (สำหรับเมนู)
  { path: '/api/categories', methods: ['GET'] },         // ดูหมวดหมู่
  { path: '/api/images', methods: ['GET'] },             // ดูรูปสินค้า
  { path: '/api/notifications', methods: ['POST'] },     // เรียกเช็คบิล / เรียกพนักงาน
]

// Static assets and Next.js internals — always allow
const ALWAYS_ALLOW = ['/_next', '/favicon.ico', '/icons']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow static assets and Next.js internals
  if (ALWAYS_ALLOW.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Customer-facing routes: set request header for layout detection, allow access
  if (isCustomerPath(pathname)) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-customer-route', '1')
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  // API routes: check if customer is accessing a restricted API
  if (pathname.startsWith('/api/')) {
    const referer = request.headers.get('referer') || ''
    let isFromCustomerPage = false
    try {
      const refUrl = new URL(referer)
      isFromCustomerPage = isCustomerPath(refUrl.pathname)
    } catch {
      // Invalid referer — treat as admin
    }

    // If request comes from customer page, only allow whitelisted APIs
    if (isFromCustomerPage) {
      const method = request.method
      const allowed = CUSTOMER_API_WHITELIST.some(
        rule => pathname.startsWith(rule.path) && rule.methods.includes(method)
      )
      if (!allowed) {
        return NextResponse.json(
          { error: 'ไม่มีสิทธิ์เข้าถึง' },
          { status: 403 }
        )
      }
    }

    return NextResponse.next()
  }

  // Admin pages — allow (shop staff accesses from local network)
  // The old /menu route redirects to /m for customer isolation
  if (pathname.startsWith('/menu')) {
    const url = request.nextUrl.clone()
    url.pathname = '/m'
    // Preserve query params (e.g., ?table=5)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
