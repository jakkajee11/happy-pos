'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, Printer, CheckCircle, ChefHat, Clock, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import { KitchenOrder, Station, Printer as PrinterType } from '@/lib/db'

interface Props {
  station: Station
  printer: PrinterType | null
  initialOrders: KitchenOrder[]
}

const STATUS_LABELS: Record<KitchenOrder['status'], string> = {
  pending: 'รอทำ',
  preparing: 'กำลังทำ',
  ready: 'พร้อมเสิร์ฟ',
  done: 'เสร็จแล้ว',
}

const STATUS_COLORS: Record<KitchenOrder['status'], string> = {
  pending: 'bg-red-100 text-red-700 border-red-200',
  preparing: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  ready: 'bg-green-100 text-green-700 border-green-200',
  done: 'bg-gray-100 text-gray-500 border-gray-200',
}

const STATUS_CARD: Record<KitchenOrder['status'], string> = {
  pending: 'border-red-300 bg-white',
  preparing: 'border-yellow-300 bg-yellow-50',
  ready: 'border-green-400 bg-green-50',
  done: 'border-gray-200 bg-gray-50 opacity-60',
}

function elapsedMin(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000)
}

function printKOT(order: KitchenOrder, stationColor: string) {
  const lines = order.items.map(i => `${i.qty}x  ${i.productName}${i.note ? '\n     หมายเหตุ: ' + i.note : ''}`).join('\n')
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: monospace; font-size: 13px; padding: 8px; width: 80mm; }
  .header { border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 6px; text-align: center; }
  .station { font-size: 18px; font-weight: bold; background: #000; color: #fff; padding: 4px 0; text-align: center; margin-bottom: 4px; letter-spacing: 2px; }
  .meta { font-size: 11px; text-align: center; }
  .items { margin: 8px 0; }
  .item { font-size: 14px; font-weight: bold; padding: 3px 0; border-bottom: 1px dotted #999; }
  .note-line { font-size: 11px; padding-left: 12px; color: #555; }
  .footer { text-align: center; font-size: 10px; color: #888; margin-top: 6px; }
</style>
</head><body>
<div class="station">${order.stationName.toUpperCase()}</div>
<div class="header">
  <div class="meta">ออเดอร์ #${order.receiptNo}</div>
  ${order.tableNo ? `<div class="meta" style="font-size:16px;font-weight:bold;">โต๊ะ ${order.tableNo}</div>` : ''}
  <div class="meta">${new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
</div>
<div class="items">
${order.items.map(i => `<div class="item">${String(i.qty).padStart(2)} x  ${i.productName}</div>${i.note ? `<div class="note-line">⚠ ${i.note}</div>` : ''}`).join('')}
</div>
<div class="footer">--- KOT ---</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}<\/script>
</body></html>`

  const w = window.open('', '_blank', 'width=320,height=500')
  if (w) { w.document.write(html); w.document.close() }
}

export default function KitchenDisplay({ station, printer, initialOrders }: Props) {
  const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders)
  // null on server — set on client mount to avoid hydration mismatch
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isPolling, setIsPolling] = useState(true)
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const prevOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map(o => o.id)))
  const audioRef = useRef<AudioContext | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/kitchen?stationId=${station.id}&status=pending,preparing,ready`)
      if (!res.ok) return
      const data: KitchenOrder[] = await res.json()
      const newIds = new Set(data.map(o => o.id))

      // Detect brand new orders
      const brandNew = data.filter(o => !prevOrderIdsRef.current.has(o.id))
      if (brandNew.length > 0) {
        setNewOrderIds(prev => new Set([...Array.from(prev), ...brandNew.map(o => o.id)]))
        playAlert()
        setTimeout(() => {
          setNewOrderIds(prev => {
            const n = new Set(prev)
            brandNew.forEach(o => n.delete(o.id))
            return n
          })
        }, 3000)
      }

      prevOrderIdsRef.current = newIds
      setOrders(data)
      setLastUpdate(new Date())
    } catch {
      // silently ignore fetch errors
    }
  }, [station.id])

  function playAlert() {
    try {
      const ctx = new AudioContext()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = 880
      g.gain.setValueAtTime(0.3, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      o.start(); o.stop(ctx.currentTime + 0.4)
    } catch { /* ignore */ }
  }

  // Set initial lastUpdate on client only (avoids server/client hydration mismatch)
  useEffect(() => { setLastUpdate(new Date()) }, [])

  useEffect(() => {
    if (!isPolling) return
    const interval = setInterval(fetchOrders, 3000)
    return () => clearInterval(interval)
  }, [fetchOrders, isPolling])

  const updateStatus = async (orderId: string, status: KitchenOrder['status']) => {
    try {
      await fetch('/api/kitchen', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status }),
      })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o))
      if (status === 'done') {
        setTimeout(() => setOrders(prev => prev.filter(o => o.id !== orderId)), 1500)
      }
    } catch { alert('เกิดข้อผิดพลาด') }
  }

  const clearDone = async () => {
    await fetch(`/api/kitchen?stationId=${station.id}`, { method: 'DELETE' })
    setOrders(prev => prev.filter(o => o.status !== 'done'))
  }

  const activeOrders = orders.filter(o => o.status !== 'done')
  const pendingCount = orders.filter(o => o.status === 'pending').length
  const preparingCount = orders.filter(o => o.status === 'preparing').length
  const readyCount = orders.filter(o => o.status === 'ready').length

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700"
        style={{ borderBottomColor: station.color + '55' }}>
        <div className="flex items-center gap-3">
          <Link href="/kitchen" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white"
            style={{ backgroundColor: station.color }}
          >
            {station.name[0]}
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">{station.name}</h1>
            <p className="text-xs text-gray-400">
              {pendingCount > 0 && <span className="text-red-400 font-medium">{pendingCount} รอ </span>}
              {preparingCount > 0 && <span className="text-yellow-400 font-medium">{preparingCount} กำลังทำ </span>}
              {readyCount > 0 && <span className="text-green-400 font-medium">{readyCount} พร้อม</span>}
              {activeOrders.length === 0 && <span className="text-gray-500">ไม่มีออเดอร์</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {printer && (
            <span className="text-xs text-gray-400 hidden sm:block">
              🖨️ {printer.name}
            </span>
          )}
          <button
            onClick={() => setIsPolling(p => !p)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              isPolling ? 'bg-green-800 text-green-300 hover:bg-green-700' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            )}
          >
            <RefreshCw size={12} className={isPolling ? 'animate-spin' : ''} />
            {isPolling ? 'Live' : 'Paused'}
          </button>
          <span className="text-xs text-gray-500" suppressHydrationWarning>
            {lastUpdate?.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) ?? '—'}
          </span>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto">
        {activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-600">
            <ChefHat size={48} className="mb-3 opacity-30" />
            <p className="text-lg">ไม่มีออเดอร์ค้างอยู่</p>
            <p className="text-sm opacity-60 mt-1">
              {isPolling ? 'กำลังรออเดอร์ใหม่...' : 'กด Live เพื่อเปิดรับออเดอร์'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {activeOrders.map(order => {
              const elapsed = elapsedMin(order.createdAt)
              const isNew = newOrderIds.has(order.id)
              return (
                <div
                  key={order.id}
                  className={clsx(
                    'rounded-2xl border-2 p-3 sm:p-4 flex flex-col gap-3 transition-all duration-300',
                    STATUS_CARD[order.status],
                    isNew && 'ring-4 ring-red-400 animate-pulse'
                  )}
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {order.tableNo && (
                        <div className="text-xl sm:text-2xl font-black text-gray-800 leading-none">
                          โต๊ะ {order.tableNo}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 font-mono mt-0.5">{order.receiptNo}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium border', STATUS_COLORS[order.status])}>
                        {STATUS_LABELS[order.status]}
                      </span>
                      <span className={clsx('text-xs flex items-center gap-0.5', elapsed >= 10 ? 'text-red-500 font-bold' : 'text-gray-400')}>
                        <Clock size={10} />
                        {elapsed} นาที
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-1.5">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-sm sm:text-lg font-black text-gray-800 min-w-[24px] sm:min-w-[28px] text-right leading-tight">
                          {item.qty}×
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm font-semibold text-gray-800 block">{item.productName}</span>
                          {item.note && (
                            <p className="text-xs text-orange-600 font-medium mt-0.5">⚠ {item.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1.5 sm:gap-2 mt-auto pt-2 border-t border-gray-200">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(order.id, 'preparing')}
                        className="flex-1 py-2 sm:py-2.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-xl text-xs sm:text-sm font-bold transition-colors"
                      >
                        เริ่มทำ
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        onClick={() => updateStatus(order.id, 'ready')}
                        className="flex-1 py-2 sm:py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors"
                      >
                        พร้อมเสิร์ฟ ✓
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button
                        onClick={() => updateStatus(order.id, 'done')}
                        className="flex-1 py-2 sm:py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle size={13} className="sm:w-4 sm:h-4" /> เสร็จ
                      </button>
                    )}
                    <button
                      onClick={() => printKOT(order, station.color)}
                      className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl transition-colors"
                      title="พิมพ์ KOT"
                    >
                      <Printer size={14} className="sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-800 flex items-center justify-between">
        <span className="text-xs text-gray-600">
          รีเฟรชทุก 3 วินาที · {orders.filter(o => o.status === 'done').length} ออเดอร์เสร็จแล้ว
        </span>
        <button
          onClick={clearDone}
          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} /> ล้างรายการที่เสร็จแล้ว
        </button>
      </div>
    </div>
  )
}
