'use client'
import { useState, useEffect, useRef } from 'react'
import { Save, Store, Receipt, Star, Bell, Printer, CheckCircle, ChefHat, Plus, Pencil, Trash2, X, Wifi, Usb, Bluetooth, Palette, QrCode } from 'lucide-react'
import clsx from 'clsx'
import dynamic from 'next/dynamic'
import { Settings, Station, Printer as PrinterType } from '@/lib/db'
import { THEME_PRESETS, generateThemeCSS, getThemePreset, getThemeVariables } from '@/lib/themes'

const QRCodeCanvas = dynamic(() => import('qrcode').then(mod => {
  // Return a wrapper component that uses qrcode to render a canvas
  return function QRCanvas({ value, size }: { value: string; size: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    useEffect(() => {
      if (canvasRef.current) {
        mod.toCanvas(canvasRef.current, value, { width: size, margin: 1 })
      }
    }, [value, size])
    return <canvas ref={canvasRef} />
  }
}), { ssr: false })

interface Props {
  initialSettings: Settings
  initialStations: Station[]
  initialPrinters: PrinterType[]
}

const TABS = [
  { id: 'shop', label: 'ร้านค้า', icon: Store },
  { id: 'receipt', label: 'ใบเสร็จ', icon: Receipt },
  { id: 'stations', label: 'สถานี', icon: ChefHat },
  { id: 'printers', label: 'เครื่องพิมพ์', icon: Printer },
  { id: 'qrmenu', label: 'QR เมนู', icon: QrCode },
  { id: 'theme', label: 'ธีม', icon: Palette },
  { id: 'loyalty', label: 'แต้มสะสม', icon: Star },
  { id: 'system', label: 'ระบบ', icon: Bell },
]

const STATION_COLORS = ['#ef4444','#f97316','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#6b7280']

const emptyStation = { name: '', color: '#ef4444', printerId: '' }
const emptyPrinter = { name: '', type: 'general', connectionType: 'browser', ipAddress: '', port: '9100', paperWidth: '80', isDefault: false }

export default function SettingsClient({ initialSettings, initialStations, initialPrinters }: Props) {
  const [settings, setSettings] = useState(initialSettings)
  const [stations, setStations] = useState(initialStations)
  const [printers, setPrinters] = useState(initialPrinters)
  const [tab, setTab] = useState('shop')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Station state
  const [showStationModal, setShowStationModal] = useState(false)
  const [editingStation, setEditingStation] = useState<Station | null>(null)
  const [stationForm, setStationForm] = useState<any>(emptyStation)

  // Printer state
  const [showPrinterModal, setShowPrinterModal] = useState(false)
  const [editingPrinter, setEditingPrinter] = useState<PrinterType | null>(null)
  const [printerForm, setPrinterForm] = useState<any>(emptyPrinter)

  // Theme state
  const [themeId, setThemeId] = useState(initialSettings.themeId ?? 'orange-classic')
  const [customColor, setCustomColor] = useState(initialSettings.customPrimaryColor ?? '#f97316')

  const applyThemeLive = (id: string, color?: string) => {
    const theme = getThemePreset(id, color)
    // 1. Update CSS variables on :root immediately — browser repaints all elements
    //    referencing var(--hp-*) without touching the stylesheet
    const vars = getThemeVariables(theme, color)
    const root = document.documentElement
    Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value))
    // 2. Also update the <style> element for dark/light sidebar section
    const el = document.getElementById('happy-pos-theme')
    if (el) el.textContent = generateThemeCSS(theme, color)
  }

  const selectTheme = (id: string) => {
    setThemeId(id)
    setSettings(prev => ({ ...prev, themeId: id, customPrimaryColor: undefined }))
    applyThemeLive(id)
  }

  const selectCustomColor = (color: string) => {
    setCustomColor(color)
    setThemeId('custom')
    setSettings(prev => ({ ...prev, themeId: 'custom', customPrimaryColor: color }))
    applyThemeLive('custom', color)
  }

  const save = async () => {
    setSaving(true)
    const payload = { ...settings, themeId, customPrimaryColor: themeId === 'custom' ? customColor : undefined }
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Station CRUD
  const saveStation = async () => {
    const method = editingStation ? 'PUT' : 'POST'
    const payload = editingStation ? { ...stationForm, id: editingStation.id } : stationForm
    const res = await fetch('/api/stations', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const saved = await res.json()
    if (editingStation) setStations(prev => prev.map(s => s.id === saved.id ? saved : s))
    else setStations(prev => [...prev, saved])
    setShowStationModal(false); setEditingStation(null); setStationForm(emptyStation)
  }
  const deleteStation = async (id: string) => {
    if (!confirm('ลบสถานีนี้?')) return
    await fetch(`/api/stations?id=${id}`, { method: 'DELETE' })
    setStations(prev => prev.filter(s => s.id !== id))
  }
  const toggleStation = async (station: Station) => {
    const updated = { ...station, isActive: !station.isActive }
    await fetch('/api/stations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
    setStations(prev => prev.map(s => s.id === station.id ? updated : s))
  }

  // Printer CRUD
  const savePrinter = async () => {
    const method = editingPrinter ? 'PUT' : 'POST'
    const payload = {
      ...(editingPrinter ? { ...printerForm, id: editingPrinter.id } : printerForm),
      port: printerForm.port ? Number(printerForm.port) : undefined,
      paperWidth: Number(printerForm.paperWidth),
    }
    const res = await fetch('/api/printers', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const saved = await res.json()
    if (editingPrinter) setPrinters(prev => prev.map(p => p.id === saved.id ? saved : p))
    else setPrinters(prev => [...prev, saved])
    setShowPrinterModal(false); setEditingPrinter(null); setPrinterForm(emptyPrinter)
  }
  const deletePrinter = async (id: string) => {
    if (!confirm('ลบเครื่องพิมพ์นี้?')) return
    await fetch(`/api/printers?id=${id}`, { method: 'DELETE' })
    setPrinters(prev => prev.filter(p => p.id !== id))
  }
  const testPrinter = async (printer: PrinterType) => {
    if (printer.connectionType === 'browser') {
      // Test browser print
      const w = window.open('', '_blank', 'width=320,height=400')
      if (w) {
        w.document.write(`<html><body style="font-family:monospace;padding:16px"><h3>TEST PRINT</h3><p>${printer.name}</p><p>${new Date().toLocaleString('th-TH')}</p><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}<\/script></body></html>`)
        w.document.close()
      }
    } else {
      alert(`เครื่องพิมพ์ ${printer.name} (${printer.connectionType}) — รองรับการเชื่อมต่อจริงในเวอร์ชันถัดไป`)
    }
    await fetch('/api/printers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: printer.id, action: 'test' }) })
  }

  const f = (key: keyof Settings) => ({
    value: String(settings[key] ?? ''),
    onChange: (e: any) => setSettings({ ...settings, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' ? Number(e.target.value) : e.target.value })
  })

  // Receipt preview
  const now = new Date()
  const receiptPreview = {
    shopName: settings.shopName,
    address: settings.shopAddress,
    phone: settings.shopPhone,
    taxId: settings.shopTaxId,
    header: settings.receiptHeader,
    footer: settings.receiptFooter,
    items: [{ name: 'ลาเต้', qty: 2, price: 75, total: 150 }, { name: 'เค้กช็อกโกแลต', qty: 1, price: 90, total: 90 }],
    subtotal: 240, discount: 0, total: 240, payment: 'เงินสด', cashReceived: 300, change: 60,
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ตั้งค่าระบบ</h1>
          <p className="text-gray-500 text-sm">ปรับแต่งข้อมูลร้านค้าและการทำงานของระบบ</p>
        </div>
        <button onClick={save} disabled={saving}
          className={clsx('flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all',
            saved ? 'bg-green-500 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white')}>
          {saved ? <><CheckCircle size={18} /> บันทึกแล้ว!</> : saving ? 'กำลังบันทึก...' : <><Save size={18} /> บันทึก</>}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.id ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700')}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'shop' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="font-bold text-gray-800 mb-2">ข้อมูลร้านค้า</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อร้าน</label>
              <input {...f('shopName')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
              <input {...f('shopPhone')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label>
              <textarea {...f('shopAddress')} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เลขประจำตัวผู้เสียภาษี</label>
              <input {...f('shopTaxId')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="ถ้ามี" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                หมายเลข PromptPay
                <span className="ml-2 text-xs font-normal text-gray-400">เบอร์โทร 10 หลัก หรือ เลขนิติบุคคล 13 หลัก</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#003b7a] text-sm">💳</span>
                <input
                  {...f('promptpayId')}
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 font-mono"
                  placeholder="0812345678"
                  maxLength={13}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทธุรกิจ</label>
              <select value={settings.businessType} onChange={e => setSettings({ ...settings, businessType: e.target.value as any })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                <option value="restaurant">ร้านอาหาร / คาเฟ่</option>
                <option value="retail">ร้านค้าปลีก</option>
                <option value="service">บริการ / นวด / สปา</option>
                <option value="general">ทั่วไป</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {tab === 'receipt' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-bold text-gray-800">ตั้งค่าใบเสร็จ</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ข้อความหัวใบเสร็จ</label>
              <input {...f('receiptHeader')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="เช่น ขอบคุณที่ใช้บริการ" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ข้อความท้ายใบเสร็จ</label>
              <textarea {...f('receiptFooter')} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" placeholder="เช่น ยินดีต้อนรับกลับมาเสมอ" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">อัตราภาษี (%)</label>
              <input type="number" {...f('taxRate')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="0 = ไม่มีภาษี" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="showLogo" checked={settings.receiptShowLogo}
                onChange={e => setSettings({ ...settings, receiptShowLogo: e.target.checked })}
                className="w-4 h-4 accent-orange-500" />
              <label htmlFor="showLogo" className="text-sm text-gray-700">แสดงโลโก้บนใบเสร็จ</label>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
              <p className="font-semibold mb-1">💡 การเชื่อมต่อเครื่องพิมพ์ Thermal</p>
              <p>ระบบรองรับการพิมพ์ผ่าน Browser Print Dialog เชื่อมต่อเครื่องพิมพ์ Wi-Fi กับ network เดียวกัน แล้วตั้งเป็น Default Printer บนเครื่อง</p>
            </div>
          </div>

          {/* Receipt Preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Printer size={16} /> ตัวอย่างใบเสร็จ (80mm)
            </h2>
            <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs border max-w-[300px] mx-auto" style={{ fontFamily: "'Courier New', monospace" }}>
              <div className="text-center mb-2">
                <div className="font-bold text-base">{receiptPreview.shopName}</div>
                {receiptPreview.address && <div>{receiptPreview.address}</div>}
                {receiptPreview.phone && <div>โทร: {receiptPreview.phone}</div>}
                {settings.shopTaxId && <div>เลขที่ผู้เสียภาษี: {settings.shopTaxId}</div>}
                {receiptPreview.header && <div className="mt-1">{receiptPreview.header}</div>}
              </div>
              <div className="border-t border-dashed border-gray-400 my-2"></div>
              <div className="flex justify-between"><span>ใบเสร็จ:</span><span className="font-bold">#RCP20260326001</span></div>
              <div className="flex justify-between" suppressHydrationWarning><span>วันที่:</span><span>{now.toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
              <div className="border-t border-dashed border-gray-400 my-2"></div>
              <div className="flex justify-between font-bold"><span>รายการ</span><span>รวม</span></div>
              {receiptPreview.items.map((item, i) => (
                <div key={i}>
                  <div className="truncate">{item.name}</div>
                  <div className="flex justify-between text-gray-500 pl-2">
                    <span>{item.qty} × {item.price}</span>
                    <span>฿{item.total}</span>
                  </div>
                </div>
              ))}
              <div className="border-t border-dashed border-gray-400 my-2"></div>
              <div className="flex justify-between"><span>รวม</span><span>฿{receiptPreview.subtotal}</span></div>
              {settings.taxRate > 0 && <div className="flex justify-between text-gray-500"><span>ภาษี {settings.taxRate}%</span><span>฿{Math.round(receiptPreview.total * settings.taxRate / 100)}</span></div>}
              <div className="border-t-2 border-gray-800 my-1"></div>
              <div className="flex justify-between font-bold text-sm"><span>สุทธิ</span><span>฿{receiptPreview.total}</span></div>
              <div className="flex justify-between mt-1"><span>เงินสด</span><span>฿{receiptPreview.cashReceived}</span></div>
              <div className="flex justify-between"><span>ทอน</span><span>฿{receiptPreview.change}</span></div>
              <div className="border-t border-dashed border-gray-400 my-2"></div>
              <div className="text-center">
                {receiptPreview.footer && <div>{receiptPreview.footer}</div>}
                <div className="text-gray-400 text-xs mt-1">Powered by Happy POS</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- STATIONS TAB ---- */}
      {tab === 'stations' && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800">สถานีครัว / บาร์</h2>
              <p className="text-sm text-gray-500 mt-0.5">กำหนดที่ออเดอร์จะถูกส่งไป เช่น ครัว, บาร์, เบเกอรี่</p>
            </div>
            <button onClick={() => { setEditingStation(null); setStationForm(emptyStation); setShowStationModal(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-medium text-sm">
              <Plus size={16} /> เพิ่มสถานี
            </button>
          </div>

          <div className="space-y-2">
            {stations.length === 0 && (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <ChefHat size={32} className="mx-auto mb-2 opacity-30" />
                <p>ยังไม่มีสถานี</p>
              </div>
            )}
            {stations.map(station => {
              const linkedPrinter = printers.find(p => p.id === station.printerId)
              return (
                <div key={station.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: station.color }}>
                    {station.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{station.name}</p>
                    <p className="text-xs text-gray-400">
                      {linkedPrinter ? `🖨️ ${linkedPrinter.name}` : 'ไม่ได้ผูกเครื่องพิมพ์'}
                    </p>
                  </div>
                  <span className={clsx('text-xs px-2 py-1 rounded-full font-medium', station.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {station.isActive ? 'เปิด' : 'ปิด'}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingStation(station); setStationForm({ name: station.name, color: station.color, printerId: station.printerId || '' }); setShowStationModal(true) }}
                      className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => toggleStation(station)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg text-xs font-medium">
                      {station.isActive ? 'ปิด' : 'เปิด'}
                    </button>
                    <button onClick={() => deleteStation(station.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Station Modal */}
          {showStationModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800">{editingStation ? 'แก้ไขสถานี' : 'เพิ่มสถานีใหม่'}</h3>
                  <button onClick={() => { setShowStationModal(false); setEditingStation(null) }}><X size={20} /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสถานี</label>
                    <input value={stationForm.name} onChange={e => setStationForm({ ...stationForm, name: e.target.value })}
                      placeholder="เช่น ครัว, บาร์, เบเกอรี่"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">สี</label>
                    <div className="flex gap-2 flex-wrap">
                      {STATION_COLORS.map(c => (
                        <button key={c} onClick={() => setStationForm({ ...stationForm, color: c })}
                          className={clsx('w-8 h-8 rounded-full border-2 transition-all', stationForm.color === c ? 'border-gray-800 scale-125' : 'border-transparent')}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">เครื่องพิมพ์ (สำหรับ KOT)</label>
                    <select value={stationForm.printerId} onChange={e => setStationForm({ ...stationForm, printerId: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                      <option value="">-- ไม่ผูกเครื่องพิมพ์ --</option>
                      {printers.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <button onClick={saveStation} disabled={!stationForm.name}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold">
                    {editingStation ? 'บันทึก' : 'เพิ่มสถานี'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- PRINTERS TAB ---- */}
      {tab === 'printers' && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800">เครื่องพิมพ์และอุปกรณ์</h2>
              <p className="text-sm text-gray-500 mt-0.5">จัดการเครื่องพิมพ์ทั้งหมดในระบบ</p>
            </div>
            <button onClick={() => { setEditingPrinter(null); setPrinterForm(emptyPrinter); setShowPrinterModal(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-medium text-sm">
              <Plus size={16} /> เพิ่มเครื่องพิมพ์
            </button>
          </div>

          {/* Connection type guide */}
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 space-y-1">
            <p className="font-semibold">📌 ประเภทการเชื่อมต่อที่รองรับ</p>
            <p><strong>Browser</strong> — พิมพ์ผ่าน Print Dialog ของ browser (รองรับแล้ว)</p>
            <p><strong>Network (TCP/IP)</strong> — ESC/POS ผ่าน IP:Port เช่น 192.168.1.100:9100 (ต้องติดตั้ง print driver)</p>
            <p><strong>USB / Bluetooth</strong> — เตรียมพร้อมสำหรับอนาคต (WebUSB / Web Bluetooth API)</p>
          </div>

          <div className="space-y-2">
            {printers.length === 0 && (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <Printer size={32} className="mx-auto mb-2 opacity-30" />
                <p>ยังไม่มีเครื่องพิมพ์</p>
              </div>
            )}
            {printers.map(printer => (
              <div key={printer.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                  {printer.connectionType === 'network' ? <Wifi size={20} /> :
                   printer.connectionType === 'usb' ? <Usb size={20} /> :
                   printer.connectionType === 'bluetooth' ? <Bluetooth size={20} /> :
                   <Printer size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800">{printer.name}</p>
                    {printer.isDefault && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">Default</span>}
                  </div>
                  <p className="text-xs text-gray-400">
                    {printer.connectionType === 'network' ? `${printer.ipAddress}:${printer.port}` : printer.connectionType}
                    {' · '}{printer.paperWidth}mm
                    {' · '}{printer.type}
                    {printer.lastSeen && ` · ล่าสุด ${new Date(printer.lastSeen).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
                <span className={clsx('text-xs px-2 py-1 rounded-full font-medium', printer.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                  {printer.isActive ? 'เปิด' : 'ปิด'}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => testPrinter(printer)}
                    className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium">
                    ทดสอบ
                  </button>
                  <button onClick={() => { setEditingPrinter(printer); setPrinterForm({ name: printer.name, type: printer.type, connectionType: printer.connectionType, ipAddress: printer.ipAddress || '', port: String(printer.port || 9100), paperWidth: String(printer.paperWidth), isDefault: printer.isDefault }); setShowPrinterModal(true) }}
                    className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deletePrinter(printer.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Printer Modal */}
          {showPrinterModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800">{editingPrinter ? 'แก้ไขเครื่องพิมพ์' : 'เพิ่มเครื่องพิมพ์'}</h3>
                  <button onClick={() => { setShowPrinterModal(false); setEditingPrinter(null) }}><X size={20} /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อเครื่องพิมพ์</label>
                    <input value={printerForm.name} onChange={e => setPrinterForm({ ...printerForm, name: e.target.value })}
                      placeholder="เช่น เครื่องพิมพ์ครัว"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                      <select value={printerForm.type} onChange={e => setPrinterForm({ ...printerForm, type: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                        <option value="receipt">ใบเสร็จ</option>
                        <option value="kot">KOT ครัว</option>
                        <option value="label">ป้ายสินค้า</option>
                        <option value="general">ทั่วไป</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">กระดาษ (mm)</label>
                      <select value={printerForm.paperWidth} onChange={e => setPrinterForm({ ...printerForm, paperWidth: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                        <option value="80">80mm</option>
                        <option value="58">58mm</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">วิธีเชื่อมต่อ</label>
                    <select value={printerForm.connectionType} onChange={e => setPrinterForm({ ...printerForm, connectionType: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                      <option value="browser">Browser Print (ใช้งานได้เลย)</option>
                      <option value="network">Network / Wi-Fi (IP:Port)</option>
                      <option value="usb">USB (รองรับในอนาคต)</option>
                      <option value="bluetooth">Bluetooth (รองรับในอนาคต)</option>
                    </select>
                  </div>
                  {printerForm.connectionType === 'network' && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                        <input value={printerForm.ipAddress} onChange={e => setPrinterForm({ ...printerForm, ipAddress: e.target.value })}
                          placeholder="192.168.1.100"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                        <input value={printerForm.port} onChange={e => setPrinterForm({ ...printerForm, port: e.target.value })}
                          placeholder="9100"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                      </div>
                    </div>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={printerForm.isDefault} onChange={e => setPrinterForm({ ...printerForm, isDefault: e.target.checked })}
                      className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">ตั้งเป็น Default Printer</span>
                  </label>
                  <button onClick={savePrinter} disabled={!printerForm.name}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold">
                    {editingPrinter ? 'บันทึก' : 'เพิ่มเครื่องพิมพ์'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- QR MENU TAB ---- */}
      {tab === 'qrmenu' && (
        <QRMenuTab settings={settings} />
      )}

      {/* ---- THEME TAB ---- */}
      {tab === 'theme' && (
        <div className="space-y-6 max-w-2xl">
          <div>
            <h2 className="font-bold text-gray-800 mb-1">เลือกธีมสี</h2>
            <p className="text-sm text-gray-500">เปลี่ยนสีหลักของระบบ — มีผลทันทีหลังกดบันทึก</p>
          </div>

          {/* Preset Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEME_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => selectTheme(preset.id)}
                className={clsx(
                  'relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center',
                  themeId === preset.id
                    ? 'border-gray-800 shadow-lg scale-[1.02]'
                    : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
                )}
              >
                {themeId === preset.id && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center">
                    <CheckCircle size={12} className="text-white" />
                  </span>
                )}
                {/* Color swatch */}
                <div className="flex gap-1">
                  <div className="w-8 h-8 rounded-full border border-white shadow-sm" style={{ backgroundColor: preset.primary }} />
                  {preset.sidebarDark && (
                    <div className="w-8 h-8 rounded-full border border-white shadow-sm" style={{ backgroundColor: preset.sidebarBg ?? '#1e293b' }} />
                  )}
                </div>
                <span className="text-lg">{preset.emoji}</span>
                <span className="text-xs font-medium text-gray-700 leading-tight">{preset.name}</span>
              </button>
            ))}

            {/* Custom color card */}
            <button
              onClick={() => {
                setThemeId('custom')
                setSettings(prev => ({ ...prev, themeId: 'custom', customPrimaryColor: customColor }))
                applyThemeLive('custom', customColor)
              }}
              className={clsx(
                'relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center',
                themeId === 'custom'
                  ? 'border-gray-800 shadow-lg scale-[1.02]'
                  : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
              )}
            >
              {themeId === 'custom' && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center">
                  <CheckCircle size={12} className="text-white" />
                </span>
              )}
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full" style={{ backgroundColor: customColor }} />
              </div>
              <span className="text-lg">🎨</span>
              <span className="text-xs font-medium text-gray-700">กำหนดเอง</span>
            </button>
          </div>

          {/* Custom color picker */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Palette size={16} /> ปรับสีเอง
            </h3>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={customColor}
                onChange={e => selectCustomColor(e.target.value)}
                className="w-14 h-14 rounded-xl cursor-pointer border border-gray-200 p-1"
              />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">เลือกสีที่ต้องการ แล้วกด <strong>บันทึก</strong> เพื่อใช้งาน</p>
                <div className="flex gap-2 flex-wrap mt-2">
                  {['#f97316','#3b82f6','#10b981','#8b5cf6','#ec4899','#ef4444','#f59e0b','#14b8a6','#6366f1','#84cc16'].map(c => (
                    <button key={c} onClick={() => selectCustomColor(c)}
                      className={clsx('w-7 h-7 rounded-full border-2 transition-all', customColor === c && themeId === 'custom' ? 'border-gray-800 scale-125' : 'border-transparent hover:border-gray-400')}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-3">ตัวอย่าง</h3>
            <div className="flex gap-2 flex-wrap">
              <button className="px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: (themeId === 'custom' ? customColor : (THEME_PRESETS.find(p => p.id === themeId)?.primary ?? '#f97316')) }}>
                ปุ่มหลัก
              </button>
              <button className="px-4 py-2 rounded-xl text-sm font-medium border" style={{ borderColor: (themeId === 'custom' ? customColor : (THEME_PRESETS.find(p => p.id === themeId)?.primaryBorder ?? '#fdba74')), color: (themeId === 'custom' ? customColor : (THEME_PRESETS.find(p => p.id === themeId)?.primaryText ?? '#ea580c')) }}>
                ปุ่มรอง
              </button>
              <span className="px-3 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: (themeId === 'custom' ? customColor + '20' : (THEME_PRESETS.find(p => p.id === themeId)?.primaryLight ?? '#fff7ed')), color: (themeId === 'custom' ? customColor : (THEME_PRESETS.find(p => p.id === themeId)?.primaryText ?? '#ea580c')) }}>
                Badge / Tag
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              ธีมปัจจุบัน: <strong>{themeId === 'custom' ? `กำหนดเอง (${customColor})` : (() => { const p = THEME_PRESETS.find(x => x.id === themeId); return p ? `${p.emoji} ${p.name}` : themeId })()}</strong>
            </p>
          </div>
        </div>
      )}

      {tab === 'loyalty' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-lg space-y-4">
          <h2 className="font-bold text-gray-800">ระบบแต้มสะสม</h2>
          <div className="bg-orange-50 rounded-xl p-3 text-sm text-orange-700 mb-2">
            ลูกค้าจะได้รับ 1 แต้มทุกการใช้จ่าย {settings.pointsPerBaht} บาท และ {settings.pointsPerBaht} แต้ม มีมูลค่า ฿{settings.pointsValue}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สะสม 1 แต้ม ทุก (บาท)</label>
            <input type="number" value={settings.pointsPerBaht} onChange={e => setSettings({ ...settings, pointsPerBaht: Number(e.target.value) })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">มูลค่าแต้ม (฿ ต่อ แต้ม)</label>
            <input type="number" value={settings.pointsValue} onChange={e => setSettings({ ...settings, pointsValue: Number(e.target.value) })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div className="p-4 bg-gray-50 rounded-xl text-sm space-y-1">
            <p className="font-medium text-gray-700">ตัวอย่าง:</p>
            <p className="text-gray-600">ซื้อ ฿1,000 → ได้ {Math.floor(1000 / settings.pointsPerBaht)} แต้ม</p>
            <p className="text-gray-600">สะสม 100 แต้ม → มูลค่า ฿{100 * settings.pointsValue}</p>
          </div>
        </div>
      )}

      {tab === 'system' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-lg space-y-4">
          <h2 className="font-bold text-gray-800">การตั้งค่าระบบ</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">แจ้งเตือนเมื่อสต็อกเหลือน้อยกว่า</label>
            <div className="flex items-center gap-2">
              <input type="number" value={settings.lowStockAlert} onChange={e => setSettings({ ...settings, lowStockAlert: Number(e.target.value) })}
                className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              <span className="text-sm text-gray-500">ชิ้น</span>
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 space-y-2 text-sm text-blue-800">
            <p className="font-semibold">🌐 การเข้าถึงจากมือถือ</p>
            <p>เปิด browser บนมือถือในเครือข่าย Wi-Fi เดียวกัน และพิมพ์:</p>
            <p className="font-mono bg-white px-3 py-1.5 rounded-lg border border-blue-200 text-blue-900">http://&lt;IP เครื่องที่รัน&gt;:3000</p>
            <p className="text-xs text-blue-600">หาก IP ไม่ทราบ: เปิด Terminal แล้วพิมพ์ <code className="bg-white px-1 rounded">ipconfig</code> (Windows) หรือ <code className="bg-white px-1 rounded">ifconfig</code> (Mac/Linux)</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <p className="font-semibold text-gray-700 mb-2">📦 ข้อมูลระบบ</p>
            <p>ข้อมูลถูกบันทึกในโฟลเดอร์ <code className="bg-gray-200 px-1 rounded">data/</code> ของโปรเจกต์</p>
            <p className="mt-1 text-xs">สำรองข้อมูลได้โดยการ copy โฟลเดอร์ <code className="bg-gray-200 px-1 rounded">data/</code></p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── QR Menu Tab ─────────────────────────────────────────────────────────────
function QRMenuTab({ settings }: { settings: Settings }) {
  const [tableCount, setTableCount] = useState(10)
  const [selectedTable, setSelectedTable] = useState<string | null>('1')
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const menuUrl = (table: string) =>
    `${origin}/menu?table=${encodeURIComponent(table)}`

  const printTableQR = (table: string) => {
    const url = menuUrl(table)
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @page { size: A6; margin: 8mm; }
  body { font-family: sans-serif; text-align: center; padding: 16px; }
  .shop { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
  .table { font-size: 32px; font-weight: 900; margin: 8px 0; }
  .sub { font-size: 12px; color: #666; margin-top: 8px; }
  canvas { margin: 8px auto; display: block; }
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"><\/script>
</head><body>
<div class="shop">${settings.shopName}</div>
<div class="table">โต๊ะ ${table}</div>
<div id="qr"></div>
<div class="sub">สแกน QR เพื่อดูเมนูและสั่งอาหาร</div>
<div class="sub" style="font-size:10px;color:#aaa;margin-top:4px">${url}</div>
<script>
  var qr = qrcode(0, 'M');
  qr.addData('${url}');
  qr.make();
  document.getElementById('qr').innerHTML = qr.createImgTag(5,8);
  window.onload=()=>{window.print();setTimeout(()=>window.close(),800)}
<\/script>
</body></html>`
    const w = window.open('', '_blank', 'width=400,height=500')
    if (w) { w.document.write(html); w.document.close() }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-bold text-gray-800 mb-1">QR Code เมนูสำหรับลูกค้า</h2>
        <p className="text-sm text-gray-500 mb-5">
          ลูกค้าสแกน QR → ดูเมนูบนมือถือ → สั่งตรงเข้าระบบ (ปรากฏใน <strong>ออเดอร์</strong>)
        </p>

        {/* URL preview */}
        <div className="bg-blue-50 rounded-xl p-3 mb-5">
          <p className="text-xs text-blue-600 font-medium mb-1">URL เมนูของคุณ</p>
          <p className="font-mono text-sm text-blue-800 break-all">{origin}/menu?table=<span className="text-orange-600">[หมายเลขโต๊ะ]</span></p>
        </div>

        {/* Table count */}
        <div className="flex items-center gap-4 mb-5">
          <label className="text-sm font-medium text-gray-700">จำนวนโต๊ะ</label>
          <div className="flex items-center gap-2">
            <button onClick={() => setTableCount(Math.max(1, tableCount - 1))} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-600">−</button>
            <span className="w-10 text-center font-bold text-gray-800">{tableCount}</span>
            <button onClick={() => setTableCount(Math.min(50, tableCount + 1))} className="w-8 h-8 rounded-lg bg-orange-100 hover:bg-orange-200 font-bold text-orange-600">+</button>
          </div>
        </div>

        {/* Table grid */}
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 mb-5">
          {Array.from({ length: tableCount }, (_, i) => String(i + 1)).map(t => (
            <button
              key={t}
              onClick={() => setSelectedTable(t)}
              className={clsx(
                'aspect-square rounded-xl text-sm font-bold border-2 transition-all',
                selectedTable === t
                  ? 'border-orange-500 bg-orange-500 text-white'
                  : 'border-gray-200 hover:border-orange-300 text-gray-700'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Selected table QR */}
        {selectedTable && origin && (
          <div className="border-2 border-orange-200 rounded-2xl p-5 bg-orange-50 flex flex-col sm:flex-row items-center gap-5">
            <div className="bg-white p-3 rounded-xl shadow-sm">
              <QRCodeCanvas value={menuUrl(selectedTable)} size={160} />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-2xl font-black text-gray-800 mb-1">โต๊ะ {selectedTable}</p>
              <p className="text-xs font-mono text-gray-500 break-all mb-3">{menuUrl(selectedTable)}</p>
              <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                <button
                  onClick={() => printTableQR(selectedTable)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900"
                >
                  🖨️ พิมพ์ QR โต๊ะ {selectedTable}
                </button>
                <a
                  href={menuUrl(selectedTable)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 border border-orange-300 text-orange-600 rounded-xl text-sm font-medium hover:bg-orange-50"
                >
                  🔗 เปิดเมนู
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Print all button */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-2">พิมพ์ QR ทั้งหมด</h3>
        <p className="text-sm text-gray-500 mb-3">พิมพ์ QR code สำหรับทุกโต๊ะในครั้งเดียว</p>
        <button
          onClick={() => {
            for (let i = 1; i <= tableCount; i++) {
              setTimeout(() => printTableQR(String(i)), (i - 1) * 600)
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600"
        >
          🖨️ พิมพ์ QR โต๊ะ 1–{tableCount} ทั้งหมด
        </button>
      </div>
    </div>
  )
}
