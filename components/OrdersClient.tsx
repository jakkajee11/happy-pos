'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, RefreshCw, UtensilsCrossed, Clock } from 'lucide-react'
import clsx from 'clsx'
import { OpenOrder } from '@/lib/db'
import NotificationBell from './NotificationBell'

interface Props {
  initialOrders: OpenOrder[]
}

const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function TimeAgo({ createdAt }: { createdAt: string }) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    const update = () => {
      const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
      if (mins < 1) setLabel('เมื่อกี้')
      else if (mins < 60) setLabel(`${mins} นาทีที่แล้ว`)
      else setLabel(`${Math.floor(mins / 60)} ชม. ${mins % 60} นาที`)
    }
    update()
    const t = setInterval(update, 30000)
    return () => clearInterval(t)
  }, [createdAt])
  return <span>{label}</span>
}

export default function OrdersClient({ initialOrders }: Props) {
  const router = useRouter()
  const [orders, setOrders] = useState(initialOrders)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/orders?status=open')
    const data = await res.json()
    setOrders(data)
    setLoading(false)
  }, [])

  // Poll every 15 seconds for new orders created from POS
  useEffect(() => {
    const t = setInterval(refresh, 15000)
    return () => clearInterval(t)
  }, [refresh])

  const cancel = async (id: string, orderNo: string) => {
    if (!confirm(`ยกเลิกออเดอร์ ${orderNo}?`)) return
    await fetch(`/api/orders?id=${id}`, { method: 'DELETE' })
    setOrders(prev => prev.filter(o => o.id !== id))
  }

  const resumeInPOS = (order: OpenOrder) => {
    // Encode order as URL params to pass to POS
    const params = new URLSearchParams({ orderId: order.id })
    router.push(`/pos?${params}`)
  }

  const minutesSince = (dt: string) =>
    Math.floor((Date.now() - new Date(dt).getTime()) / 60000)

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">ออเดอร์ที่เปิดอยู่</h1>
          <p className="text-gray-500 text-xs sm:text-sm">{orders.length} โต๊ะ / ออเดอร์ที่รอชำระ</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <NotificationBell />
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-2 sm:px-3 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 flex-1 sm:flex-none justify-center"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>
          <button
            onClick={() => router.push('/pos')}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-orange-500 text-white rounded-xl font-medium text-xs sm:text-sm hover:bg-orange-600 flex-1 sm:flex-none justify-center"
          >
            + ออเดอร์ใหม่
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <UtensilsCrossed size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium text-lg">ไม่มีออเดอร์ที่เปิดอยู่</p>
          <p className="text-sm mt-1">กด "บันทึกออเดอร์" ในหน้า POS เพื่อพักออเดอร์ไว้</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map(order => {
            const mins = minutesSince(order.createdAt)
            const isOld = mins >= 30
            return (
              <div
                key={order.id}
                className={clsx(
                  'bg-white rounded-2xl shadow-sm border-2 transition-all hover:shadow-md',
                  isOld ? 'border-red-300' : 'border-gray-100 hover:border-orange-300'
                )}
              >
                {/* Card Header */}
                <div className={clsx(
                  'px-3 sm:px-4 pt-3 sm:pt-4 pb-3 border-b flex items-start justify-between gap-2',
                  isOld ? 'border-red-100' : 'border-gray-100'
                )}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {order.tableNo ? (
                        <span className="text-lg sm:text-xl font-black text-gray-800">โต๊ะ {order.tableNo}</span>
                      ) : (
                        <span className="text-xs sm:text-sm font-bold text-gray-600">Take Away</span>
                      )}
                      {isOld && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">นาน!</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{order.orderNo}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base sm:text-lg font-bold text-orange-600">฿{fmt(order.total)}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                      <Clock size={10} className="sm:w-3 sm:h-3" />
                      <TimeAgo createdAt={order.createdAt} />
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div className="px-3 sm:px-4 py-3 space-y-1 max-h-32 sm:max-h-40 overflow-y-auto">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs sm:text-sm gap-2">
                      <span className="text-gray-700 truncate flex-1">
                        <span className="text-gray-400 text-xs">{item.qty}×</span> {item.productName}
                        {item.note && <span className="text-xs text-orange-500 ml-1">({item.note})</span>}
                      </span>
                      <span className="text-gray-600 shrink-0">฿{fmt(item.total)}</span>
                    </div>
                  ))}
                  {order.discount > 0 && (
                    <div className="flex justify-between text-xs sm:text-sm text-green-600">
                      <span>ส่วนลด {order.discountNote && `(${order.discountNote})`}</span>
                      <span>-฿{fmt(order.discount)}</span>
                    </div>
                  )}
                  {order.memberName && (
                    <p className="text-xs text-blue-500 mt-1">👤 {order.memberName}</p>
                  )}
                  {order.note && (
                    <p className="text-xs text-orange-600 mt-1">📝 {order.note}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 flex gap-2">
                  <button
                    onClick={() => resumeInPOS(order)}
                    className="flex-1 py-2 sm:py-2.5 bg-orange-500 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-orange-600 transition-colors min-h-[36px] sm:min-h-[40px]"
                  >
                    เปิด / ชำระ
                  </button>
                  <button
                    onClick={() => cancel(order.id, order.orderNo)}
                    className="p-2 sm:p-2.5 border border-gray-200 text-gray-400 rounded-xl hover:border-red-300 hover:text-red-500 transition-colors min-h-[36px] sm:min-h-[40px] flex items-center justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
