import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { db } from '@/lib/db'
import { getThemePreset, generateThemeCSS } from '@/lib/themes'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Happy POS',
  description: 'ระบบ POS สำหรับธุรกิจขนาดเล็ก-กลาง',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = db.getSettings()
  const theme = getThemePreset(settings.themeId ?? 'orange-classic', settings.customPrimaryColor)
  const themeCSS = generateThemeCSS(theme, settings.customPrimaryColor)

  return (
    <html lang="th">
      <head>
        <style id="happy-pos-theme" dangerouslySetInnerHTML={{ __html: themeCSS }} />
      </head>
      <body className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </body>
    </html>
  )
}
