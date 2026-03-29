'use client'
import { useState, useRef } from 'react'
import { Sale } from '@/lib/db'

interface Props {
  sales: Sale[]
  shopName: string
  shopAddress: string
  date: string  // YYYY-MM-DD
}

const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtInt = (n: number) => n.toLocaleString('th-TH')

export default function ClosingClient({ sales, shopName, shopAddress, date }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const [printing, setPrinting] = useState(false)

  // ── Aggregates ──────────────────────────────────────────────
  const totalRevenue = sales.reduce((s, x) => s + x.total, 0)
  const totalDiscount = sales.reduce((s, x) => s + (x.discount || 0), 0)
  const totalSubtotal = sales.reduce((s, x) => s + x.subtotal, 0)
  const txCount = sales.length

  // Payment breakdown
  const byMethod = {
    cash: sales.filter(s => s.paymentMethod === 'cash'),
    qr:   sales.filter(s => s.paymentMethod === 'qr'),
    card: sales.filter(s => s.paymentMethod === 'card'),
    other:sales.filter(s => s.paymentMethod === 'other'),
  }
  const cashIn   = byMethod.cash.reduce((s, x) => s + (x.cashReceived || 0), 0)
  const cashOut  = byMethod.cash.reduce((s, x) => s + (x.change || 0), 0)
  const cashNet  = cashIn - cashOut

  // Hourly breakdown
  const hourly: Record<number, number> = {}
  sales.forEach(s => {
    const h = new Date(s.createdAt).getHours()
    hourly[h] = (hourly[h] || 0) + s.total
  })
  const maxHourly = Math.max(...Object.values(hourly), 1)

  // Top products
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {}
  sales.forEach(s => s.items.forEach(item => {
    if (!productMap[item.productId]) productMap[item.productId] = { name: item.productName, qty: 0, revenue: 0 }
    productMap[item.productId].qty += item.qty
    productMap[item.productId].revenue += item.total
  }))
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10)

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('th-TH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Print ────────────────────────────────────────────────────
  const handlePrint = () => {
    setPrinting(true)
    const rows = topProducts.map(p =>
      `<tr><td>${p.name}</td><td style="text-align:right">${fmtInt(p.qty)}</td><td style="text-align:right">฿${fmt(p.revenue)}</td></tr>`
    ).join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: monospace; font-size: 12px; width: 72mm; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .big { font-size: 16px; font-weight: bold; }
  .divider { border-top: 1px dashed #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  td { padding: 2px 0; }
  .section-title { font-weight: bold; margin: 4px 0 2px; font-size: 11px; }
  .total-box { border: 1px solid #000; padding: 4px; margin: 4px 0; }
</style>
</head><body>
<div class="center bold">${shopName}</div>
<div class="center" style="font-size:10px">${shopAddress}</div>
<div class="center" style="font-size:10px">${displayDate}</div>
<div class="divider"></div>

<div class="section-title">สรุปยอดขาย</div>
<div class="row"><span>ยอดขายรวม (ก่อนส่วนลด)</span><span>฿${fmt(totalSubtotal)}</span></div>
<div class="row"><span>ส่วนลดรวม</span><span>-฿${fmt(totalDiscount)}</span></div>
<div class="total-box">
  <div class="row big"><span>ยอดสุทธิ</span><span>฿${fmt(totalRevenue)}</span></div>
</div>
<div class="row"><span>จำนวนบิล</span><span>${fmtInt(txCount)} บิล</span></div>
<div class="row"><span>เฉลี่ย/บิล</span><span>฿${txCount > 0 ? fmt(totalRevenue / txCount) : '0.00'}</span></div>

<div class="divider"></div>
<div class="section-title">แยกตามวิธีชำระ</div>
<div class="row"><span>💵 เงินสด (${byMethod.cash.length} บิล)</span><span>฿${fmt(byMethod.cash.reduce((s,x)=>s+x.total,0))}</span></div>
<div class="row"><span>📱 QR/โอน (${byMethod.qr.length} บิล)</span><span>฿${fmt(byMethod.qr.reduce((s,x)=>s+x.total,0))}</span></div>
<div class="row"><span>💳 บัตร (${byMethod.card.length} บิล)</span><span>฿${fmt(byMethod.card.reduce((s,x)=>s+x.total,0))}</span></div>
<div class="row"><span>📋 อื่นๆ (${byMethod.other.length} บิล)</span><span>฿${fmt(byMethod.other.reduce((s,x)=>s+x.total,0))}</span></div>
<div class="divider"></div>
<div class="section-title">เงินสดในลิ้นชัก</div>
<div class="row"><span>รับมา</span><span>฿${fmt(cashIn)}</span></div>
<div class="row"><span>ทอน</span><span>-฿${fmt(cashOut)}</span></div>
<div class="row bold"><span>คงเหลือ</span><span>฿${fmt(cashNet)}</span></div>

${topProducts.length > 0 ? `
<div class="divider"></div>
<div class="section-title">สินค้าขายดี</div>
<table><tbody>${rows}</tbody></table>` : ''}

<div class="divider"></div>
<div class="center" style="margin-top:4px;font-size:10px">*** ปิดยอดประจำวัน ***</div>
<script>window.onload=()=>{window.onafterprint=()=>window.close();setTimeout(()=>window.print(),300)}<\/script>
</body></html>`

    const w = window.open('', '_blank', 'width=360,height=600')
    if (w) { w.document.write(html); w.document.close() }
    setTimeout(() => setPrinting(false), 1000)
  }

  // ── UI ───────────────────────────────────────────────────────
  const METHODS = [
    { key: 'cash', label: 'เงินสด',  emoji: '💵', color: 'bg-green-50 border-green-200 text-green-700' },
    { key: 'qr',   label: 'QR/โอน', emoji: '📱', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { key: 'card', label: 'บัตร',   emoji: '💳', color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { key: 'other',label: 'อื่นๆ',  emoji: '📋', color: 'bg-gray-50 border-gray-200 text-gray-700' },
  ] as const

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-4xl mx-auto" ref={printRef}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">ปิดยอดประจำวัน</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">{displayDate}</p>
        </div>
        <button
          onClick={handlePrint}
          disabled={printing || sales.length === 0}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-xs sm:text-sm w-full sm:w-auto justify-center"
        >
          🖨️ {printing ? 'กำลังพิมพ์...' : 'พิมพ์สรุปยอด'}
        </button>
      </div>

      {sales.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">📭</p>
          <p className="font-medium">ยังไม่มียอดขายวันนี้</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 sm:p-5">
              <p className="text-[10px] sm:text-xs text-orange-600 font-medium mb-1">ยอดสุทธิ</p>
              <p className="text-lg sm:text-xl font-bold text-orange-700">฿{fmt(totalRevenue)}</p>
              {totalDiscount > 0 && <p className="text-[10px] sm:text-xs text-orange-500 mt-1">ลด ฿{fmt(totalDiscount)}</p>}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 sm:p-5">
              <p className="text-[10px] sm:text-xs text-blue-600 font-medium mb-1">จำนวนบิล</p>
              <p className="text-lg sm:text-xl font-bold text-blue-700">{fmtInt(txCount)}</p>
              <p className="text-[10px] sm:text-xs text-blue-500 mt-1">เฉลี่ย ฿{txCount > 0 ? fmt(totalRevenue / txCount) : '0'}/บิล</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3 sm:p-5">
              <p className="text-[10px] sm:text-xs text-green-600 font-medium mb-1">เงินสดในลิ้นชัก</p>
              <p className="text-lg sm:text-xl font-bold text-green-700">฿{fmt(cashNet)}</p>
              <p className="text-[10px] sm:text-xs text-green-500 mt-1">รับ {fmt(cashIn)} / ทอน {fmt(cashOut)}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 sm:p-5">
              <p className="text-[10px] sm:text-xs text-purple-600 font-medium mb-1">รายการสินค้า</p>
              <p className="text-lg sm:text-xl font-bold text-purple-700">{fmtInt(topProducts.length)}</p>
              <p className="text-[10px] sm:text-xs text-purple-500 mt-1">ประเภทที่ขายได้</p>
            </div>
          </div>

          {/* Payment breakdown + Hourly chart side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Payment method */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
              <h2 className="font-bold text-gray-800 mb-4 text-sm sm:text-base">แยกตามวิธีชำระ</h2>
              <div className="space-y-3">
                {METHODS.map(m => {
                  const group = byMethod[m.key as keyof typeof byMethod]
                  const total = group.reduce((s, x) => s + x.total, 0)
                  const pct = totalRevenue > 0 ? (total / totalRevenue) * 100 : 0
                  return (
                    <div key={m.key}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-1.5">
                          <span>{m.emoji}</span>
                          <span className="font-medium text-gray-700">{m.label}</span>
                          <span className="text-gray-400 text-xs">({group.length} บิล)</span>
                        </span>
                        <span className="font-semibold text-gray-800">฿{fmt(total)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-orange-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Hourly chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
              <h2 className="font-bold text-gray-800 mb-4 text-sm sm:text-base">ยอดรายชั่วโมง</h2>
              <div className="flex items-end gap-1 h-32">
                {Array.from({ length: 24 }, (_, h) => {
                  const val = hourly[h] || 0
                  const pct = maxHourly > 0 ? (val / maxHourly) * 100 : 0
                  return (
                    <div key={h} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="w-full bg-orange-400 rounded-t transition-all" style={{ height: `${pct}%`, minHeight: val > 0 ? 4 : 0 }} />
                      {val > 0 && (
                        <div className="absolute bottom-full mb-1 bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                          {h}:00 — ฿{fmt(val)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
              </div>
            </div>
          </div>

          {/* Top Products */}
          {topProducts.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5 mb-4 sm:mb-6">
              <h2 className="font-bold text-gray-800 mb-4 text-sm sm:text-base">สินค้าที่ขายได้วันนี้</h2>
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <div className="px-3 sm:px-0">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left pb-2">#</th>
                    <th className="text-left pb-2">สินค้า</th>
                    <th className="text-right pb-2">จำนวน</th>
                    <th className="text-right pb-2">ยอดขาย</th>
                    <th className="text-right pb-2">สัดส่วน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topProducts.map((p, i) => (
                    <tr key={p.name}>
                      <td className="py-2.5 text-gray-400 font-medium">{i + 1}</td>
                      <td className="py-2.5 font-medium text-gray-800">{p.name}</td>
                      <td className="py-2.5 text-right text-gray-600">{fmtInt(p.qty)}</td>
                      <td className="py-2.5 text-right font-semibold text-gray-800">฿{fmt(p.revenue)}</td>
                      <td className="py-2.5 text-right">
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                          {totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(1) : 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200">
                  <tr>
                    <td colSpan={2} className="pt-2.5 text-sm font-semibold text-gray-700">รวม</td>
                    <td className="pt-2.5 text-right font-semibold">{fmtInt(topProducts.reduce((s,p)=>s+p.qty,0))}</td>
                    <td className="pt-2.5 text-right font-bold text-orange-600">฿{fmt(totalRevenue)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
                </div>
              </div>
            </div>
          )}

          {/* Recent transactions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
            <h2 className="font-bold text-gray-800 mb-4 text-sm sm:text-base">บิลทั้งหมดวันนี้ ({txCount} บิล)</h2>
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <div className="px-3 sm:px-0">
              <div className="overflow-y-auto max-h-64">
              <table className="w-full text-xs sm:text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left pb-2">บิล</th>
                    <th className="text-left pb-2 hidden sm:table-cell">เวลา</th>
                    <th className="text-left pb-2 hidden md:table-cell">โต๊ะ</th>
                    <th className="text-left pb-2">ชำระ</th>
                    <th className="text-right pb-2">ยอด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...sales].reverse().map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="py-2 font-mono text-xs text-gray-600">{s.receiptNo}</td>
                      <td className="py-2 text-xs text-gray-500 hidden sm:table-cell">
                        {new Date(s.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 text-xs text-gray-500 hidden md:table-cell">{s.tableNo || '-'}</td>
                      <td className="py-2">
                        <span className="text-xs">
                          {s.paymentMethod === 'cash' ? '💵' : s.paymentMethod === 'qr' ? '📱' : s.paymentMethod === 'card' ? '💳' : '📋'}
                        </span>
                      </td>
                      <td className="py-2 text-right font-semibold text-gray-800">฿{fmt(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
