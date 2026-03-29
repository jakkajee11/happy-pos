'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Search, X, Plus, Minus, Trash2, User, Tag, Printer, CheckCircle, ChevronLeft, ScanLine, UtensilsCrossed, BookmarkCheck, ClipboardList, ShoppingCart } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

const PromptPayQR = dynamic(() => import('./PromptPayQR'), { ssr: false })
import clsx from 'clsx'
import { Product, Category, Member, Promotion, Settings, SaleItem, KitchenOrder, OpenOrder } from '@/lib/db'
import ReceiptModal from './ReceiptModal'

function printKOTs(kitchenOrders: KitchenOrder[]) {
  for (const order of kitchenOrders) {
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: monospace; font-size: 13px; padding: 8px; width: 80mm; }
  .station { font-size: 18px; font-weight: bold; background: #000; color: #fff; padding: 4px 0; text-align: center; margin-bottom: 4px; letter-spacing: 2px; }
  .meta { font-size: 11px; text-align: center; margin-bottom: 2px; }
  .table-no { font-size: 20px; font-weight: 900; text-align: center; margin: 4px 0; }
  .divider { border-top: 1px dashed #999; margin: 4px 0; }
  .item { font-size: 15px; font-weight: bold; padding: 4px 0; border-bottom: 1px dotted #ccc; display: flex; gap: 4px; }
  .qty { min-width: 28px; text-align: right; }
  .note { font-size: 11px; padding-left: 32px; color: #555; }
  .footer { text-align: center; font-size: 10px; color: #888; margin-top: 6px; }
</style>
</head><body>
<div class="station">${order.stationName.toUpperCase()}</div>
${order.tableNo ? `<div class="table-no">โต๊ะ ${order.tableNo}</div>` : ''}
<div class="meta">#${order.receiptNo} · ${new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
<div class="divider"></div>
${order.items.map(i => `<div class="item"><span class="qty">${i.qty}×</span><span>${i.productName}</span></div>${i.note ? `<div class="note">⚠ ${i.note}</div>` : ''}`).join('')}
<div class="footer">--- KOT ---</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}<\/script>
</body></html>`
    const w = window.open('', '_blank', 'width=320,height=480')
    if (w) { w.document.write(html); w.document.close() }
  }
}

interface CartItem extends SaleItem {
  note?: string
}

interface Props {
  initialProducts: Product[]
  categories: Category[]
  members: Member[]
  promotions: Promotion[]
  settings: Settings
  resumeOrder?: OpenOrder | null
}

export default function POSClient({ initialProducts, categories, members, promotions, settings, resumeOrder }: Props) {
  const router = useRouter()
  const [products] = useState(initialProducts)
  const [selectedCat, setSelectedCat] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>(resumeOrder?.items as CartItem[] ?? [])
  const [discount, setDiscount] = useState(resumeOrder?.discount ?? 0)
  const [discountNote, setDiscountNote] = useState(resumeOrder?.discountNote ?? '')
  const [selectedMember, setSelectedMember] = useState<Member | null>(
    resumeOrder?.memberId ? (members.find(m => m.id === resumeOrder.memberId) ?? null) : null
  )
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr' | 'card' | 'other'>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [showMemberPanel, setShowMemberPanel] = useState(false)
  const [showPromoPanel, setShowPromoPanel] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [completedSale, setCompletedSale] = useState<any>(null)
  const [tableNo, setTableNo] = useState(resumeOrder?.tableNo ?? '')
  const [loading, setLoading] = useState(false)
  const [holdingOrder, setHoldingOrder] = useState(false)
  const [heldOrderId] = useState<string | null>(resumeOrder?.id ?? null)  // track if editing existing order
  const [manualDiscountInput, setManualDiscountInput] = useState('')
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [splitPeople, setSplitPeople] = useState(0)            // 0 = no split
  const [splitPaidCount, setSplitPaidCount] = useState(0)      // equal-mode: how many paid
  const [splitMode, setSplitMode] = useState<'equal' | 'custom' | 'items'>('equal')
  const [splitAmounts, setSplitAmounts] = useState<string[]>([]) // custom mode: amount per person
  const [splitPaidFlags, setSplitPaidFlags] = useState<boolean[]>([]) // paid status (custom & items)
  const [splitQRIndex, setSplitQRIndex] = useState(0)           // which person's QR to show
  const [itemAssignments, setItemAssignments] = useState<Record<string, number | null>>({}) // items mode: productId → person index
  const searchRef = useRef<HTMLInputElement>(null)

  const filteredProducts = products.filter(p => {
    const matchCat = selectedCat === 'all' || p.categoryId === selectedCat
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search)
    return matchCat && matchSearch
  })

  const filteredMembers = members.filter(m =>
    !memberSearch || m.name.includes(memberSearch) || m.phone.includes(memberSearch)
  )

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

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId))
  }

  const updateNote = (productId: string, note: string) => {
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, note: note || undefined } : i))
  }

  // Barcode auto-add: ถ้า search ตรงกับบาร์โค้ดของสินค้า 1 รายการ → เพิ่มในตะกร้าทันที
  useEffect(() => {
    if (!search) return
    const exactMatch = products.find(p => p.barcode && p.barcode === search && p.isActive)
    if (exactMatch && !(exactMatch.trackStock && exactMatch.stock <= 0)) {
      addToCart(exactMatch)
      setSearch('')
    }
  }, [search, products, addToCart])

  const clearCart = () => {
    setCart([])
    setDiscount(0)
    setDiscountNote('')
    setSelectedMember(null)
    setShowPayment(false)
    setCashReceived('')
    setTableNo('')
  }

  // ── Hold Order (บันทึกออเดอร์พัก) ──────────────────────────
  const holdOrder = async () => {
    if (cart.length === 0) return
    setHoldingOrder(true)
    const payload = {
      tableNo: tableNo || undefined,
      items: cart,
      discount,
      discountNote,
      subtotal,
      total,
      memberId: selectedMember?.id,
      memberName: selectedMember?.name,
    }
    if (heldOrderId) {
      // Update existing open order
      await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: heldOrderId, ...payload }),
      })
    } else {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    setHoldingOrder(false)
    clearCart()
    router.push('/orders')
  }

  const subtotal = cart.reduce((sum, i) => sum + i.total, 0)
  const total = Math.max(0, subtotal - discount)
  const cashChange = Number(cashReceived) - total

  // Items mode: compute per-person totals from item assignments
  const personTotals = splitMode === 'items' && splitPeople > 0
    ? Array.from({ length: splitPeople }, (_, i) =>
        cart.reduce((s, item) => itemAssignments[item.productId] === i ? s + item.total : s, 0)
      )
    : Array<number>(splitPeople).fill(0)
  const itemsAssignedTotal = cart.reduce((s, item) =>
    itemAssignments[item.productId] != null ? s + item.total : s, 0)
  const itemsUnassigned = Math.round((total - itemsAssignedTotal) * 100) / 100

  // QR amount: varies by mode
  const qrAmount = splitPeople > 0
    ? splitMode === 'custom'
      ? (parseFloat(splitAmounts[splitQRIndex]) || 0)
      : splitMode === 'items'
      ? (personTotals[splitQRIndex] || 0)
      : Math.ceil((total / splitPeople) * 100) / 100
    : total

  const applyPromo = (promo: Promotion) => {
    if (subtotal < promo.minAmount) {
      alert(`ต้องซื้อขั้นต่ำ ฿${promo.minAmount}`)
      return
    }
    let disc = 0
    if (promo.type === 'percent') {
      disc = (subtotal * promo.value) / 100
      if (promo.maxDiscount) disc = Math.min(disc, promo.maxDiscount)
    } else if (promo.type === 'amount') {
      disc = promo.value
    } else if (promo.type === 'buy_x_get_y') {
      // คำนวณว่ากี่รอบที่ได้ส่วนลด เช่น ซื้อ 2 แถม 1 → ทุก 3 ชิ้น ชิ้นที่ถูกสุดฟรี
      const buyQty = promo.buyQty || 2
      const freeQty = promo.freeQty || 1
      const totalQty = cart.reduce((s, i) => s + i.qty, 0)
      const freeRounds = Math.floor(totalQty / (buyQty + freeQty))
      if (freeRounds === 0) {
        alert(`โปรนี้ต้องซื้อรวม ${buyQty + freeQty} ชิ้นขึ้นไป`)
        return
      }
      // เรียงราคาจากน้อยไปมาก แล้วเอาชิ้นที่ถูกที่สุดเป็นฟรี
      const sortedPrices = cart
        .flatMap(i => Array(i.qty).fill(i.price))
        .sort((a, b) => a - b)
      const freeItems = sortedPrices.slice(0, freeRounds * freeQty)
      disc = freeItems.reduce((s, p) => s + p, 0)
    }
    setDiscount(disc)
    setDiscountNote(promo.name)
    setShowPromoPanel(false)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (paymentMethod === 'cash' && Number(cashReceived) < total) {
      alert('รับเงินไม่ครบ')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          subtotal,
          discount,
          discountNote,
          total,
          tableNo: tableNo || undefined,
          paymentMethod,
          cashReceived: paymentMethod === 'cash' ? Number(cashReceived) : undefined,
          change: paymentMethod === 'cash' ? cashChange : undefined,
          memberId: selectedMember?.id,
          memberName: selectedMember?.name,
        }),
      })
      const sale = await res.json()
      // If this was a held open order — delete it now that it's paid
      if (heldOrderId) {
        await fetch(`/api/orders?id=${heldOrderId}`, { method: 'DELETE' })
      }
      // Auto-print KOTs if there are kitchen orders
      if (sale.kitchenOrders && sale.kitchenOrders.length > 0) {
        printKOTs(sale.kitchenOrders)
      }
      setCompletedSale({ ...sale, settings })
      setShowPayment(false)
    } catch (e) {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  if (completedSale) {
    return (
      <ReceiptModal
        sale={completedSale}
        settings={settings}
        onClose={() => {
          setCompletedSale(null)
          clearCart()
        }}
      />
    )
  }

  const [showMobileCart, setShowMobileCart] = useState(false)

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      {/* Left: Products */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search bar */}
        <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2 sm:py-3 flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาสินค้า..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => { searchRef.current?.focus(); searchRef.current?.select() }}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:border-orange-300 transition-colors"
            title="คลิกแล้วสแกนบาร์โค้ด"
          >
            <ScanLine size={16} />
            <span className="hidden sm:inline">บาร์โค้ด</span>
          </button>
        </div>

        {/* Categories */}
        <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2 flex gap-1.5 sm:gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCat('all')}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              selectedCat === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            ทั้งหมด ({products.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={clsx(
                'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1',
                selectedCat === cat.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 pb-20 md:pb-4">
          {filteredProducts.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              <p className="text-4xl mb-2">🔍</p>
              <p>ไม่พบสินค้า</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
              {filteredProducts.map(product => {
                const inCart = cart.find(i => i.productId === product.id)
                const outOfStock = product.trackStock && product.stock <= 0
                return (
                  <button
                    key={product.id}
                    onClick={() => !outOfStock && addToCart(product)}
                    disabled={outOfStock}
                    className={clsx(
                      'pos-btn relative bg-white rounded-xl sm:rounded-2xl p-2 sm:p-3 text-left shadow-sm border transition-all duration-150',
                      outOfStock
                        ? 'opacity-40 cursor-not-allowed border-gray-200'
                        : 'border-gray-100 hover:border-orange-300 hover:shadow-md active:scale-95',
                      inCart && 'border-orange-400 bg-orange-50'
                    )}
                  >
                    {/* Product image or category icon */}
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl object-cover mb-1 sm:mb-2" loading="lazy" />
                    ) : (
                      <div
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-xl mb-1 sm:mb-2"
                        style={{ backgroundColor: categories.find(c => c.id === product.categoryId)?.color + '20' }}
                      >
                        {categories.find(c => c.id === product.categoryId)?.icon || '📦'}
                      </div>
                    )}
                    <p className="text-xs sm:text-sm font-medium text-gray-800 leading-tight line-clamp-2">{product.name}</p>
                    <p className="text-sm sm:text-base font-bold text-orange-600 mt-0.5 sm:mt-1">฿{fmt(product.price)}</p>
                    {product.trackStock && (
                      <p className={clsx('text-xs mt-0.5', product.stock <= 10 ? 'text-red-500' : 'text-gray-400')}>
                        สต็อก: {product.stock}
                      </p>
                    )}
                    {inCart && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {inCart.qty}
                      </div>
                    )}
                    {outOfStock && (
                      <div className="absolute inset-0 bg-white/60 rounded-2xl flex items-center justify-center">
                        <span className="text-xs text-red-500 font-semibold">หมด</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile floating cart button */}
      {!showMobileCart && (
        <button
          onClick={() => setShowMobileCart(true)}
          className="md:hidden fixed bottom-4 right-4 z-40 bg-orange-500 text-white rounded-full shadow-lg shadow-orange-300 flex items-center gap-2 px-5 py-3.5 font-bold text-sm active:scale-95 transition-transform"
        >
          <ShoppingCart size={20} />
          {cart.length > 0 ? `ตะกร้า (${cart.length}) ฿${fmt(total)}` : 'ตะกร้า'}
        </button>
      )}

      {/* Mobile cart overlay */}
      {showMobileCart && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setShowMobileCart(false)} />
      )}

      {/* Right: Cart */}
      <div className={clsx(
        'bg-white border-l border-gray-200 flex flex-col shadow-xl',
        // Desktop: fixed sidebar
        'hidden md:flex md:w-80 xl:w-96',
        // Mobile: slide-up panel
        showMobileCart && '!flex fixed inset-x-0 bottom-0 z-50 rounded-t-2xl max-h-[85vh] md:relative md:inset-auto md:rounded-none md:max-h-none'
      )}>
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Cart Header */}
        <div className="px-4 py-2 sm:py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-sm sm:text-base">ตะกร้า ({cart.length} รายการ)</h2>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-red-400 hover:text-red-600 text-sm flex items-center gap-1">
                <Trash2 size={14} /> ล้าง
              </button>
            )}
            <button onClick={() => setShowMobileCart(false)} className="md:hidden text-gray-400 hover:text-gray-600 p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Table No */}
        <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
          <UtensilsCrossed size={15} className="text-gray-400 shrink-0" />
          <input
            value={tableNo}
            onChange={e => setTableNo(e.target.value)}
            placeholder="หมายเลขโต๊ะ (ถ้ามี)"
            className="flex-1 text-sm text-gray-700 focus:outline-none bg-transparent placeholder-gray-400"
          />
          {tableNo && (
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">โต๊ะ {tableNo}</span>
          )}
        </div>

        {/* Member */}
        <div className="px-4 py-2 border-b border-gray-100">
          {selectedMember ? (
            <div className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <User size={16} className="text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-blue-800">{selectedMember.name}</p>
                  <p className="text-xs text-blue-500">แต้ม: {selectedMember.points.toLocaleString()}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)} className="text-blue-400">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowMemberPanel(true)}
              className="w-full flex items-center gap-2 text-gray-500 hover:text-orange-500 text-sm py-1"
            >
              <User size={16} />
              เพิ่มสมาชิก
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center text-gray-300 mt-20">
              <p className="text-5xl mb-3">🛒</p>
              <p className="text-sm">ยังไม่มีสินค้าในตะกร้า</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="py-2 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                    <p className="text-xs text-gray-500">฿{fmt(item.price)} × {item.qty}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.productId, -1)}
                      className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-7 text-center text-sm font-bold">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.productId, 1)}
                      className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-green-100 hover:text-green-600 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="text-right min-w-[60px]">
                    <p className="text-sm font-bold text-gray-800">฿{fmt(item.total)}</p>
                    <button onClick={() => removeItem(item.productId)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {/* Note field for kitchen */}
                <input
                  value={item.note ?? ''}
                  onChange={e => updateNote(item.productId, e.target.value)}
                  placeholder="หมายเหตุครัว... (ไม่ใส่เผ็ด, ไม่ใส่ผัก ฯลฯ)"
                  className="mt-1 w-full text-xs text-gray-600 placeholder-gray-300 bg-yellow-50 border border-yellow-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-yellow-300"
                />
              </div>
            ))
          )}
        </div>

        {/* Discount & Total */}
        <div className="px-4 py-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>ราคารวม</span>
            <span>฿{fmt(subtotal)}</span>
          </div>

          {discount > 0 ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-600">ส่วนลด ({discountNote})</span>
              <div className="flex items-center gap-1">
                <span className="text-green-600">-฿{fmt(discount)}</span>
                <button onClick={() => { setDiscount(0); setDiscountNote('') }} className="text-gray-400">
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowPromoPanel(true)}
              className="flex items-center gap-1 text-sm text-orange-500 hover:underline"
            >
              <Tag size={14} /> ใช้ส่วนลด/โปรโมชั่น
            </button>
          )}

          <div className="flex items-center justify-between font-bold text-lg border-t border-gray-200 pt-2">
            <span>ยอดชำระ</span>
            <span className="text-orange-600">฿{fmt(total)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-4 space-y-2">
          {/* Hold Order */}
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/orders')}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:border-orange-300 hover:text-orange-600 transition-colors"
              title="ดูออเดอร์ที่พักไว้"
            >
              <ClipboardList size={16} />
            </button>
            <button
              onClick={holdOrder}
              disabled={cart.length === 0 || holdingOrder}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-orange-300 text-orange-600 rounded-xl text-sm font-medium hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <BookmarkCheck size={16} />
              {holdingOrder ? 'กำลังบันทึก...' : heldOrderId ? 'อัปเดตออเดอร์' : 'บันทึกออเดอร์'}
            </button>
          </div>
          {/* Checkout */}
          <button
            onClick={() => cart.length > 0 && setShowPayment(true)}
            disabled={cart.length === 0}
            className={clsx(
              'w-full py-4 rounded-2xl font-bold text-lg transition-all',
              cart.length > 0
                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200 active:scale-95'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            )}
          >
            ชำระเงิน ฿{fmt(total)}
          </button>
        </div>
      </div>

      {/* Member Panel */}
      {showMemberPanel && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">เลือกสมาชิก</h3>
              <button onClick={() => setShowMemberPanel(false)}><X size={20} /></button>
            </div>
            <input
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              placeholder="ค้นหาชื่อ หรือเบอร์โทร..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-orange-300"
              autoFocus
            />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredMembers.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedMember(m); setShowMemberPanel(false); setMemberSearch('') }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-orange-50 text-left transition-colors"
                >
                  <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">
                    {m.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.phone} · แต้ม {m.points.toLocaleString()}</p>
                  </div>
                </button>
              ))}
              {filteredMembers.length === 0 && (
                <p className="text-center text-gray-400 py-4 text-sm">ไม่พบสมาชิก</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Promo Panel */}
      {showPromoPanel && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">เลือกส่วนลด</h3>
              <button onClick={() => setShowPromoPanel(false)}><X size={20} /></button>
            </div>
            <div className="mb-3">
              <p className="text-sm text-gray-500">ยอดรวม: <strong>฿{fmt(subtotal)}</strong></p>
            </div>

            {/* Manual discount */}
            <div className="mb-4 bg-gray-50 rounded-xl p-3 space-y-2">
              <p className="text-sm font-medium text-gray-700">ส่วนลดเอง</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="จำนวนเงิน (฿)"
                  value={manualDiscountInput}
                  onChange={e => setManualDiscountInput(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = Number(manualDiscountInput)
                      if (val > 0) { setDiscount(val); setDiscountNote('ส่วนลดพิเศษ'); setShowPromoPanel(false); setManualDiscountInput('') }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const val = Number(manualDiscountInput)
                    if (val > 0) { setDiscount(val); setDiscountNote('ส่วนลดพิเศษ'); setShowPromoPanel(false); setManualDiscountInput('') }
                  }}
                  className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
                >
                  ใช้
                </button>
              </div>
              {/* Promo code entry */}
              <div className="flex gap-2 pt-1 border-t border-gray-200">
                <input
                  type="text"
                  placeholder="พิมพ์รหัสส่วนลด..."
                  value={promoCodeInput}
                  onChange={e => setPromoCodeInput(e.target.value.toUpperCase())}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-300"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const matched = promotions.find(p => p.isActive && p.code && p.code.toUpperCase() === promoCodeInput.trim())
                      if (matched) { applyPromo(matched); setPromoCodeInput('') }
                      else if (promoCodeInput) alert(`ไม่พบรหัส "${promoCodeInput}"`)
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const matched = promotions.find(p => p.isActive && p.code && p.code.toUpperCase() === promoCodeInput.trim())
                    if (matched) { applyPromo(matched); setPromoCodeInput('') }
                    else if (promoCodeInput) alert(`ไม่พบรหัส "${promoCodeInput}"`)
                  }}
                  className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                >
                  ใช้โค้ด
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {promotions.map(p => (
                <button
                  key={p.id}
                  onClick={() => applyPromo(p)}
                  className="w-full text-left p-3 border border-gray-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-colors"
                >
                  <div className="flex justify-between">
                    <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                    <span className="text-orange-600 font-bold text-sm">
                      {p.type === 'percent' ? `-${p.value}%` : p.type === 'amount' ? `-฿${fmt(p.value)}` : `ซื้อ${p.buyQty ?? 2} แถม${p.freeQty ?? 1}`}
                    </span>
                  </div>
                  {p.minAmount > 0 && (
                    <p className="text-xs text-gray-400">ขั้นต่ำ ฿{fmt(p.minAmount)}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setShowPayment(false)} className="text-gray-400 hover:text-gray-600">
                <ChevronLeft size={20} />
              </button>
              <h3 className="font-bold text-gray-800 text-lg">ชำระเงิน</h3>
              {tableNo && (
                <span className="ml-auto text-sm bg-orange-100 text-orange-600 px-2.5 py-1 rounded-xl font-semibold">
                  โต๊ะ {tableNo}
                </span>
              )}
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Total display */}
              <div className="bg-orange-50 rounded-2xl p-4 text-center">
                <p className="text-sm text-gray-500">ยอดที่ต้องชำระ</p>
                <p className="text-4xl font-bold text-orange-600">฿{fmt(total)}</p>
                {discount > 0 && <p className="text-sm text-green-600">ประหยัด ฿{fmt(discount)}</p>}
              </div>

              {/* Payment method */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">วิธีชำระเงิน</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'cash', label: 'เงินสด', emoji: '💵' },
                    { id: 'qr', label: 'QR/โอน', emoji: '📱' },
                    { id: 'card', label: 'บัตร', emoji: '💳' },
                    { id: 'other', label: 'อื่นๆ', emoji: '📋' },
                  ].map(pm => (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id as any)}
                      className={clsx(
                        'flex flex-col items-center p-3 rounded-xl border-2 transition-all',
                        paymentMethod === pm.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <span className="text-2xl">{pm.emoji}</span>
                      <span className="text-xs mt-1 font-medium text-gray-600">{pm.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash calculator */}
              {paymentMethod === 'cash' && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">รับเงิน</p>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                    placeholder="ใส่จำนวนเงินที่รับ"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-xl font-bold focus:outline-none focus:border-orange-400 text-center"
                  />
                  {/* Quick amounts */}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {[total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, 1000].filter((v, i, a) => a.indexOf(v) === i).map(amount => (
                      <button
                        key={amount}
                        onClick={() => setCashReceived(String(amount))}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-orange-100 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                      >
                        ฿{fmt(amount)}
                      </button>
                    ))}
                  </div>
                  {Number(cashReceived) >= total && (
                    <div className="mt-3 bg-green-50 rounded-xl p-3 flex justify-between">
                      <span className="text-green-700 font-medium">เงินทอน</span>
                      <span className="text-green-700 font-bold text-xl">฿{fmt(cashChange)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* QR block: hide when custom/items split (QR is embedded inside split section) */}
              {paymentMethod === 'qr' && !(splitPeople > 0 && (splitMode === 'custom' || splitMode === 'items')) && (
                <div className="flex flex-col items-center py-4 gap-3">
                  <PromptPayQR
                    account={settings.promptpayId ?? ''}
                    amount={qrAmount}
                    size={200}
                  />
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-800">
                      ฿{fmt(qrAmount)}
                    </p>
                    {splitPeople > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        ต่อคน ({splitPeople} คน · รวม ฿{fmt(total)})
                      </p>
                    )}
                  </div>
                  {!settings.promptpayId && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 text-center">
                      ⚠️ ยังไม่ได้ตั้งค่าหมายเลข PromptPay<br />
                      <span className="text-gray-500">ไปที่ ตั้งค่า → ร้านค้า เพื่อเพิ่มหมายเลข</span>
                    </p>
                  )}
                </div>
              )}

              {/* Split Bill */}
              {(() => {
                // custom-mode derived values
                const parsedAmounts = splitAmounts.map(a => parseFloat(a) || 0)
                const customTotal = parsedAmounts.reduce((s, v) => s + v, 0)
                const customPaid = parsedAmounts.reduce((s, v, i) => s + (splitPaidFlags[i] ? v : 0), 0)
                const customRemaining = total - customPaid
                const customDiff = Math.round((customTotal - total) * 100) / 100
                const currentQRAmount = splitMode === 'custom'
                  ? (parsedAmounts[splitQRIndex] || 0)
                  : (splitPeople > 0 ? Math.ceil((total / splitPeople) * 100) / 100 : total)

                const handleSetSplitPeople = (n: number) => {
                  const next = splitPeople === n ? 0 : n
                  setSplitPeople(next)
                  setSplitPaidCount(0)
                  setSplitMode('equal')
                  setSplitAmounts(Array(next).fill(''))
                  setSplitPaidFlags(Array(next).fill(false))
                  setSplitQRIndex(0)
                  setItemAssignments({})
                }

                const assignItem = (productId: string, personIdx: number) => {
                  setItemAssignments(prev => ({
                    ...prev,
                    [productId]: prev[productId] === personIdx ? null : personIdx,
                  }))
                  setSplitQRIndex(personIdx)
                }

                const updateAmount = (idx: number, val: string) => {
                  const next = [...splitAmounts]
                  next[idx] = val
                  // Auto-fill last person with remainder
                  if (idx < splitPeople - 1) {
                    const othersSum = next.slice(0, -1).reduce((s, v) => s + (parseFloat(v) || 0), 0)
                    const remain = Math.round((total - othersSum) * 100) / 100
                    next[splitPeople - 1] = remain > 0 ? String(remain) : ''
                  }
                  setSplitAmounts(next)
                }

                const togglePaid = (idx: number) => {
                  const next = [...splitPaidFlags]
                  next[idx] = !next[idx]
                  setSplitPaidFlags(next)
                  // Auto-advance QR to next unpaid person
                  const nextUnpaid = next.findIndex((f, i) => !f && i !== idx)
                  if (!next[idx] === false && nextUnpaid >= 0) setSplitQRIndex(nextUnpaid)
                }

                return (
                  <div className="border border-gray-200 rounded-xl p-3">
                    {/* Header: people selector */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">✂️ แยกจ่าย</span>
                      <div className="flex items-center gap-1.5">
                        {[2,3,4,5,6].map(n => (
                          <button key={n}
                            onClick={() => handleSetSplitPeople(n)}
                            className={clsx(
                              'w-8 h-8 rounded-lg text-sm font-bold border-2 transition-all',
                              splitPeople === n ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-200 text-gray-600 hover:border-orange-300'
                            )}
                          >{n}</button>
                        ))}
                      </div>
                    </div>

                    {splitPeople > 0 && (
                      <div className="mt-3 space-y-2">
                        {/* Mode toggle */}
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                          <button
                            onClick={() => { setSplitMode('equal'); setSplitQRIndex(0) }}
                            className={clsx('flex-1 py-1.5 transition-colors',
                              splitMode === 'equal' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                            )}
                          >เท่าๆ กัน</button>
                          <button
                            onClick={() => { setSplitMode('custom'); setSplitQRIndex(0) }}
                            className={clsx('flex-1 py-1.5 transition-colors border-x border-gray-200',
                              splitMode === 'custom' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                            )}
                          >กำหนดยอด</button>
                          <button
                            onClick={() => { setSplitMode('items'); setSplitQRIndex(0) }}
                            className={clsx('flex-1 py-1.5 transition-colors',
                              splitMode === 'items' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                            )}
                          >แบ่งรายการ</button>
                        </div>

                        {/* ── EQUAL MODE ── */}
                        {splitMode === 'equal' && (
                          <>
                            <div className="bg-orange-50 rounded-xl p-3">
                              <p className="text-xs text-gray-500 mb-0.5">ต่อคน ({splitPeople} คน)</p>
                              <p className="text-2xl font-bold text-orange-600">฿{fmt(total / splitPeople)}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">จ่ายแล้ว {splitPaidCount}/{splitPeople} คน</span>
                              <div className="flex gap-1">
                                <button onClick={() => setSplitPaidCount(Math.max(0, splitPaidCount - 1))}
                                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-600">−</button>
                                <button onClick={() => setSplitPaidCount(Math.min(splitPeople, splitPaidCount + 1))}
                                  className="w-8 h-8 rounded-lg bg-green-100 hover:bg-green-200 font-bold text-green-700">+</button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs text-green-600">รับแล้ว</p>
                                <p className="font-bold text-green-700">฿{fmt((total / splitPeople) * splitPaidCount)}</p>
                              </div>
                              <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs text-gray-500">ค้างอยู่</p>
                                <p className="font-bold text-gray-700">฿{fmt((total / splitPeople) * (splitPeople - splitPaidCount))}</p>
                              </div>
                            </div>
                          </>
                        )}

                        {/* ── CUSTOM MODE ── */}
                        {splitMode === 'custom' && (
                          <>
                            {/* Side-by-side: person rows (left) + QR panel (right, only for QR payment) */}
                            <div className={clsx(
                              paymentMethod === 'qr' ? 'flex gap-3 items-start' : ''
                            )}>
                              {/* Person rows */}
                              <div className={clsx(
                                'space-y-1.5 min-w-0',
                                paymentMethod === 'qr' ? 'flex-1' : '',
                                splitPeople > 4 ? 'max-h-52 overflow-y-auto pr-0.5' : ''
                              )}>
                                {Array.from({ length: splitPeople }, (_, i) => (
                                  <div key={i} className={clsx(
                                    'flex items-center gap-2 rounded-lg px-2 py-1.5 border transition-colors',
                                    splitPaidFlags[i] ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200',
                                    splitQRIndex === i && !splitPaidFlags[i] ? 'ring-2 ring-orange-400' : ''
                                  )}>
                                    {/* Person label / QR selector */}
                                    <button
                                      onClick={() => { if (!splitPaidFlags[i]) setSplitQRIndex(i) }}
                                      className={clsx(
                                        'w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 transition-colors',
                                        splitPaidFlags[i] ? 'bg-green-500 text-white' :
                                        splitQRIndex === i ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                                      )}
                                    >{i + 1}</button>

                                    {/* Amount input */}
                                    <div className="flex-1 flex items-center gap-1 min-w-0">
                                      <span className="text-gray-400 text-sm flex-shrink-0">฿</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={splitAmounts[i] ?? ''}
                                        onChange={e => updateAmount(i, e.target.value)}
                                        onFocus={() => { if (!splitPaidFlags[i]) setSplitQRIndex(i) }}
                                        disabled={splitPaidFlags[i]}
                                        placeholder="0.00"
                                        className="w-full text-right font-bold text-gray-800 bg-transparent outline-none disabled:text-green-700 text-sm min-w-0"
                                      />
                                    </div>

                                    {/* Paid toggle */}
                                    <button
                                      onClick={() => togglePaid(i)}
                                      disabled={!parsedAmounts[i]}
                                      className={clsx(
                                        'text-xs px-2 py-1 rounded-md font-medium transition-colors flex-shrink-0',
                                        splitPaidFlags[i]
                                          ? 'bg-green-500 text-white'
                                          : 'bg-gray-100 text-gray-500 hover:bg-orange-100 hover:text-orange-600 disabled:opacity-40'
                                      )}
                                    >{splitPaidFlags[i] ? '✓ จ่ายแล้ว' : 'รับเงิน'}</button>
                                  </div>
                                ))}
                              </div>

                              {/* QR panel (right column, only QR payment) */}
                              {paymentMethod === 'qr' && (
                                <div className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[140px]">
                                  <PromptPayQR
                                    account={settings.promptpayId ?? ''}
                                    amount={qrAmount}
                                    size={130}
                                  />
                                  <p className="text-base font-bold text-gray-800 leading-tight">฿{fmt(qrAmount)}</p>
                                  <p className="text-[10px] text-orange-500 font-medium text-center leading-tight">
                                    คนที่ {splitQRIndex + 1}
                                  </p>
                                  {!settings.promptpayId && (
                                    <p className="text-[10px] text-amber-600 bg-amber-50 rounded px-1.5 py-1 text-center leading-tight">
                                      ⚠️ ยังไม่ได้ตั้งค่า PromptPay
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Total validation */}
                            <div className={clsx(
                              'text-xs px-3 py-1.5 rounded-lg flex justify-between',
                              Math.abs(customDiff) < 0.01 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                            )}>
                              <span>รวมที่ป้อน</span>
                              <span className="font-bold">
                                ฿{fmt(customTotal)}
                                {Math.abs(customDiff) >= 0.01 && (
                                  <span className="ml-1">
                                    ({customDiff > 0 ? '+' : ''}{fmt(customDiff)})
                                  </span>
                                )}
                              </span>
                            </div>

                            {/* Paid / Remaining summary */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs text-green-600">รับแล้ว</p>
                                <p className="font-bold text-green-700">฿{fmt(customPaid)}</p>
                              </div>
                              <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs text-gray-500">ค้างอยู่</p>
                                <p className="font-bold text-gray-700">฿{fmt(customRemaining)}</p>
                              </div>
                            </div>
                          </>
                        )}

                        {/* ── ITEMS MODE ── */}
                        {splitMode === 'items' && (
                          <>
                            <div className={clsx(
                              'gap-3',
                              paymentMethod === 'qr' ? 'flex items-start' : 'block'
                            )}>
                              {/* Item assignment list */}
                              <div className={clsx(
                                'space-y-1.5 min-w-0',
                                paymentMethod === 'qr' ? 'flex-1' : 'w-full',
                                cart.length > 4 ? 'max-h-52 overflow-y-auto pr-0.5' : ''
                              )}>
                                {cart.map(item => {
                                  const assigned = itemAssignments[item.productId]
                                  return (
                                    <div key={item.productId} className={clsx(
                                      'rounded-lg border px-2 py-1.5 transition-colors',
                                      assigned != null
                                        ? 'bg-orange-50 border-orange-200'
                                        : 'bg-white border-gray-200'
                                    )}>
                                      {/* Item info */}
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-semibold text-gray-800 truncate">{item.productName}</p>
                                          <p className="text-[10px] text-gray-400">×{item.qty} · ฿{fmt(item.total)}</p>
                                        </div>
                                        {/* Person buttons */}
                                        <div className="flex gap-1 flex-shrink-0">
                                          {Array.from({ length: splitPeople }, (_, i) => (
                                            <button key={i}
                                              onClick={() => assignItem(item.productId, i)}
                                              className={clsx(
                                                'w-7 h-7 rounded-full text-xs font-bold transition-all flex-shrink-0',
                                                assigned === i
                                                  ? 'bg-orange-500 text-white shadow-sm scale-110'
                                                  : 'bg-gray-100 text-gray-500 hover:bg-orange-100 hover:text-orange-600'
                                              )}
                                            >{i + 1}</button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                              {/* QR panel (right, QR payment only) */}
                              {paymentMethod === 'qr' && (
                                <div className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[140px]">
                                  <PromptPayQR
                                    account={settings.promptpayId ?? ''}
                                    amount={qrAmount}
                                    size={130}
                                  />
                                  <p className="text-base font-bold text-gray-800 leading-tight">฿{fmt(qrAmount)}</p>
                                  <p className="text-[10px] text-orange-500 font-medium text-center leading-tight">
                                    คนที่ {splitQRIndex + 1}
                                  </p>
                                  {!settings.promptpayId && (
                                    <p className="text-[10px] text-amber-600 bg-amber-50 rounded px-1.5 py-1 text-center leading-tight">
                                      ⚠️ ยังไม่ได้ตั้งค่า PromptPay
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Unassigned / Assigned indicator */}
                            {itemsUnassigned > 0.01 ? (
                              <div className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 flex justify-between">
                                <span>⚠️ ยังไม่ได้แบ่ง</span>
                                <span className="font-bold">฿{fmt(itemsUnassigned)}</span>
                              </div>
                            ) : (
                              <div className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 flex justify-between">
                                <span>✓ แบ่งครบแล้ว</span>
                                <span className="font-bold">฿{fmt(total)}</span>
                              </div>
                            )}

                            {/* Per-person summary cards (click to select QR) */}
                            <div className={clsx(
                              'grid gap-2',
                              splitPeople <= 2 ? 'grid-cols-2' : 'grid-cols-3'
                            )}>
                              {Array.from({ length: splitPeople }, (_, i) => (
                                <div key={i}
                                  onClick={() => setSplitQRIndex(i)}
                                  className={clsx(
                                    'rounded-lg px-2 py-2 text-center border-2 cursor-pointer transition-colors',
                                    splitPaidFlags[i]
                                      ? 'border-green-300 bg-green-50'
                                      : splitQRIndex === i && paymentMethod === 'qr'
                                      ? 'border-orange-400 bg-orange-50'
                                      : 'border-gray-200 bg-gray-50 hover:border-orange-200'
                                  )}
                                >
                                  <p className={clsx(
                                    'text-[10px] font-medium mb-0.5',
                                    splitPaidFlags[i] ? 'text-green-600' : 'text-gray-500'
                                  )}>คนที่ {i + 1}</p>
                                  <p className={clsx(
                                    'text-sm font-bold leading-tight',
                                    splitPaidFlags[i] ? 'text-green-700' : 'text-gray-800'
                                  )}>฿{fmt(personTotals[i] || 0)}</p>
                                  <button
                                    onClick={e => { e.stopPropagation(); togglePaid(i) }}
                                    disabled={!personTotals[i]}
                                    className={clsx(
                                      'mt-1 text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors w-full',
                                      splitPaidFlags[i]
                                        ? 'bg-green-200 text-green-800'
                                        : 'bg-gray-200 text-gray-600 hover:bg-orange-100 hover:text-orange-700 disabled:opacity-40'
                                    )}
                                  >{splitPaidFlags[i] ? '✓ จ่ายแล้ว' : 'รับเงิน'}</button>
                                </div>
                              ))}
                            </div>

                            {/* Remaining summary */}
                            {splitPaidFlags.some(Boolean) && (
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
                                  <p className="text-xs text-green-600">รับแล้ว</p>
                                  <p className="font-bold text-green-700">
                                    ฿{fmt(personTotals.reduce((s, v, i) => s + (splitPaidFlags[i] ? v : 0), 0))}
                                  </p>
                                </div>
                                <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                                  <p className="text-xs text-gray-500">ค้างอยู่</p>
                                  <p className="font-bold text-gray-700">
                                    ฿{fmt(personTotals.reduce((s, v, i) => s + (splitPaidFlags[i] ? 0 : v), 0))}
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Confirm Button */}
              <button
                onClick={handleCheckout}
                disabled={loading || (paymentMethod === 'cash' && Number(cashReceived) < total)}
                className={clsx(
                  'w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2',
                  loading || (paymentMethod === 'cash' && Number(cashReceived) < total)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200'
                )}
              >
                {loading ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    ยืนยันการชำระเงิน
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
