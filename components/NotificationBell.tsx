'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, X, Receipt, UserRound, CheckCheck } from 'lucide-react'
import clsx from 'clsx'

interface Notification {
  id: string
  type: 'check-bill' | 'call-staff' | 'new-order'
  tableNo?: string
  orderId?: string
  message: string
  status: 'unread' | 'read'
  createdAt: string
}

const typeConfig = {
  'check-bill': { icon: Receipt, color: 'text-blue-600', bg: 'bg-blue-100', label: 'เช็คบิล' },
  'call-staff': { icon: UserRound, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'เรียกพนักงาน' },
  'new-order':  { icon: Bell, color: 'text-green-600', bg: 'bg-green-100', label: 'ออเดอร์ใหม่' },
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [shaking, setShaking] = useState(false)
  const prevUnreadRef = useRef(0)
  const audioRef = useRef<AudioContext | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => n.status === 'unread').length

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data: Notification[] = await res.json()
      setNotifications(data)

      // Play sound if there are new unread notifications
      const newUnread = data.filter(n => n.status === 'unread').length
      if (newUnread > prevUnreadRef.current) {
        playAlert()
        setShaking(true)
        setTimeout(() => setShaking(false), 1500)
      }
      prevUnreadRef.current = newUnread
    } catch { /* silently ignore */ }
  }, [])

  function playAlert() {
    try {
      const ctx = new AudioContext()
      // Three-tone notification: ding-ding-ding
      const notes = [880, 1100, 880]
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.frequency.value = freq
        o.type = 'sine'
        const start = ctx.currentTime + i * 0.2
        g.gain.setValueAtTime(0.4, start)
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.3)
        o.start(start)
        o.stop(start + 0.3)
      })
    } catch { /* ignore */ }
  }

  // Poll every 5 seconds
  useEffect(() => {
    fetchNotifications()
    const t = setInterval(fetchNotifications, 5000)
    return () => clearInterval(t)
  }, [fetchNotifications])

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })))
    prevUnreadRef.current = 0
  }

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' as const } : n))
  }

  const timeAgo = (dt: string) => {
    const mins = Math.floor((Date.now() - new Date(dt).getTime()) / 60000)
    if (mins < 1) return 'เมื่อกี้'
    if (mins < 60) return `${mins} นาทีที่แล้ว`
    return `${Math.floor(mins / 60)} ชม. ${mins % 60} นาที`
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'relative flex items-center gap-2 px-2 sm:px-3 py-2 border rounded-xl text-xs sm:text-sm transition-all',
          unreadCount > 0
            ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
            : 'border-gray-200 text-gray-600 hover:bg-gray-50',
          shaking && 'animate-bounce'
        )}
      >
        <Bell size={16} className={unreadCount > 0 ? 'text-red-500' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        <span className="hidden sm:inline">แจ้งเตือน</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden max-h-[70vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="font-bold text-gray-800">
              แจ้งเตือน {unreadCount > 0 && <span className="text-red-500 text-sm">({unreadCount} ใหม่)</span>}
            </span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <CheckCheck size={14} /> อ่านทั้งหมด
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">ไม่มีแจ้งเตือน</p>
              </div>
            ) : (
              notifications.slice(0, 30).map(n => {
                const cfg = typeConfig[n.type] || typeConfig['new-order']
                const Icon = cfg.icon
                return (
                  <div
                    key={n.id}
                    onClick={() => n.status === 'unread' && markRead(n.id)}
                    className={clsx(
                      'flex items-start gap-3 px-4 py-3 border-b border-gray-50 transition-colors cursor-pointer',
                      n.status === 'unread' ? 'bg-orange-50/50 hover:bg-orange-50' : 'hover:bg-gray-50'
                    )}
                  >
                    <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center shrink-0', cfg.bg)}>
                      <Icon size={18} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={clsx('text-sm font-medium', n.status === 'unread' ? 'text-gray-900' : 'text-gray-600')}>
                          {n.message}
                        </span>
                        {n.status === 'unread' && (
                          <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-medium', cfg.bg, cfg.color)}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
