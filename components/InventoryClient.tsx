'use client'
import { useState } from 'react'
import { Search, Plus, Minus, RefreshCw, AlertTriangle, Boxes, History } from 'lucide-react'
import clsx from 'clsx'
import { Product, Category, StockLog } from '@/lib/db'

interface Props {
  initialProducts: Product[]
  categories: Category[]
  recentLogs: StockLog[]
  lowStockAlert: number
}

export default function InventoryClient({ initialProducts, categories, recentLogs, lowStockAlert }: Props) {
  const [products, setProducts] = useState(initialProducts)
  const [logs, setLogs] = useState(recentLogs)
  const [search, setSearch] = useState('')
  const [showAdjust, setShowAdjust] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'adjust'>('in')
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'stock' | 'log'>('stock')

  const tracked = products.filter(p => p.trackStock)
  const filtered = tracked.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search))
  const lowStock = tracked.filter(p => p.stock <= lowStockAlert)

  const openAdjust = (p: Product, type: 'in' | 'out' | 'adjust') => {
    setSelected(p); setAdjustType(type); setQty(''); setNote(''); setShowAdjust(true)
  }

  const save = async () => {
    if (!selected || !qty) return
    setSaving(true)
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: selected.id, type: adjustType, qty: Number(qty), note }),
    })
    const data = await res.json()
    setProducts(prev => prev.map(p => p.id === data.product.id ? data.product : p))
    setLogs(prev => [data.log, ...prev.slice(0, 49)])
    setShowAdjust(false)
    setSaving(false)
  }

  const typeLabel = { in: 'รับสินค้าเข้า', out: 'ตัดสต็อกออก', adjust: 'ปรับสต็อก' }
  const typeColor = { in: 'text-green-600', out: 'text-red-600', adjust: 'text-blue-600' }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">คลังสินค้า</h1>
          <p className="text-gray-500 text-sm">{tracked.length} รายการที่ติดตามสต็อก</p>
        </div>
        {lowStock.length > 0 && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap">
            <AlertTriangle size={16} />
            ใกล้หมด {lowStock.length} รายการ
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit overflow-x-auto">
        {[{ id: 'stock', label: 'สต็อก', icon: Boxes }, { id: 'log', label: 'ประวัติ', icon: History }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={clsx('flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap',
              tab === t.id ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700')}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <>
          {/* Low stock alert */}
          {lowStock.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-3 sm:p-4 mb-4">
              <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                <AlertTriangle size={16} /> สินค้าใกล้หมด / หมด
              </h3>
              <div className="flex flex-wrap gap-2">
                {lowStock.map(p => (
                  <div key={p.id} className="bg-white px-3 py-1.5 rounded-lg border border-red-200 text-sm flex items-center gap-2">
                    <span className="text-red-700 font-medium">{p.name}</span>
                    <span className="font-bold text-red-600">{p.stock}</span>
                    <button onClick={() => openAdjust(p, 'in')}
                      className="text-green-600 hover:bg-green-50 rounded p-0.5 transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาสินค้า..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="text-left px-3 sm:px-4 py-3">สินค้า</th>
                  <th className="text-center px-3 sm:px-4 py-3">สต็อกปัจจุบัน</th>
                  <th className="text-center px-3 sm:px-4 py-3 hidden sm:table-cell">สถานะ</th>
                  <th className="text-center px-3 sm:px-4 py-3">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-gray-400">ไม่มีสินค้าที่ติดตามสต็อก</td></tr>
                ) : filtered.map(p => {
                  const cat = categories.find(c => c.id === p.categoryId)
                  const isLow = p.stock <= lowStockAlert
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: (cat?.color || '#888') + '20' }}>
                            {cat?.icon || '📦'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{p.name}</p>
                            {p.barcode && <p className="text-xs text-gray-400">{p.barcode}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-center">
                        <span className={clsx('text-2xl font-bold', isLow ? 'text-red-600' : 'text-gray-800')}>{p.stock}</span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-center hidden sm:table-cell">
                        <span className={clsx('text-xs px-2 py-1 rounded-full font-medium',
                          p.stock === 0 ? 'bg-red-100 text-red-700' :
                          isLow ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700')}>
                          {p.stock === 0 ? 'หมด' : isLow ? 'ใกล้หมด' : 'ปกติ'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <button onClick={() => openAdjust(p, 'in')}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium">
                            <Plus size={13} /> รับเข้า
                          </button>
                          <button onClick={() => openAdjust(p, 'out')}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium">
                            <Minus size={13} /> ตัดออก
                          </button>
                          <button onClick={() => openAdjust(p, 'adjust')}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium">
                            <RefreshCw size={13} /> ปรับ
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}

      {tab === 'log' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                <th className="text-left px-3 sm:px-4 py-3 hidden sm:table-cell">วันที่</th>
                <th className="text-left px-3 sm:px-4 py-3">สินค้า</th>
                <th className="text-center px-3 sm:px-4 py-3">ประเภท</th>
                <th className="text-center px-3 sm:px-4 py-3">จำนวน</th>
                <th className="text-left px-3 sm:px-4 py-3 hidden md:table-cell">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">ยังไม่มีประวัติการเคลื่อนไหว</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">
                    {new Date(log.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-3 sm:px-4 py-3 font-medium text-gray-800">{log.productName}</td>
                  <td className="px-3 sm:px-4 py-3 text-center">
                    <span className={clsx('text-xs px-2 py-1 rounded-full font-medium',
                      log.type === 'in' ? 'bg-green-100 text-green-700' :
                      log.type === 'out' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700')}>
                      {log.type === 'in' ? 'รับเข้า' : log.type === 'out' ? 'ตัดออก' : 'ปรับสต็อก'}
                    </span>
                  </td>
                  <td className={clsx('px-3 sm:px-4 py-3 text-center font-bold', log.type === 'in' ? 'text-green-600' : log.type === 'out' ? 'text-red-600' : 'text-blue-600')}>
                    {log.type === 'in' ? '+' : log.type === 'out' ? '-' : ''}{log.qty}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-gray-500 hidden md:table-cell">{log.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjust && selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-4 sm:p-5">
            <h3 className="font-bold text-gray-800 mb-1">{typeLabel[adjustType]}</h3>
            <p className="text-sm text-gray-500 mb-4">{selected.name} (ปัจจุบัน: {selected.stock})</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {adjustType === 'adjust' ? 'สต็อกใหม่' : 'จำนวน'}
                </label>
                <input type="number" value={qty} onChange={e => setQty(e.target.value)} autoFocus
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-xl font-bold text-center focus:outline-none focus:border-orange-400" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <input value={note} onChange={e => setNote(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="เช่น รับสินค้าจากซัพพลายเออร์" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdjust(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">ยกเลิก</button>
                <button onClick={save} disabled={saving || !qty}
                  className={clsx('flex-1 py-2.5 rounded-xl font-semibold text-white transition-colors',
                    adjustType === 'in' ? 'bg-green-500 hover:bg-green-600' :
                    adjustType === 'out' ? 'bg-red-500 hover:bg-red-600' :
                    'bg-blue-500 hover:bg-blue-600',
                    (!qty || saving) && 'opacity-50 cursor-not-allowed')}>
                  {saving ? 'กำลังบันทึก...' : 'ยืนยัน'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
