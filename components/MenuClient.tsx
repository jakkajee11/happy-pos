'use client'
import { useState, useCallback } from 'react'
import { Plus, Minus, ShoppingBag, X, ChevronLeft, CheckCircle } from 'lucide-react'
import clsx from 'clsx'
import { Product, Category } from '@/lib/db'

interface CartItem {
  productId: string
  productName: string
  price: number
  cost: number
  qty: number
  total: number
  note?: string
}

interface Props {
  products: Product[]
  categories: Category[]
  shopName: string
  tableNo: string
}

const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

type Screen = 'menu' | 'cart' | 'confirm' | 'done'

export default function MenuClient({ products, categories, shopName, tableNo }: Props) {
  const [selectedCat, setSelectedCat] = useState('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [screen, setScreen] = useState<Screen>('menu')
  const [tableInput, setTableInput] = useState(tableNo)
  const [orderNote, setOrderNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [orderNo, setOrderNo] = useState('')

  const filtered = products.filter(p => {
    if (selectedCat !== 'all' && p.categoryId !== selectedCat) return false
    return true
  })

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id)
      if (existing) {
        return prev.map(i => i.productId === product.id
          ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.price }
          : i
        )
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        price: product.price,
        cost: product.cost,
        qty: 1,
        total: product.price,
      }]
    })
  }, [])

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.productId === productId ? { ...i, qty: i.qty + delta, total: (i.qty + delta) * i.price } : i)
      .filter(i => i.qty > 0)
    )
  }

  const updateNote = (productId: string, note: string) => {
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, note: note || undefined } : i))
  }

  const subtotal = cart.reduce((s, i) => s + i.total, 0)
  const totalItems = cart.reduce((s, i) => s + i.qty, 0)

  const submitOrder = async () => {
    if (cart.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNo: tableInput || undefined,
          items: cart,
          note: orderNote || undefined,
          subtotal,
          total: subtotal,
          discount: 0,
          source: 'qr-menu',
        }),
      })
      const data = await res.json()
      setOrderNo(data.orderNo)
      setScreen('done')
    } catch {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Done Screen ─────────────────────────────────────────────
  if (screen === 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">สั่งอาหารเรียบร้อย!</h1>
        <p className="text-gray-500 mb-1">ออเดอร์: <span className="font-mono font-semibold text-orange-600">{orderNo}</span></p>
        {tableInput && <p className="text-gray-500 mb-6">โต๊ะ {tableInput}</p>}
        <div className="bg-orange-50 rounded-2xl p-4 mb-6 w-full max-w-sm text-left space-y-1">
          {cart.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.qty}× {item.productName}</span>
              <span className="text-gray-600">฿{fmt(item.total)}</span>
            </div>
          ))}
          <div className="border-t border-orange-200 pt-1 flex justify-between font-bold">
            <span>รวม</span>
            <span className="text-orange-600">฿{fmt(subtotal)}</span>
          </div>
        </div>
        <p className="text-sm text-gray-400">กรุณารอสักครู่ พนักงานจะนำอาหารมาให้</p>
        <button
          onClick={() => { setCart([]); setScreen('menu'); setOrderNote('') }}
          className="mt-6 px-6 py-3 bg-orange-500 text-white rounded-2xl font-semibold hover:bg-orange-600"
        >
          สั่งเพิ่ม
        </button>
      </div>
    )
  }

  // ─── Cart / Confirm Screen ────────────────────────────────────
  if (screen === 'cart') {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setScreen('menu')} className="text-gray-500">
            <ChevronLeft size={24} />
          </button>
          <h2 className="font-bold text-gray-800 text-lg">รายการที่เลือก</h2>
        </div>

        {/* Table input */}
        {!tableNo && (
          <div className="bg-orange-50 px-4 py-3 border-b border-orange-100">
            <p className="text-sm font-medium text-orange-700 mb-1">หมายเลขโต๊ะของคุณ</p>
            <input
              value={tableInput}
              onChange={e => setTableInput(e.target.value)}
              placeholder="เช่น 5, A1, VIP"
              className="w-full border border-orange-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
        )}

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map(item => (
            <div key={item.productId} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{item.productName}</p>
                  <p className="text-sm text-orange-600 font-bold">฿{fmt(item.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.productId, -1)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-red-100 active:scale-95"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-bold text-gray-800">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.productId, 1)}
                    className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center hover:bg-orange-200 active:scale-95"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <span className="w-20 text-right font-bold text-gray-800">฿{fmt(item.total)}</span>
              </div>
              <input
                value={item.note ?? ''}
                onChange={e => updateNote(item.productId, e.target.value)}
                placeholder="หมายเหตุ (ไม่เผ็ด, ไม่ใส่ผัก ฯลฯ)"
                className="mt-2 w-full text-sm text-gray-600 placeholder-gray-300 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-yellow-300"
              />
            </div>
          ))}

          {/* Order note */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">หมายเหตุเพิ่มเติม</p>
            <textarea
              value={orderNote}
              onChange={e => setOrderNote(e.target.value)}
              placeholder="เช่น แพ้ถั่ว, ขอน้ำเย็นพิเศษ..."
              rows={2}
              className="w-full text-sm text-gray-700 placeholder-gray-300 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
        </div>

        {/* Summary + Submit — sticky bottom */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 space-y-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">รวมทั้งหมด ({totalItems} รายการ)</span>
            <span className="text-2xl font-bold text-orange-600">฿{fmt(subtotal)}</span>
          </div>
          <button
            onClick={submitOrder}
            disabled={submitting || cart.length === 0}
            className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl font-bold text-lg transition-colors active:scale-95 shadow-lg shadow-green-200/50"
          >
            {submitting ? '⏳ กำลังส่งออเดอร์...' : '✅ ยืนยันสั่งอาหาร'}
          </button>
        </div>
      </div>
    )
  }

  // ─── Menu Screen ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-orange-500 text-white px-4 pt-safe-top pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{shopName}</h1>
            {tableInput
              ? <p className="text-orange-100 text-sm">โต๊ะ {tableInput}</p>
              : <p className="text-orange-100 text-sm">สั่งออนไลน์</p>
            }
          </div>
          {totalItems > 0 && (
            <button
              onClick={() => setScreen('cart')}
              className="relative flex items-center gap-2 bg-white text-orange-600 px-4 py-2 rounded-2xl font-semibold text-sm active:scale-95 shadow-sm"
            >
              <ShoppingBag size={18} />
              <span>{totalItems} รายการ</span>
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => setSelectedCat('all')}
          className={clsx(
            'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0',
            selectedCat === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
          )}
        >
          ทั้งหมด
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCat(cat.id)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 flex items-center gap-1',
              selectedCat === cat.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
            )}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Products */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-2">🍽️</p>
            <p>ไม่พบรายการ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(product => {
              const cat = categories.find(c => c.id === product.categoryId)
              const inCart = cart.find(i => i.productId === product.id)
              const outOfStock = product.trackStock && product.stock <= 0

              return (
                <div
                  key={product.id}
                  className={clsx(
                    'bg-white rounded-2xl p-4 shadow-sm border-2 transition-all',
                    outOfStock ? 'opacity-50 border-gray-100' : inCart ? 'border-orange-300' : 'border-gray-100'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Product image or icon */}
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-14 h-14 rounded-2xl object-cover shrink-0" loading="lazy" />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                        style={{ backgroundColor: (cat?.color || '#888') + '20' }}
                      >
                        {cat?.icon || '🍽️'}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-base leading-tight">{product.name}</p>
                      {product.trackStock && product.stock <= 5 && product.stock > 0 && (
                        <p className="text-xs text-orange-500 mt-0.5">เหลือ {product.stock} ชิ้น</p>
                      )}
                      {outOfStock && <p className="text-xs text-red-500 font-medium mt-0.5">หมดแล้ว</p>}
                    </div>

                    {/* Price + Add */}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-orange-600 text-lg">฿{fmt(product.price)}</p>
                      {outOfStock ? null : inCart ? (
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() => updateQty(product.id, -1)}
                            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-red-100 active:scale-95"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-7 text-center font-bold text-gray-800">{inCart.qty}</span>
                          <button
                            onClick={() => addToCart(product)}
                            className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 active:scale-95"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="mt-1 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 active:scale-95 ml-auto"
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sticky order button */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50/80 to-transparent pointer-events-none">
          <button
            onClick={() => setScreen('cart')}
            className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-orange-300/50 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-between px-5 pointer-events-auto"
          >
            <span className="bg-white/20 px-3 py-1 rounded-xl text-sm font-bold">{totalItems} รายการ</span>
            <span className="flex items-center gap-2">
              <ShoppingBag size={20} />
              สั่งอาหาร
            </span>
            <span className="font-bold">฿{fmt(subtotal)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
