'use client'
import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'
import { Sale, Product } from '@/lib/db'
import { FileDown, TrendingUp, ShoppingBag, DollarSign, Users } from 'lucide-react'
import clsx from 'clsx'

interface Props { allSales: Sale[]; products: Product[] }

const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const COLORS = ['#f59000', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899']

export default function ReportsClient({ allSales, products }: Props) {
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'year'>('month')
  const [tab, setTab] = useState<'summary' | 'sales' | 'products'>('summary')

  const now = new Date()
  const rangeFilter = (s: Sale) => {
    const d = new Date(s.createdAt)
    if (range === 'today') return d.toDateString() === now.toDateString()
    if (range === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
      return d >= weekAgo
    }
    if (range === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    if (range === 'year') return d.getFullYear() === now.getFullYear()
    return true
  }

  const sales = allSales.filter(s => s.status === 'completed' && rangeFilter(s))
  const revenue = sales.reduce((s, r) => s + r.total, 0)
  const orders = sales.length
  const avgOrder = orders > 0 ? revenue / orders : 0
  const totalDiscount = sales.reduce((s, r) => s + r.discount, 0)
  const totalCost = sales.reduce((s, r) => s + r.items.reduce((a, i) => a + (i.cost * i.qty), 0), 0)
  const profit = revenue - totalCost

  // Daily data
  const days = range === 'today' ? 1 : range === 'week' ? 7 : range === 'month' ? 30 : 12
  const dailyData = range === 'year'
    ? Array.from({ length: 12 }, (_, i) => {
        const monthSales = sales.filter(s => new Date(s.createdAt).getMonth() === i)
        return {
          date: new Date(now.getFullYear(), i, 1).toLocaleDateString('th-TH', { month: 'short' }),
          revenue: monthSales.reduce((s, r) => s + r.total, 0),
          orders: monthSales.length,
        }
      })
    : Array.from({ length: days }, (_, i) => {
        const d = new Date(now)
        d.setDate(now.getDate() - (days - 1 - i))
        const dStr = d.toISOString().slice(0, 10)
        const daySales = sales.filter(s => s.createdAt.startsWith(dStr))
        return {
          date: d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
          revenue: daySales.reduce((s, r) => s + r.total, 0),
          orders: daySales.length,
        }
      })

  // Product breakdown
  const productMap: Record<string, { name: string; qty: number; revenue: number; cost: number }> = {}
  for (const s of sales) {
    for (const item of s.items) {
      if (!productMap[item.productId]) productMap[item.productId] = { name: item.productName, qty: 0, revenue: 0, cost: 0 }
      productMap[item.productId].qty += item.qty
      productMap[item.productId].revenue += item.total
      productMap[item.productId].cost += item.cost * item.qty
    }
  }
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue)

  // Payment breakdown
  const paymentData = Object.entries(
    sales.reduce((acc, s) => { acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.total; return acc }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name: { cash: 'เงินสด', qr: 'QR/โอน', card: 'บัตร', other: 'อื่นๆ' }[name] || name, value
  }))

  const exportCsv = () => {
    const rows = [['ใบเสร็จ', 'วันที่', 'รายการ', 'ยอดรวม', 'ส่วนลด', 'สุทธิ', 'การชำระ', 'สมาชิก']]
    for (const s of sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())) {
      rows.push([s.receiptNo, new Date(s.createdAt).toLocaleString('th-TH'), s.items.map(i => `${i.productName}x${i.qty}`).join('; '), String(s.subtotal), String(s.discount), String(s.total), s.paymentMethod, s.memberName || ''])
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `sales_report_${now.toISOString().slice(0, 10)}.csv`; a.click()
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">รายงาน</h1>
          <p className="text-gray-500 text-sm">วิเคราะห์ยอดขายและประสิทธิภาพ</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['today', 'week', 'month', 'year'] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={clsx('px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors',
                range === r ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {{ today: 'วันนี้', week: '7 วัน', month: 'เดือนนี้', year: 'ปีนี้' }[r]}
            </button>
          ))}
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 rounded-full text-xs sm:text-sm text-gray-600 hover:bg-gray-50">
            <FileDown size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
        {[
          { label: 'รายได้รวม', value: `฿${fmt(revenue)}`, icon: TrendingUp, color: 'bg-orange-50 text-orange-600', sub: `${orders} ออเดอร์` },
          { label: 'กำไรสุทธิ', value: `฿${fmt(profit)}`, icon: DollarSign, color: 'bg-green-50 text-green-600', sub: `${revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0}% margin` },
          { label: 'ค่าเฉลี่ย/ออเดอร์', value: `฿${fmt(avgOrder)}`, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600', sub: `ส่วนลด ฿${fmt(totalDiscount)}` },
          { label: 'ออเดอร์ทั้งหมด', value: orders.toLocaleString(), icon: Users, color: 'bg-purple-50 text-purple-600', sub: 'ออเดอร์ที่สำเร็จ' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-[10px] sm:text-xs mb-1">{c.label}</p>
                <p className="text-lg sm:text-xl font-bold text-gray-800">{c.value}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{c.sub}</p>
              </div>
              <div className={`p-2 rounded-xl ${c.color}`}><c.icon size={18} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {[{ id: 'summary', label: 'ภาพรวม' }, { id: 'sales', label: 'รายการขาย' }, { id: 'products', label: 'สินค้า' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === t.id ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl p-3 sm:p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-4">ยอดขายตามช่วงเวลา</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `฿${(v / 1000).toFixed(0)}k` : `฿${v}`} />
                <Tooltip formatter={(v: number) => [`฿${fmt(v)}`, 'ยอดขาย']} />
                <Bar dataKey="revenue" fill="#f59000" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl p-3 sm:p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-4">สัดส่วนการชำระ</h2>
            {paymentData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">ไม่มีข้อมูล</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `฿${fmt(v)}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {tab === 'sales' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                <th className="text-left px-4 py-3">ใบเสร็จ</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">วันที่</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">รายการ</th>
                <th className="text-right px-4 py-3">ยอดรวม</th>
                <th className="text-center px-4 py-3 hidden md:table-cell">การชำระ</th>
                <th className="text-center px-4 py-3 hidden lg:table-cell">สมาชิก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sales.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">ไม่มีรายการขาย</td></tr>
              ) : [...sales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">#{s.receiptNo}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-xs">
                    {new Date(s.createdAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell text-xs truncate max-w-48">
                    {s.items.map(i => `${i.productName} x${i.qty}`).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">฿{fmt(s.total)}</td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                      {{ cash: 'เงินสด', qr: 'QR', card: 'บัตร', other: 'อื่นๆ' }[s.paymentMethod] || s.paymentMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500 hidden lg:table-cell">{s.memberName || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">สินค้า</th>
                <th className="text-center px-4 py-3">จำนวน</th>
                <th className="text-right px-4 py-3">รายได้</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">กำไร</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topProducts.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">ไม่มีข้อมูล</td></tr>
              ) : topProducts.map((p, i) => (
                <tr key={p.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full text-xs flex items-center justify-center font-bold">{i + 1}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{p.qty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">฿{fmt(p.revenue)}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium hidden md:table-cell">฿{fmt(p.revenue - p.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
