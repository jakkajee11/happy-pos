'use client'
import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Tag, ToggleLeft, ToggleRight } from 'lucide-react'
import clsx from 'clsx'
import { Promotion } from '@/lib/db'

interface Props { initialPromotions: Promotion[] }

const empty = { name: '', type: 'percent', value: '', minAmount: '', maxDiscount: '', buyQty: '2', freeQty: '1', isActive: true, code: '', startDate: '', endDate: '' }

export default function PromotionsClient({ initialPromotions }: Props) {
  const [promos, setPromos] = useState(initialPromotions)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [form, setForm] = useState<any>(empty)
  const [saving, setSaving] = useState(false)

  const openNew = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit = (p: Promotion) => {
    setEditing(p)
    setForm({ name: p.name, type: p.type, value: p.value, minAmount: p.minAmount, maxDiscount: p.maxDiscount || '', buyQty: p.buyQty ?? 2, freeQty: p.freeQty ?? 1, isActive: p.isActive, code: p.code || '', startDate: p.startDate?.slice(0, 10) || '', endDate: p.endDate?.slice(0, 10) || '' })
    setShowModal(true)
  }

  const save = async () => {
    setSaving(true)
    const method = editing ? 'PUT' : 'POST'
    const payload = editing
      ? { ...form, id: editing.id, buyQty: Number(form.buyQty) || undefined, freeQty: Number(form.freeQty) || undefined }
      : { ...form, buyQty: Number(form.buyQty) || undefined, freeQty: Number(form.freeQty) || undefined }
    const res = await fetch('/api/promotions', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const saved = await res.json()
    if (editing) setPromos(prev => prev.map(p => p.id === saved.id ? saved : p))
    else setPromos(prev => [...prev, saved])
    setShowModal(false); setSaving(false)
  }

  const remove = async (id: string) => {
    if (!confirm('ลบโปรโมชั่นนี้?')) return
    await fetch(`/api/promotions?id=${id}`, { method: 'DELETE' })
    setPromos(prev => prev.filter(p => p.id !== id))
  }

  const toggle = async (p: Promotion) => {
    const res = await fetch('/api/promotions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, isActive: !p.isActive }) })
    const saved = await res.json()
    setPromos(prev => prev.map(x => x.id === saved.id ? saved : x))
  }

  const fmt = (n: number) => n.toLocaleString('th-TH')
  const typeLabel = { percent: 'ลด %', amount: 'ลดราคา', buy_x_get_y: 'ซื้อแถม' }
  const typeColor = { percent: 'bg-purple-100 text-purple-700', amount: 'bg-blue-100 text-blue-700', buy_x_get_y: 'bg-green-100 text-green-700' }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">โปรโมชั่น & ส่วนลด</h1>
          <p className="text-gray-500 text-sm">{promos.length} รายการ · เปิดใช้ {promos.filter(p => p.isActive).length} รายการ</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-medium">
          <Plus size={18} /> เพิ่มโปรโมชั่น
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {promos.length === 0 ? (
          <div className="col-span-3 text-center text-gray-400 py-16">
            <Tag size={40} className="mx-auto mb-3 opacity-30" />
            <p>ยังไม่มีโปรโมชั่น</p>
            <p className="text-sm mt-1">กดปุ่ม "เพิ่มโปรโมชั่น" เพื่อสร้างใหม่</p>
          </div>
        ) : promos.map(p => (
          <div key={p.id} className={clsx('bg-white rounded-2xl p-3 sm:p-5 shadow-sm border transition-all', p.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60')}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Tag size={16} className="text-orange-500" />
                </div>
                <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', typeColor[p.type as keyof typeof typeColor])}>
                  {typeLabel[p.type as keyof typeof typeLabel]}
                </span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggle(p)} className={clsx('transition-colors', p.isActive ? 'text-green-500' : 'text-gray-300')}>
                  {p.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
                <button onClick={() => openEdit(p)} className="p-1 text-gray-400 hover:text-orange-500"><Pencil size={14} /></button>
                <button onClick={() => remove(p.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>

            <h3 className="font-semibold text-gray-800 mb-1">{p.name}</h3>

            <div className="text-3xl font-bold text-orange-500 mb-2">
              {p.type === 'percent' ? `-${p.value}%` : p.type === 'amount' ? `-฿${fmt(p.value)}` : `ซื้อ${p.buyQty ?? 2}แถม${p.freeQty ?? 1}`}
            </div>

            <div className="space-y-1 text-xs text-gray-500">
              {p.minAmount > 0 && <p>ขั้นต่ำ ฿{fmt(p.minAmount)}</p>}
              {p.maxDiscount && <p>ลดสูงสุด ฿{fmt(p.maxDiscount)}</p>}
              {p.code && <p>โค้ด: <span className="font-mono font-bold text-gray-700 bg-gray-100 px-1 rounded">{p.code}</span></p>}
              {p.endDate && <p>ถึง {new Date(p.endDate).toLocaleDateString('th-TH')}</p>}
            </div>

            <div className={clsx('mt-3 text-xs font-medium', p.isActive ? 'text-green-600' : 'text-gray-400')}>
              {p.isActive ? '✓ เปิดใช้งาน' : '✗ ปิดใช้งาน'}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-3 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">{editing ? 'แก้ไขโปรโมชั่น' : 'เพิ่มโปรโมชั่น'}</h3>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="p-3 sm:p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโปรโมชั่น *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="เช่น ลด 10% ทุกออเดอร์" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทส่วนลด</label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {[{ v: 'percent', l: 'ลด %' }, { v: 'amount', l: 'ลดราคา (฿)' }, { v: 'buy_x_get_y', l: 'ซื้อแถม' }].map(t => (
                    <button key={t.v} onClick={() => setForm({ ...form, type: t.v })}
                      className={clsx('py-2 rounded-xl text-xs sm:text-sm font-medium border-2 transition-all',
                        form.type === t.v ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600')}>
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>
              {form.type === 'buy_x_get_y' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ซื้อกี่ชิ้น (X)</label>
                    <input type="number" min="1" value={form.buyQty} onChange={e => setForm({ ...form, buyQty: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ได้ฟรีกี่ชิ้น (Y)</label>
                    <input type="number" min="1" value={form.freeQty} onChange={e => setForm({ ...form, freeQty: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="1" />
                  </div>
                  <div className="col-span-2 text-xs text-gray-500 bg-green-50 rounded-lg px-3 py-2">
                    💡 เช่น ซื้อ {form.buyQty || 2} แถม {form.freeQty || 1} — ชิ้นที่ถูกสุดจะได้ฟรี (ทุก {Number(form.buyQty || 2) + Number(form.freeQty || 1)} ชิ้น)
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {form.type === 'percent' ? 'ลด (%)' : 'ลดราคา (฿)'}
                    </label>
                    <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="0" />
                  </div>
                  {form.type === 'percent' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ลดสูงสุด (฿)</label>
                      <input type="number" value={form.maxDiscount} onChange={e => setForm({ ...form, maxDiscount: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="ไม่จำกัด" />
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ยอดขั้นต่ำ (฿)</label>
                <input type="number" value={form.minAmount} onChange={e => setForm({ ...form, minAmount: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="0 = ไม่มีขั้นต่ำ" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">โค้ดส่วนลด (ถ้ามี)</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="SAVE20" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันเริ่ม</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันสิ้นสุด</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 accent-orange-500" />
                <label htmlFor="isActive" className="text-sm text-gray-700">เปิดใช้งาน</label>
              </div>
              <button onClick={save} disabled={saving || !form.name}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white rounded-xl font-semibold transition-colors">
                {saving ? 'กำลังบันทึก...' : editing ? 'บันทึก' : 'เพิ่มโปรโมชั่น'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
