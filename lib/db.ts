import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readJson<T>(filename: string, defaultValue: T): T {
  const filePath = path.join(DATA_DIR, filename)
  try {
    if (!fs.existsSync(filePath)) {
      writeJson(filename, defaultValue)
      return defaultValue
    }
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return defaultValue
  }
}

function writeJson<T>(filename: string, data: T): void {
  const filePath = path.join(DATA_DIR, filename)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// --- Types ---
export interface Category {
  id: string
  name: string
  icon: string
  color: string
  createdAt: string
}

export interface Product {
  id: string
  name: string
  price: number
  cost: number
  categoryId: string
  stationId?: string   // Kitchen station this product routes to
  stock: number
  trackStock: boolean
  barcode?: string
  image?: string
  isActive: boolean
  createdAt: string
}

export interface Station {
  id: string
  name: string        // e.g. ครัว, บาร์, เบเกอรี่
  color: string       // badge color
  printerId?: string  // linked printer for KOT (optional)
  isActive: boolean
  createdAt: string
}

// ---- Printer / Device Registry ----
// Designed to support: browser print (now), network IP, USB, Bluetooth (future)
export type PrinterConnectionType = 'browser' | 'network' | 'usb' | 'bluetooth'
export type PrinterType = 'receipt' | 'kot' | 'label' | 'general'

export interface Printer {
  id: string
  name: string                          // display name e.g. "เครื่องพิมพ์ครัว"
  type: PrinterType                     // what it's used for
  connectionType: PrinterConnectionType // current connection method
  ipAddress?: string                    // for network printers (TCP/IP)
  port?: number                         // default 9100 for ESC/POS over TCP
  usbVendorId?: string                  // for USB printers (future WebUSB)
  bluetoothAddress?: string             // for BT printers (future Web Bluetooth)
  paperWidth: 58 | 80                   // mm — 58mm or 80mm thermal paper
  isDefault: boolean                    // default receipt printer
  isActive: boolean
  lastSeen?: string                     // ISO timestamp of last successful print
  createdAt: string
}

export interface KitchenOrderItem {
  productId: string
  productName: string
  qty: number
  note?: string
}

export interface KitchenOrder {
  id: string
  saleId: string
  receiptNo: string
  stationId: string
  stationName: string
  tableNo?: string
  items: KitchenOrderItem[]
  status: 'pending' | 'preparing' | 'ready' | 'done'
  note?: string
  createdAt: string
  updatedAt: string
}

export interface Member {
  id: string
  name: string
  phone: string
  email?: string
  points: number
  totalSpent: number
  joinedAt: string
  notes?: string
}

export interface Promotion {
  id: string
  name: string
  type: 'percent' | 'amount' | 'buy_x_get_y'
  value: number
  minAmount: number
  maxDiscount?: number
  buyQty?: number       // buy_x_get_y: ต้องซื้อกี่ชิ้น
  freeQty?: number      // buy_x_get_y: ได้ฟรีกี่ชิ้น (ราคาถูกสุด)
  isActive: boolean
  startDate: string
  endDate?: string
  code?: string
}

export interface SaleItem {
  productId: string
  productName: string
  price: number
  cost: number
  qty: number
  total: number
  note?: string
}

// ── Open Orders (dine-in / hold orders) ──────────────────────────────────────
export interface OpenOrder {
  id: string
  orderNo: string             // display number: ORD-001
  tableNo?: string
  items: SaleItem[]
  note?: string
  memberId?: string
  memberName?: string
  discount: number
  discountNote?: string
  subtotal: number
  total: number
  status: 'open' | 'cancelled'
  createdAt: string
  updatedAt: string
}

export interface Sale {
  id: string
  receiptNo: string
  tableNo?: string      // table number for restaurant use
  items: SaleItem[]
  subtotal: number
  discount: number
  discountNote?: string
  total: number
  paymentMethod: 'cash' | 'qr' | 'card' | 'other'
  cashReceived?: number
  change?: number
  memberId?: string
  memberName?: string
  pointsEarned: number
  createdAt: string
  status: 'completed' | 'voided'
}

export interface StockLog {
  id: string
  productId: string
  productName: string
  type: 'in' | 'out' | 'adjust'
  qty: number
  note?: string
  createdAt: string
}

export interface Settings {
  shopName: string
  shopAddress: string
  shopPhone: string
  shopTaxId?: string
  receiptHeader?: string
  receiptFooter?: string
  receiptShowLogo: boolean
  currency: string
  taxRate: number
  pointsPerBaht: number
  pointsValue: number
  lowStockAlert: number
  businessType: 'restaurant' | 'retail' | 'service' | 'general'
  primaryColor: string
  logoUrl?: string
  themeId: string             // preset theme id (or 'custom')
  customPrimaryColor?: string // used when themeId === 'custom'
  promptpayId?: string        // PromptPay phone number or 13-digit ID
}

const DEFAULT_SETTINGS: Settings = {
  shopName: 'Happy POS ร้านค้า',
  shopAddress: '123 ถนนสุขุมวิท กรุงเทพฯ 10110',
  shopPhone: '02-xxx-xxxx',
  receiptHeader: 'ขอบคุณที่ใช้บริการ',
  receiptFooter: 'ยินดีต้อนรับกลับมาเสมอ',
  receiptShowLogo: false,
  currency: 'THB',
  taxRate: 0,
  pointsPerBaht: 10,
  pointsValue: 1,
  lowStockAlert: 10,
  businessType: 'general',
  primaryColor: '#f59000',
  themeId: 'orange-classic',
}

// --- Database API ---
export const db = {
  // Categories
  getCategories: (): Category[] => readJson('categories.json', []),
  saveCategories: (data: Category[]) => writeJson('categories.json', data),

  // Products
  getProducts: (): Product[] => readJson('products.json', []),
  saveProducts: (data: Product[]) => writeJson('products.json', data),

  // Members
  getMembers: (): Member[] => readJson('members.json', []),
  saveMembers: (data: Member[]) => writeJson('members.json', data),

  // Promotions
  getPromotions: (): Promotion[] => readJson('promotions.json', []),
  savePromotions: (data: Promotion[]) => writeJson('promotions.json', data),

  // Sales
  getSales: (): Sale[] => readJson('sales.json', []),
  saveSales: (data: Sale[]) => writeJson('sales.json', data),

  // Stock Logs
  getStockLogs: (): StockLog[] => readJson('stock_logs.json', []),
  saveStockLogs: (data: StockLog[]) => writeJson('stock_logs.json', data),

  // Settings
  getSettings: (): Settings => readJson('settings.json', DEFAULT_SETTINGS),
  saveSettings: (data: Settings) => writeJson('settings.json', data),

  // Stations
  getStations: (): Station[] => readJson('stations.json', []),
  saveStations: (data: Station[]) => writeJson('stations.json', data),

  // Kitchen Orders
  getKitchenOrders: (): KitchenOrder[] => readJson('kitchen_orders.json', []),
  saveKitchenOrders: (data: KitchenOrder[]) => writeJson('kitchen_orders.json', data),

  // Printers
  getPrinters: (): Printer[] => readJson('printers.json', []),
  savePrinters: (data: Printer[]) => writeJson('printers.json', data),

  // Open Orders
  getOpenOrders: (): OpenOrder[] => readJson('open_orders.json', []),
  saveOpenOrders: (data: OpenOrder[]) => writeJson('open_orders.json', data),
}

// Helper to generate receipt number
export function generateReceiptNo(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const sales = db.getSales()
  const todaySales = sales.filter(s => s.createdAt.startsWith(now.toISOString().slice(0, 10)))
  const seq = String(todaySales.length + 1).padStart(4, '0')
  return `RCP${date}${seq}`
}
