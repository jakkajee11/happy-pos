'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShoppingCart, LayoutDashboard, Package, BarChart3,
  Users, Settings, Tag, ChevronLeft, ChevronRight, Boxes, ChefHat, ClipboardList, Calculator,
  Menu, X
} from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

const navItems = [
  { href: '/pos',       icon: ShoppingCart,   label: 'ขาย (POS)',      color: 'text-orange-500' },
  { href: '/orders',    icon: ClipboardList,  label: 'ออเดอร์',        color: 'text-amber-500' },
  { href: '/',          icon: LayoutDashboard, label: 'แดชบอร์ด',       color: 'text-blue-500' },
  { href: '/products',  icon: Package,         label: 'สินค้า/เมนู',    color: 'text-green-500' },
  { href: '/inventory', icon: Boxes,           label: 'คลังสินค้า',     color: 'text-purple-500' },
  { href: '/kitchen',   icon: ChefHat,         label: 'ครัว (KDS)',      color: 'text-red-500' },
  { href: '/reports',   icon: BarChart3,       label: 'รายงาน',         color: 'text-pink-500' },
  { href: '/closing',   icon: Calculator,      label: 'ปิดยอด',         color: 'text-teal-500' },
  { href: '/members',   icon: Users,           label: 'สมาชิก',         color: 'text-cyan-500' },
  { href: '/promotions',icon: Tag,             label: 'โปรโมชั่น',      color: 'text-yellow-500' },
  { href: '/settings',  icon: Settings,        label: 'ตั้งค่า',        color: 'text-gray-500' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Hide sidebar completely on customer-facing pages (/m and /m?table=X)
  if (pathname === '/m' || pathname.startsWith('/m/') || pathname.startsWith('/m?')) return null

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3 shadow-sm">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1 -ml-1 text-gray-600"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
            HP
          </div>
          <span className="font-bold text-gray-800 text-sm">Happy POS</span>
        </div>
        <div className="w-8" /> {/* Spacer for centering */}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={clsx(
          'md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
              HP
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm leading-none">Happy POS</p>
              <p className="text-xs text-gray-400">v1.0</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Mobile nav */}
        <nav className="flex-1 py-3 space-y-1 px-2 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label, color }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150',
                  active
                    ? 'bg-orange-50 text-orange-600 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon size={20} className={clsx(active ? 'text-orange-500' : color, 'shrink-0')} />
                <span className="text-sm">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Mobile clock */}
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
          <SidebarClock />
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={clsx(
          'hidden md:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 shadow-sm relative',
          collapsed ? 'w-16' : 'w-56'
        )}
      >
        {/* Logo */}
        <div className={clsx(
          'flex items-center gap-2 px-4 py-4 border-b border-gray-100',
          collapsed && 'justify-center'
        )}>
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
            HP
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-gray-800 text-sm leading-none">Happy POS</p>
              <p className="text-xs text-gray-400">v1.0</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-1 px-2 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label, color }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative',
                  active
                    ? 'bg-orange-50 text-orange-600 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  collapsed && 'justify-center'
                )}
              >
                <Icon size={20} className={clsx(active ? 'text-orange-500' : color, 'shrink-0')} />
                {!collapsed && <span className="text-sm">{label}</span>}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    {label}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 z-10"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Clock */}
        <div className={clsx(
          'px-4 py-3 border-t border-gray-100 text-xs text-gray-400',
          collapsed && 'hidden'
        )}>
          <SidebarClock />
        </div>
      </aside>
    </>
  )
}

function SidebarClock() {
  const [time, setTime] = useState<Date | null>(null)
  useEffect(() => {
    setTime(new Date())
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  if (!time) return <div className="h-9" />
  return (
    <div>
      <div className="font-semibold text-gray-600 text-sm">
        {time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div>{time.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
    </div>
  )
}
