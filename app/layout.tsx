import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { db } from '@/lib/db'
import { getThemePreset, generateThemeCSS } from '@/lib/themes'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Happy POS',
  description: 'ระบบ POS สำหรับธุรกิจขนาดเล็ก-กลาง',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = db.getSettings()
  const theme = getThemePreset(settings.themeId ?? 'orange-classic', settings.customPrimaryColor)
  const themeCSS = generateThemeCSS(theme, settings.customPrimaryColor)

  // Detect customer-facing routes via header set by middleware
  const headersList = await headers()
  const isCustomer = headersList.get('x-customer-route') === '1'

  if (isCustomer) {
    return (
      <html lang="th">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        </head>
        <body className="bg-gray-50">
          {children}
        </body>
      </html>
    )
  }

  return (
    <html lang="th">
      <head>
        <style id="happy-pos-theme" dangerouslySetInnerHTML={{ __html: themeCSS }} />
      </head>
      <body className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto pt-14 md:pt-0">
          {children}
        </main>
      </body>
    </html>
  )
}
