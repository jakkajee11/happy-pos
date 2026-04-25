'use client'
import { useState, useRef, useCallback } from 'react'
import { Plus, Pencil, Trash2, Search, Package, X, Check, ChevronDown, Camera, ImageIcon, FlaskConical, BookOpen } from 'lucide-react'
import clsx from 'clsx'
import { Product, Category, Station, Ingredient, RecipeIngredient } from '@/lib/db'

interface Props {
  initialProducts: Product[]
  initialCategories: Category[]
  initialStations: Station[]
  initialIngredients: Ingredient[]
}

const ICONS = ['📦','☕','🍜','🍰','🥤','🧋','🍕','🍔','🍣','🛍️','👔','💊','🌸','🎁','🧴','🔧','📱','🖥️']
const COLORS = ['#6B7280','#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#06B6D4']

const emptyProduct = {
  name: '', price: '', cost: '', categoryId: '', stationId: '', stock: '', trackStock: false, barcode: '', isActive: true, image: ''
}

// Resize image on client side for performance
function resizeImage(file: File, maxSize: number = 480, quality: number = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let w = img.width, h = img.height
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize }
        else { w = Math.round(w * maxSize / h); h = maxSize }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

export default function ProductsClient({ initialProducts, initialCategories, initialStations, initialIngredients }: Props) {
  const [products, setProducts] = useState(initialProducts)
  const [categories, setCategories] = useState(initialCategories)
  const [stations] = useState(initialStations)
  const [ingredients] = useState(initialIngredients)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null)
  const [recipeItems, setRecipeItems] = useState<{ ingredientId: string; qtyPerUnit: string }[]>([])
  const [recipeAvailable, setRecipeAvailable] = useState<number | null>(null)
  const [recipeSaving, setRecipeSaving] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<any>(emptyProduct)
  const [catForm, setCatForm] = useState({ name: '', icon: '📦', color: '#6B7280' })
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    // Show preview immediately
    const url = URL.createObjectURL(file)
    setImagePreview(url)
  }, [])

  const uploadImage = async (productId: string): Promise<string> => {
    if (!imageFile) return form.image || ''
    setUploadingImage(true)
    try {
      const resized = await resizeImage(imageFile, 480, 0.82)
      const formData = new FormData()
      formData.append('image', resized, `${productId}.jpg`)
      formData.append('productId', productId)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      return data.image || ''
    } catch (err) {
      console.error('Upload failed:', err)
      return form.image || ''
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = async (productId?: string) => {
    if (productId) {
      await fetch(`/api/upload?id=${productId}`, { method: 'DELETE' })
    }
    setImageFile(null)
    setImagePreview('')
    setForm((f: any) => ({ ...f, image: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const filtered = products.filter(p => {
    const matchCat = filterCat === 'all' || p.categoryId === filterCat
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search)
    return matchCat && matchSearch
  })

  const openNew = () => { setEditing(null); setForm(emptyProduct); setImageFile(null); setImagePreview(''); setShowModal(true) }
  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({ name: p.name, price: p.price, cost: p.cost, categoryId: p.categoryId, stationId: p.stationId || '', stock: p.stock, trackStock: p.trackStock, barcode: p.barcode || '', isActive: p.isActive, image: p.image || '' })
    setImageFile(null)
    setImagePreview(p.image || '')
    setShowModal(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...form, price: Number(form.price), cost: Number(form.cost), stock: Number(form.stock), stationId: form.stationId || undefined }
      const method = editing ? 'PUT' : 'POST'
      if (editing) payload.id = editing.id

      // If image was removed (preview empty but previously had image)
      if (!imagePreview && editing?.image) {
        payload.image = ''
      }

      const res = await fetch('/api/products', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const saved = await res.json()

      // Upload image after product is saved (need the product id)
      if (imageFile) {
        const imageUrl = await uploadImage(saved.id)
        if (imageUrl) {
          saved.image = imageUrl
          // Update image field on the product
          await fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: saved.id, image: imageUrl })
          })
        }
      }

      if (editing) setProducts(prev => prev.map(p => p.id === saved.id ? saved : p))
      else setProducts(prev => [...prev, saved])
      setShowModal(false)
      setImageFile(null)
      setImagePreview('')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('ลบสินค้านี้?')) return
    await fetch(`/api/products?id=${id}`, { method: 'DELETE' })
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  const saveCat = async () => {
    const method = editingCat ? 'PUT' : 'POST'
    const payload = editingCat ? { ...catForm, id: editingCat.id } : catForm
    const res = await fetch('/api/categories', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const saved = await res.json()
    if (editingCat) setCategories(prev => prev.map(c => c.id === saved.id ? saved : c))
    else setCategories(prev => [...prev, saved])
    setShowCatModal(false)
    setEditingCat(null)
    setCatForm({ name: '', icon: '📦', color: '#6B7280' })
  }

  const removeCat = async (id: string) => {
    if (!confirm('ลบหมวดหมู่นี้?')) return
    await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  const openRecipe = async (p: Product) => {
    setRecipeProduct(p)
    const res = await fetch(`/api/recipes?productId=${p.id}`)
    const data = await res.json()
    if (data.recipe?.length > 0) {
      setRecipeItems(data.recipe.map((r: RecipeIngredient) => ({ ingredientId: r.ingredientId, qtyPerUnit: String(r.qtyPerUnit) })))
    } else {
      setRecipeItems([{ ingredientId: '', qtyPerUnit: '' }])
    }
    setRecipeAvailable(data.availableStock ?? null)
    setShowRecipeModal(true)
  }

  const saveRecipe = async () => {
    if (!recipeProduct) return
    const validItems = recipeItems.filter(i => i.ingredientId && Number(i.qtyPerUnit) > 0)
    if (validItems.length === 0) return
    setRecipeSaving(true)
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: recipeProduct.id, items: validItems.map(i => ({ ingredientId: i.ingredientId, qtyPerUnit: Number(i.qtyPerUnit) })) }),
    })
    const data = await res.json()
    setRecipeAvailable(data.availableStock ?? null)
    setRecipeSaving(false)
  }

  const deleteRecipe = async () => {
    if (!recipeProduct || !confirm('ลบสูตรนี้?')) return
    await fetch(`/api/recipes?productId=${recipeProduct.id}`, { method: 'DELETE' })
    setRecipeAvailable(null)
    setRecipeItems([{ ingredientId: '', qtyPerUnit: '' }])
    setShowRecipeModal(false)
  }

  const addRecipeRow = () => setRecipeItems(prev => [...prev, { ingredientId: '', qtyPerUnit: '' }])
  const removeRecipeRow = (idx: number) => setRecipeItems(prev => prev.filter((_, i) => i !== idx))
  const updateRecipeRow = (idx: number, field: 'ingredientId' | 'qtyPerUnit', value: string) =>
    setRecipeItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))

  const fmt = (n: number) => n.toLocaleString('th-TH')

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">สินค้า / เมนู</h1>
          <p className="text-gray-500 text-sm">{products.length} รายการ</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setEditingCat(null); setCatForm({ name: '', icon: '📦', color: '#6B7280' }); setShowCatModal(true) }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm"
          >
            จัดการหมวด
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-medium"
          >
            <Plus size={18} /> เพิ่มสินค้า
          </button>
        </div>
      </div>

      {/* Categories chips */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterCat('all')}
          className={clsx('px-3 py-1.5 rounded-full text-sm font-medium transition-colors', filterCat === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
        >
          ทั้งหมด ({products.length})
        </button>
        {categories.map(c => (
          <div key={c.id} className="flex items-center gap-1 group">
            <button
              onClick={() => setFilterCat(c.id)}
              className={clsx('px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1', filterCat === c.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
            >
              {c.icon} {c.name} ({products.filter(p => p.categoryId === c.id).length})
            </button>
            <button
              onClick={() => { setEditingCat(c); setCatForm({ name: c.name, icon: c.icon, color: c.color }); setShowCatModal(true) }}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-orange-500 transition-opacity"
            >
              <Pencil size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาสินค้า..."
          className="w-full pl-9 pr-3 sm:pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto -mx-3 sm:mx-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">สินค้า</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">หมวด</th>
              <th className="text-left px-4 py-3 hidden lg:table-cell">สถานี</th>
              <th className="text-right px-4 py-3">ราคา</th>
              <th className="text-right px-4 py-3 hidden lg:table-cell">ต้นทุน</th>
              <th className="text-center px-4 py-3 hidden md:table-cell">สต็อก</th>
              <th className="text-center px-4 py-3">สถานะ</th>
              <th className="text-center px-4 py-3">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">ไม่พบสินค้า</td></tr>
            ) : filtered.map(p => {
              const cat = categories.find(c => c.id === p.categoryId)
              return (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-9 h-9 rounded-xl object-cover" loading="lazy" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: (cat?.color || '#888') + '20' }}>
                          {cat?.icon || '📦'}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-800">{p.name}</p>
                        {p.barcode && <p className="text-xs text-gray-400">{p.barcode}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: (cat?.color || '#888') + '20', color: cat?.color || '#888' }}>
                      {cat?.name || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {(() => {
                      const st = stations.find(s => s.id === p.stationId)
                      return st ? (
                        <span className="text-xs px-2 py-1 rounded-full font-medium text-white" style={{ backgroundColor: st.color }}>
                          {st.name}
                        </span>
                      ) : <span className="text-xs text-gray-400">-</span>
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">฿{fmt(p.price)}</td>
                  <td className="px-4 py-3 text-right text-gray-500 hidden lg:table-cell">฿{fmt(p.cost)}</td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {p.trackStock ? (
                      <span className={clsx('text-xs font-medium', p.stock <= 10 ? 'text-red-600' : 'text-gray-600')}>
                        {p.stock}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">ไม่ติดตาม</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx('text-xs px-2 py-1 rounded-full font-medium', p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {p.isActive ? 'เปิดขาย' : 'ปิด'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openRecipe(p)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="สูตร">
                        <BookOpen size={15} />
                      </button>
                      <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => remove(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={15} />
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

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-3 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">{editing ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h3>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="p-3 sm:p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสินค้า *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="ชื่อสินค้า" />
              </div>
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รูปภาพสินค้า</label>
                <div className="flex items-start gap-3">
                  {/* Preview */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-400 flex items-center justify-center cursor-pointer overflow-hidden transition-colors bg-gray-50 shrink-0"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Camera size={20} className="mx-auto text-gray-400" />
                        <span className="text-xs text-gray-400 mt-0.5 block">เพิ่มรูป</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                    >
                      {imagePreview ? 'เปลี่ยนรูป' : 'เลือกรูป'}
                    </button>
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => removeImage(editing?.id)}
                        className="text-sm px-3 py-1.5 ml-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        ลบรูป
                      </button>
                    )}
                    <p className="text-xs text-gray-400 mt-1.5">JPG, PNG, WebP — ย่อขนาดอัตโนมัติ</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ราคาขาย (฿) *</label>
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ต้นทุน (฿)</label>
                  <input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
                <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                  <option value="">-- เลือกหมวด --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  สถานี (Kitchen/Bar) <span className="text-gray-400 font-normal">— ออเดอร์จะส่งไปที่นี่</span>
                </label>
                <select value={form.stationId} onChange={e => setForm({ ...form, stationId: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                  <option value="">-- ไม่ส่งไปครัว --</option>
                  {stations.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">บาร์โค้ด</label>
                <input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="สแกนหรือพิมพ์บาร์โค้ด" />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.trackStock} onChange={e => setForm({ ...form, trackStock: e.target.checked })}
                    className="w-4 h-4 rounded accent-orange-500" />
                  <span className="text-sm text-gray-700">ติดตามสต็อก</span>
                </label>
                {form.trackStock && (
                  <div className="flex-1">
                    <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="จำนวนสต็อก" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded accent-orange-500" />
                  <span className="text-sm text-gray-700">เปิดขาย</span>
                </label>
              </div>
              <button onClick={save} disabled={saving || !form.name || !form.price}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold transition-colors">
                {saving ? 'กำลังบันทึก...' : editing ? 'บันทึกการเปลี่ยนแปลง' : 'เพิ่มสินค้า'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-3 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">{editingCat ? 'แก้ไขหมวด' : 'เพิ่มหมวดหมู่'}</h3>
              <button onClick={() => { setShowCatModal(false); setEditingCat(null) }}><X size={20} /></button>
            </div>
            <div className="p-3 sm:p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อหมวด</label>
                <input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ไอคอน</label>
                <div className="flex flex-wrap gap-2 -mx-1 sm:mx-0">
                  {ICONS.map(icon => (
                    <button key={icon} onClick={() => setCatForm({ ...catForm, icon })}
                      className={clsx('w-9 h-9 rounded-xl text-xl flex items-center justify-center border-2 transition-all',
                        catForm.icon === icon ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300')}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">สี</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button key={color} onClick={() => setCatForm({ ...catForm, color })}
                      className={clsx('w-7 h-7 rounded-full border-2 transition-all', catForm.color === color ? 'border-gray-800 scale-125' : 'border-transparent')}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              {/* Existing categories list */}
              {categories.length > 0 && !editingCat && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">หมวดที่มีอยู่</label>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {categories.map(c => (
                      <div key={c.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 gap-2 sm:gap-0">
                        <span className="text-sm">{c.icon} {c.name}</span>
                        <div className="flex flex-wrap gap-1">
                          <button onClick={() => { setEditingCat(c); setCatForm({ name: c.name, icon: c.icon, color: c.color }) }}
                            className="p-1 text-gray-400 hover:text-orange-500"><Pencil size={13} /></button>
                          <button onClick={() => removeCat(c.id)}
                            className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={saveCat} disabled={!catForm.name}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold transition-colors">
                {editingCat ? 'บันทึก' : 'เพิ่มหมวด'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {showRecipeModal && recipeProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <FlaskConical size={18} /> สูตร: {recipeProduct.name}
                </h3>
                {recipeAvailable !== null && (
                  <p className="text-sm text-orange-600 mt-0.5">
                    ขายได้อีก <span className="font-bold">{recipeAvailable}</span> ชิ้น (จากวัตถุดิบ)
                  </p>
                )}
              </div>
              <button onClick={() => setShowRecipeModal(false)}><X size={20} /></button>
            </div>
            <div className="p-4 sm:p-5 space-y-3">
              {ingredients.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>ยังไม่มีวัตถุดิบ</p>
                  <p className="text-sm mt-1">ไปที่ คลังสินค้า → วัตถุดิบ เพื่อเพิ่มก่อน</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {recipeItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select value={item.ingredientId} onChange={e => updateRecipeRow(idx, 'ingredientId', e.target.value)}
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                          <option value="">-- เลือกวัตถุดิบ --</option>
                          {ingredients.map(ing => (
                            <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                          ))}
                        </select>
                        <div className="relative w-28">
                          <input type="number" value={item.qtyPerUnit} onChange={e => updateRecipeRow(idx, 'qtyPerUnit', e.target.value)}
                            placeholder="จำนวน" step="any" min="0"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-300" />
                          {item.ingredientId && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              {ingredients.find(i => i.id === item.ingredientId)?.unit}
                            </span>
                          )}
                        </div>
                        <button onClick={() => removeRecipeRow(idx)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={addRecipeRow}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-xl font-medium w-full justify-center">
                    <Plus size={14} /> เพิ่มวัตถุดิบ
                  </button>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setShowRecipeModal(false)}
                      className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">ปิด</button>
                    <button onClick={deleteRecipe}
                      className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50">ลบสูตร</button>
                    <button onClick={saveRecipe} disabled={recipeSaving || recipeItems.every(i => !i.ingredientId || !i.qtyPerUnit)}
                      className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50">
                      {recipeSaving ? 'กำลังบันทึก...' : 'บันทึกสูตร'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
