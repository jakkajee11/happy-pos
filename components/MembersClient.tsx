'use client'
import { useState } from 'react'
import { Plus, Search, Pencil, Trash2, X, Star, Phone, Mail } from 'lucide-react'
import clsx from 'clsx'
import { Member, Settings } from '@/lib/db'

interface Props { initialMembers: Member[]; settings: Settings }

const empty = { name: '', phone: '', email: '', notes: '' }

export default function MembersClient({ initialMembers, settings }: Props) {
  const [members, setMembers] = useState(initialMembers)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Member | null>(null)

  const filtered = members.filter(m => !search || m.name.includes(search) || m.phone.includes(search) || m.email?.includes(search))

  const openNew = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit = (m: Member) => { setEditing(m); setForm({ name: m.name, phone: m.phone, email: m.email || '', notes: m.notes || '' }); setShowModal(true) }

  const save = async () => {
    setSaving(true)
    const method = editing ? 'PUT' : 'POST'
    const payload = editing ? { ...form, id: editing.id } : form
    const res = await fetch('/api/members', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) { const err = await res.json(); alert(err.error); setSaving(false); return }
    const saved = await res.json()
    if (editing) setMembers(prev => prev.map(m => m.id === saved.id ? saved : m))
    else setMembers(prev => [...prev, saved])
    setShowModal(false)
    setSaving(false)
  }

  const remove = async (id: string) => {
    if (!confirm('ลบสมาชิกนี้?')) return
    await fetch(`/api/members?id=${id}`, { method: 'DELETE' })
    setMembers(prev => prev.filter(m => m.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const fmt = (n: number) => n.toLocaleString('th-TH')
  const tierLabel = (spent: number) => spent >= 10000 ? { label: 'Gold', color: 'text-yellow-600 bg-yellow-50' } : spent >= 3000 ? { label: 'Silver', color: 'text-gray-600 bg-gray-100' } : { label: 'Bronze', color: 'text-orange-600 bg-orange-50' }

  return (
    <div className="p-6 flex gap-4">
      {/* Left: Member List */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">สมาชิก</h1>
            <p className="text-gray-500 text-sm">{members.length} คน</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-medium">
            <Plus size={18} /> เพิ่มสมาชิก
          </button>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ หรือเบอร์โทร..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.length === 0 ? (
            <div className="col-span-2 text-center text-gray-400 py-12">ไม่พบสมาชิก</div>
          ) : filtered.map(m => {
            const tier = tierLabel(m.totalSpent)
            return (
              <div
                key={m.id}
                onClick={() => setSelected(m)}
                className={clsx('bg-white rounded-2xl p-4 shadow-sm border cursor-pointer transition-all hover:border-orange-300 hover:shadow-md',
                  selected?.id === m.id ? 'border-orange-400 bg-orange-50' : 'border-gray-100')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600 text-lg">
                      {m.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800">{m.name}</p>
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', tier.color)}>{tier.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone size={11} /> {m.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={e => { e.stopPropagation(); openEdit(m) }} className="p-1.5 text-gray-400 hover:text-orange-500 rounded-lg"><Pencil size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); remove(m.id) }} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-xs text-gray-400">แต้มสะสม</p>
                    <p className="font-bold text-orange-600">{fmt(m.points)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">ยอดใช้จ่าย</p>
                    <p className="font-bold text-gray-800">฿{fmt(m.totalSpent)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">เป็นสมาชิก</p>
                    <p className="text-xs text-gray-600">{new Date(m.joinedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right: Member Detail */}
      {selected && (
        <div className="w-72 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600 text-2xl mx-auto mb-2">
                {selected.name[0]}
              </div>
              <h3 className="font-bold text-gray-800 text-lg">{selected.name}</h3>
              <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', tierLabel(selected.totalSpent).color)}>
                {tierLabel(selected.totalSpent).label} Member
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={14} className="text-gray-400" /> {selected.phone}
              </div>
              {selected.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail size={14} className="text-gray-400" /> {selected.email}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                  <Star size={14} />
                  <span className="text-xs">แต้มสะสม</span>
                </div>
                <p className="text-2xl font-bold text-orange-600">{fmt(selected.points)}</p>
                <p className="text-xs text-orange-400">= ฿{fmt(Math.floor(selected.points / settings.pointsPerBaht * settings.pointsValue))}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">ยอดใช้จ่าย</p>
                <p className="text-xl font-bold text-gray-800">฿{fmt(selected.totalSpent)}</p>
              </div>
            </div>

            {selected.notes && (
              <div className="mt-3 bg-yellow-50 rounded-xl p-3 text-xs text-yellow-700">
                📝 {selected.notes}
              </div>
            )}

            <div className="mt-4 text-xs text-gray-400 text-center">
              สมาชิกตั้งแต่ {new Date(selected.joinedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>

            <button onClick={() => setSelected(null)} className="mt-4 w-full py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-xl">ปิด</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">{editing ? 'แก้ไขสมาชิก' : 'เพิ่มสมาชิกใหม่'}</h3>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'ชื่อ-นามสกุล *', key: 'name', placeholder: 'ชื่อสมาชิก' },
                { label: 'เบอร์โทร *', key: 'phone', placeholder: '08x-xxx-xxxx' },
                { label: 'อีเมล', key: 'email', placeholder: 'email@example.com' },
                { label: 'หมายเหตุ', key: 'notes', placeholder: 'บันทึกเพิ่มเติม' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
              ))}
              <button onClick={save} disabled={saving || !form.name || !form.phone}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white rounded-xl font-semibold transition-colors">
                {saving ? 'กำลังบันทึก...' : editing ? 'บันทึก' : 'เพิ่มสมาชิก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
