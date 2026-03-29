'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { TrendingUp, ShoppingBag, Users, AlertTriangle, CreditCard, QrCode, Banknote, ArrowRight, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Sale, Product } from '@/lib/db'

interface Props {
  stats: {
    todayRevenue: number
    monthRevenue: number
    todayOrders: number
    avgOrder: number
    totalMembers: number
    lowStockCount: number
  }
  dailyData: { date: string; revenue: number; orders: number }[]
  topProducts: { name: string; qty: number; revenue: number }[]
  paymentBreakdown: Record<string, number>
  recentSales: Sale[]
  lowStockItems: Product[]
  openOrdersCount: number
}

const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function DashboardClient({ stats, dailyData, topProducts, paymentBreakdown, recentSales, lowStockItems, openOrdersCount: initialOpenOrders }: Props) {
  const paymentLabels: Record<string, string> = { cash: 'เงินสด', qr: 'QR/โอน', card: 'บัตร', other: 'อื่นๆ' }
  const paymentIcons: Record<string, React.ReactNode> = {
    cash: <Banknote size={16} />, qr: <QrCode size={16} />, card: <CreditCard size={16} />, other: <ShoppingBag size={16} />
  }

  const [liveOpenOrders, setLiveOpenOrders] = useState(initialOpenOrders)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/orders?status=open')
        if (res.ok) {
          const data = await res.json()
          setLiveOpenOrders(data.length)
        }
      } catch { /* ignore */ }
    }
    const timer = setInterval(poll, 15000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm" suppressHydrationWarning>
            {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link href="/pos" className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-xl font-semibold transition-colors text-sm sm:text-base">
          <ShoppingBag size={18} />
          <span className="hidden sm:inline">เปิดหน้าขาย</span>
          <span className="sm:hidden">ขาย</span>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          title="ยอดขายวันนี้"
          value={`฿${fmt(stats.todayRevenue)}`}
          sub={`${stats.todayOrders} ออเดอร์`}
          icon={<TrendingUp size={20} />}
          color="bg-orange-50 text-orange-600"
        />
        <StatCard
          title="ยอดขายเดือนนี้"
          value={`฿${fmt(stats.monthRevenue)}`}
          sub="รวมทั้งเดือน"
          icon={<TrendingUp size={20} />}
          color="bg-blue-50 text-blue-600"
        />
        <Link href="/orders" className="block">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-amber-300 transition-colors h-full">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-xs mb-1">ออเดอร์ค้างโต๊ะ</p>
                <p className="text-xl font-bold text-gray-800">{liveOpenOrders}</p>
                <p className="text-xs mt-1">
                  {liveOpenOrders > 0
                    ? <span className="text-amber-500 font-medium">● รอชำระเงิน</span>
                    : <span className="text-green-500">✓ ไม่มีค้าง</span>
                  }
                </p>
              </div>
              <div className={`relative p-2 rounded-xl ${liveOpenOrders > 0 ? 'bg-amber-50 text-amber-500' : 'bg-green-50 text-green-500'}`}>
                <ClipboardList size={20} />
                {liveOpenOrders > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {liveOpenOrders > 9 ? '9+' : liveOpenOrders}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
        <StatCard
          title="สมาชิกทั้งหมด"
          value={stats.totalMembers.toLocaleString()}
          sub={stats.lowStockCount > 0 ? `⚠️ สินค้าใกล้หมด ${stats.lowStockCount} รายการ` : 'สต็อกปกติ'}
          icon={<Users size={20} />}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-3 sm:p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3 sm:mb-4 text-sm sm:text-base">ยอดขาย 7 วันที่ผ่านมา</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `฿${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
              <Tooltip formatter={(v: number) => [`฿${fmt(v)}`, 'ยอดขาย']} />
              <Bar dataKey="revenue" fill="#f59000" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-white rounded-2xl p-3 sm:p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3 sm:mb-4 text-sm sm:text-base">การชำระเงินวันนี้</h2>
          {Object.keys(paymentBreakdown).length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">ยังไม่มีรายการ</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(paymentBreakdown).map(([method, amount]) => (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    {paymentIcons[method]}
                    {paymentLabels[method] || method}
                  </div>
                  <span className="font-semibold text-gray-800">฿{fmt(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-3 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">รายการล่าสุด</h2>
            <Link href="/reports" className="text-orange-500 text-sm flex items-center gap-1 hover:underline">
              ดูทั้งหมด <ArrowRight size={14} />
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <div className="text-center text-gray-400 py-8">ยังไม่มีรายการขาย</div>
          ) : (
            <div className="space-y-2">
              {recentSales.map(sale => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">#{sale.receiptNo}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(sale.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}{sale.items.length} รายการ
                      {sale.memberName && ` · ${sale.memberName}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">฿{fmt(sale.total)}</p>
                    <p className="text-xs text-gray-400">{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products + Low Stock */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-3">สินค้าขายดีเดือนนี้</h2>
            {topProducts.length === 0 ? (
              <div className="text-center text-gray-400 py-4 text-sm">ยังไม่มีข้อมูล</div>
            ) : (
              <div className="space-y-2">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.qty} ชิ้น</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-600">฿{fmt(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {lowStockItems.length > 0 && (
            <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-red-500" />
                <h3 className="text-sm font-semibold text-red-700">สินค้าใกล้หมด</h3>
              </div>
              {lowStockItems.map(p => (
                <div key={p.id} className="flex justify-between text-sm py-1">
                  <span className="text-red-700 truncate">{p.name}</span>
                  <span className="font-bold text-red-600">{p.stock} ชิ้น</span>
                </div>
              ))}
              <Link href="/inventory" className="text-xs text-red-500 hover:underline mt-1 block">
                จัดการสต็อก →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, sub, icon, color }: {
  title: string; value: string; sub: string; icon: React.ReactNode; color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-gray-500 text-[10px] sm:text-xs mb-1 truncate">{title}</p>
          <p className="text-lg sm:text-xl font-bold text-gray-800 truncate">{value}</p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate">{sub}</p>
        </div>
        <div className={`p-2 rounded-xl ${color}`}>{icon}</div>
      </div>
    </div>
  )
}
