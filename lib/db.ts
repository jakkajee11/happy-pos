import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(process.cwd(), 'data', 'happy-pos.db')

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// --- Singleton connection ---
let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')   // WAL: faster writes, safe concurrent reads (fallback to DELETE if fs not supported)
    _db.pragma('foreign_keys = ON')
    initSchema(_db)
  }
  return _db
}

// --- Schema ---
function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      icon       TEXT NOT NULL DEFAULT '',
      color      TEXT NOT NULL DEFAULT '',
      createdAt  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      price       REAL NOT NULL DEFAULT 0,
      cost        REAL NOT NULL DEFAULT 0,
      categoryId  TEXT NOT NULL DEFAULT '',
      stationId   TEXT,
      stock       REAL NOT NULL DEFAULT 0,
      trackStock  INTEGER NOT NULL DEFAULT 0,
      barcode     TEXT,
      image       TEXT,
      isActive    INTEGER NOT NULL DEFAULT 1,
      createdAt   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stations (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      color     TEXT NOT NULL DEFAULT '',
      printerId TEXT,
      isActive  INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS printers (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      type             TEXT NOT NULL DEFAULT 'receipt',
      connectionType   TEXT NOT NULL DEFAULT 'browser',
      ipAddress        TEXT,
      port             INTEGER,
      usbVendorId      TEXT,
      bluetoothAddress TEXT,
      paperWidth       INTEGER NOT NULL DEFAULT 80,
      isDefault        INTEGER NOT NULL DEFAULT 0,
      isActive         INTEGER NOT NULL DEFAULT 1,
      lastSeen         TEXT,
      createdAt        TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      phone       TEXT NOT NULL DEFAULT '',
      email       TEXT,
      points      REAL NOT NULL DEFAULT 0,
      totalSpent  REAL NOT NULL DEFAULT 0,
      joinedAt    TEXT NOT NULL,
      notes       TEXT
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'percent',
      value       REAL NOT NULL DEFAULT 0,
      minAmount   REAL NOT NULL DEFAULT 0,
      maxDiscount REAL,
      buyQty      INTEGER,
      freeQty     INTEGER,
      isActive    INTEGER NOT NULL DEFAULT 1,
      startDate   TEXT NOT NULL,
      endDate     TEXT,
      code        TEXT
    );

    CREATE TABLE IF NOT EXISTS sales (
      id            TEXT PRIMARY KEY,
      receiptNo     TEXT NOT NULL,
      tableNo       TEXT,
      items         TEXT NOT NULL DEFAULT '[]',
      subtotal      REAL NOT NULL DEFAULT 0,
      discount      REAL NOT NULL DEFAULT 0,
      discountNote  TEXT,
      total         REAL NOT NULL DEFAULT 0,
      paymentMethod TEXT NOT NULL DEFAULT 'cash',
      cashReceived  REAL,
      change        REAL,
      memberId      TEXT,
      memberName    TEXT,
      pointsEarned  REAL NOT NULL DEFAULT 0,
      createdAt     TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'completed'
    );
    CREATE INDEX IF NOT EXISTS idx_sales_createdAt ON sales(createdAt);
    CREATE INDEX IF NOT EXISTS idx_sales_receiptNo  ON sales(receiptNo);

    CREATE TABLE IF NOT EXISTS stock_logs (
      id              TEXT PRIMARY KEY,
      productId       TEXT NOT NULL DEFAULT '',
      productName     TEXT NOT NULL DEFAULT '',
      ingredientId    TEXT NOT NULL DEFAULT '',
      ingredientName  TEXT NOT NULL DEFAULT '',
      type            TEXT NOT NULL DEFAULT 'in',
      qty             REAL NOT NULL DEFAULT 0,
      note            TEXT,
      createdAt       TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_stock_logs_productId ON stock_logs(productId);

    CREATE TABLE IF NOT EXISTS ingredients (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      unit              TEXT NOT NULL DEFAULT 'pcs',
      stock             REAL NOT NULL DEFAULT 0,
      lowStockThreshold REAL NOT NULL DEFAULT 0,
      createdAt         TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id            TEXT PRIMARY KEY,
      productId     TEXT NOT NULL,
      ingredientId  TEXT NOT NULL,
      qtyPerUnit    REAL NOT NULL DEFAULT 0,
      createdAt     TEXT NOT NULL,
      UNIQUE(productId, ingredientId)
    );
    CREATE INDEX IF NOT EXISTS idx_recipe_productId ON recipe_ingredients(productId);

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kitchen_orders (
      id          TEXT PRIMARY KEY,
      saleId      TEXT NOT NULL,
      receiptNo   TEXT NOT NULL,
      stationId   TEXT NOT NULL,
      stationName TEXT NOT NULL,
      tableNo     TEXT,
      items       TEXT NOT NULL DEFAULT '[]',
      status      TEXT NOT NULL DEFAULT 'pending',
      note        TEXT,
      createdAt   TEXT NOT NULL,
      updatedAt   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_kitchen_orders_status    ON kitchen_orders(status);
    CREATE INDEX IF NOT EXISTS idx_kitchen_orders_stationId ON kitchen_orders(stationId);

    CREATE TABLE IF NOT EXISTS notifications (
      id         TEXT PRIMARY KEY,
      type       TEXT NOT NULL,
      tableNo    TEXT,
      orderId    TEXT,
      message    TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'unread',
      createdAt  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

    CREATE TABLE IF NOT EXISTS open_orders (
      id           TEXT PRIMARY KEY,
      orderNo      TEXT NOT NULL,
      tableNo      TEXT,
      items        TEXT NOT NULL DEFAULT '[]',
      note         TEXT,
      memberId     TEXT,
      memberName   TEXT,
      discount     REAL NOT NULL DEFAULT 0,
      discountNote TEXT,
      subtotal     REAL NOT NULL DEFAULT 0,
      total        REAL NOT NULL DEFAULT 0,
      status       TEXT NOT NULL DEFAULT 'open',
      createdAt    TEXT NOT NULL,
      updatedAt    TEXT NOT NULL
    );
  `)

  // Migration: add ingredientId/ingredientName columns to stock_logs if missing
  try { db.exec('ALTER TABLE stock_logs ADD COLUMN ingredientId TEXT NOT NULL DEFAULT ""') } catch {}
  try { db.exec('ALTER TABLE stock_logs ADD COLUMN ingredientName TEXT NOT NULL DEFAULT ""') } catch {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_stock_logs_ingredientId ON stock_logs(ingredientId)') } catch {}
}

// --- Helper converters ---
function toBool(val: unknown): boolean {
  return val === 1 || val === true
}

function fromBool(val: boolean): number {
  return val ? 1 : 0
}

function toJson<T>(val: string | null | undefined): T {
  if (!val) return [] as unknown as T
  try { return JSON.parse(val) as T } catch { return [] as unknown as T }
}

function fromJson(val: unknown): string {
  return JSON.stringify(val ?? [])
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
  stationId?: string
  stock: number
  trackStock: boolean
  barcode?: string
  image?: string
  isActive: boolean
  createdAt: string
}

export interface Station {
  id: string
  name: string
  color: string
  printerId?: string
  isActive: boolean
  createdAt: string
}

export type PrinterConnectionType = 'browser' | 'network' | 'usb' | 'bluetooth'
export type PrinterType = 'receipt' | 'kot' | 'label' | 'general'

export interface Printer {
  id: string
  name: string
  type: PrinterType
  connectionType: PrinterConnectionType
  ipAddress?: string
  port?: number
  usbVendorId?: string
  bluetoothAddress?: string
  paperWidth: 58 | 80
  isDefault: boolean
  isActive: boolean
  lastSeen?: string
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
  buyQty?: number
  freeQty?: number
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

export interface Notification {
  id: string
  type: 'check-bill' | 'call-staff' | 'new-order'
  tableNo?: string
  orderId?: string
  message: string
  status: 'unread' | 'read'
  createdAt: string
}

export interface OpenOrder {
  id: string
  orderNo: string
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
  tableNo?: string
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
  ingredientId?: string
  ingredientName?: string
  type: 'in' | 'out' | 'adjust'
  qty: number
  note?: string
  createdAt: string
}

export interface Ingredient {
  id: string
  name: string
  unit: string
  stock: number
  lowStockThreshold: number
  createdAt: string
}

export interface RecipeIngredient {
  id: string
  productId: string
  ingredientId: string
  ingredientName?: string
  ingredientUnit?: string
  qtyPerUnit: number
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
  themeId: string
  customPrimaryColor?: string
  promptpayId?: string
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

// --- Row mappers ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCategory(row: any): Category {
  return { id: row.id, name: row.name, icon: row.icon, color: row.color, createdAt: row.createdAt }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProduct(row: any): Product {
  return {
    id: row.id, name: row.name, price: row.price, cost: row.cost,
    categoryId: row.categoryId, stationId: row.stationId ?? undefined,
    stock: row.stock, trackStock: toBool(row.trackStock),
    barcode: row.barcode ?? undefined, image: row.image ?? undefined,
    isActive: toBool(row.isActive), createdAt: row.createdAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStation(row: any): Station {
  return {
    id: row.id, name: row.name, color: row.color,
    printerId: row.printerId ?? undefined,
    isActive: toBool(row.isActive), createdAt: row.createdAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPrinter(row: any): Printer {
  return {
    id: row.id, name: row.name,
    type: row.type as PrinterType,
    connectionType: row.connectionType as PrinterConnectionType,
    ipAddress: row.ipAddress ?? undefined, port: row.port ?? undefined,
    usbVendorId: row.usbVendorId ?? undefined,
    bluetoothAddress: row.bluetoothAddress ?? undefined,
    paperWidth: row.paperWidth as 58 | 80,
    isDefault: toBool(row.isDefault), isActive: toBool(row.isActive),
    lastSeen: row.lastSeen ?? undefined, createdAt: row.createdAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMember(row: any): Member {
  return {
    id: row.id, name: row.name, phone: row.phone,
    email: row.email ?? undefined, points: row.points, totalSpent: row.totalSpent,
    joinedAt: row.joinedAt, notes: row.notes ?? undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPromotion(row: any): Promotion {
  return {
    id: row.id, name: row.name, type: row.type as Promotion['type'],
    value: row.value, minAmount: row.minAmount,
    maxDiscount: row.maxDiscount ?? undefined,
    buyQty: row.buyQty ?? undefined, freeQty: row.freeQty ?? undefined,
    isActive: toBool(row.isActive), startDate: row.startDate,
    endDate: row.endDate ?? undefined, code: row.code ?? undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSale(row: any): Sale {
  return {
    id: row.id, receiptNo: row.receiptNo, tableNo: row.tableNo ?? undefined,
    items: toJson<SaleItem[]>(row.items),
    subtotal: row.subtotal, discount: row.discount,
    discountNote: row.discountNote ?? undefined, total: row.total,
    paymentMethod: row.paymentMethod as Sale['paymentMethod'],
    cashReceived: row.cashReceived ?? undefined, change: row.change ?? undefined,
    memberId: row.memberId ?? undefined, memberName: row.memberName ?? undefined,
    pointsEarned: row.pointsEarned, createdAt: row.createdAt,
    status: row.status as Sale['status'],
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStockLog(row: any): StockLog {
  return {
    id: row.id, productId: row.productId, productName: row.productName,
    ingredientId: row.ingredientId || undefined, ingredientName: row.ingredientName || undefined,
    type: row.type as StockLog['type'], qty: row.qty,
    note: row.note ?? undefined, createdAt: row.createdAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapIngredient(row: any): Ingredient {
  return {
    id: row.id, name: row.name, unit: row.unit,
    stock: row.stock, lowStockThreshold: row.lowStockThreshold, createdAt: row.createdAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRecipeIngredient(row: any): RecipeIngredient {
  return {
    id: row.id, productId: row.productId, ingredientId: row.ingredientId,
    ingredientName: row.ingredientName ?? undefined, ingredientUnit: row.ingredientUnit ?? undefined,
    qtyPerUnit: row.qtyPerUnit, createdAt: row.createdAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapKitchenOrder(row: any): KitchenOrder {
  return {
    id: row.id, saleId: row.saleId, receiptNo: row.receiptNo,
    stationId: row.stationId, stationName: row.stationName,
    tableNo: row.tableNo ?? undefined,
    items: toJson<KitchenOrderItem[]>(row.items),
    status: row.status as KitchenOrder['status'],
    note: row.note ?? undefined, createdAt: row.createdAt, updatedAt: row.updatedAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOpenOrder(row: any): OpenOrder {
  return {
    id: row.id, orderNo: row.orderNo, tableNo: row.tableNo ?? undefined,
    items: toJson<SaleItem[]>(row.items),
    note: row.note ?? undefined, memberId: row.memberId ?? undefined,
    memberName: row.memberName ?? undefined, discount: row.discount,
    discountNote: row.discountNote ?? undefined, subtotal: row.subtotal,
    total: row.total, status: row.status as OpenOrder['status'],
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  }
}

// --- Database API ---
export const db = {
  // ── Categories ──────────────────────────────────────────────────────────────
  getCategories: (): Category[] =>
    (getDb().prepare('SELECT * FROM categories ORDER BY createdAt ASC').all() as never[]).map(mapCategory),

  saveCategories: (data: Category[]) => {
    const d = getDb()
    const upsert = d.prepare(`
      INSERT INTO categories (id, name, icon, color, createdAt)
      VALUES (@id, @name, @icon, @color, @createdAt)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, icon=excluded.icon, color=excluded.color
    `)
    const deleteOthers = d.prepare(`DELETE FROM categories WHERE id NOT IN (${data.map(() => '?').join(',') || "''"})`)
    d.transaction(() => {
      data.forEach(r => upsert.run(r))
      if (data.length > 0) deleteOthers.run(...data.map(r => r.id))
      else d.prepare('DELETE FROM categories').run()
    })()
  },

  // ── Products ─────────────────────────────────────────────────────────────────
  getProducts: (): Product[] =>
    (getDb().prepare('SELECT * FROM products ORDER BY createdAt ASC').all() as never[]).map(mapProduct),

  saveProducts: (data: Product[]) => {
    const d = getDb()
    const upsert = d.prepare(`
      INSERT INTO products (id, name, price, cost, categoryId, stationId, stock, trackStock, barcode, image, isActive, createdAt)
      VALUES (@id, @name, @price, @cost, @categoryId, @stationId, @stock, @trackStock, @barcode, @image, @isActive, @createdAt)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, price=excluded.price, cost=excluded.cost,
        categoryId=excluded.categoryId, stationId=excluded.stationId,
        stock=excluded.stock, trackStock=excluded.trackStock,
        barcode=excluded.barcode, image=excluded.image, isActive=excluded.isActive
    `)
    d.transaction(() => {
      data.forEach(r => upsert.run({ ...r, trackStock: fromBool(r.trackStock), isActive: fromBool(r.isActive) }))
      if (data.length > 0) {
        d.prepare(`DELETE FROM products WHERE id NOT IN (${data.map(() => '?').join(',')})`).run(...data.map(r => r.id))
      } else {
        d.prepare('DELETE FROM products').run()
      }
    })()
  },

  // ── Members ──────────────────────────────────────────────────────────────────
  getMembers: (): Member[] =>
    (getDb().prepare('SELECT * FROM members ORDER BY joinedAt ASC').all() as never[]).map(mapMember),

  saveMembers: (data: Member[]) => {
    const d = getDb()
    const upsert = d.prepare(`
      INSERT INTO members (id, name, phone, email, points, totalSpent, joinedAt, notes)
      VALUES (@id, @name, @phone, @email, @points, @totalSpent, @joinedAt, @notes)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, phone=excluded.phone, email=excluded.email,
        points=excluded.points, totalSpent=excluded.totalSpent, notes=excluded.notes
    `)
    d.transaction(() => {
      data.forEach(r => upsert.run(r))
      if (data.length > 0) {
        d.prepare(`DELETE FROM members WHERE id NOT IN (${data.map(() => '?').join(',')})`).run(...data.map(r => r.id))
      } else {
        d.prepare('DELETE FROM members').run()
      }
    })()
  },

  // ── Promotions ───────────────────────────────────────────────────────────────
  getPromotions: (): Promotion[] =>
    (getDb().prepare('SELECT * FROM promotions ORDER BY startDate ASC').all() as never[]).map(mapPromotion),

  savePromotions: (data: Promotion[]) => {
    const d = getDb()
    const upsert = d.prepare(`
      INSERT INTO promotions (id, name, type, value, minAmount, maxDiscount, buyQty, freeQty, isActive, startDate, endDate, code)
      VALUES (@id, @name, @type, @value, @minAmount, @maxDiscount, @buyQty, @freeQty, @isActive, @startDate, @endDate, @code)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, type=excluded.type, value=excluded.value,
        minAmount=excluded.minAmount, maxDiscount=excluded.maxDiscount,
        buyQty=excluded.buyQty, freeQty=excluded.freeQty,
        isActive=excluded.isActive, startDate=excluded.startDate,
        endDate=excluded.endDate, code=excluded.code
    `)
    d.transaction(() => {
      data.forEach(r => upsert.run({ ...r, isActive: fromBool(r.isActive) }))
      if (data.length > 0) {
        d.prepare(`DELETE FROM promotions WHERE id NOT IN (${data.map(() => '?').join(',')})`).run(...data.map(r => r.id))
      } else {
        d.prepare('DELETE FROM promotions').run()
      }
    })()
  },

  // ── Sales ────────────────────────────────────────────────────────────────────
  getSales: (): Sale[] =>
    (getDb().prepare('SELECT * FROM sales ORDER BY createdAt ASC').all() as never[]).map(mapSale),

  saveSales: (data: Sale[]) => {
    const d = getDb()
    const upsert = d.prepare(`
      INSERT INTO sales (id, receiptNo, tableNo, items, subtotal, discount, discountNote, total, paymentMethod, cashReceived, change, memberId, memberName, pointsEarned, createdAt, status)
      VALUES (@id, @receiptNo, @tableNo, @items, @subtotal, @discount, @discountNote, @total, @paymentMethod, @cashReceived, @change, @memberId, @memberName, @pointsEarned, @createdAt, @status)
      ON CONFLICT(id) DO UPDATE SET
        items=excluded.items, subtotal=excluded.subtotal, discount=excluded.discount,
        discountNote=excluded.discountNote, total=excluded.total,
        paymentMethod=excluded.paymentMethod, cashReceived=excluded.cashReceived,
        change=excluded.change, memberId=excluded.memberId, memberName=excluded.memberName,
        pointsEarned=excluded.pointsEarned, status=excluded.status
    `)
    d.transaction(() => {
      data.forEach(r => upsert.run({ ...r, items: fromJson(r.items) }))
      if (data.length > 0) {
        d.prepare(`DELETE FROM sales WHERE id NOT IN (${data.map(() => '?').join(',')})`).run(...data.map(r => r.id))
      } else {
        d.prepare('DELETE FROM sales').run()
      }
    })()
  },

  // ── Stock Logs ───────────────────────────────────────────────────────────────
  getStockLogs: (): StockLog[] =>
    (getDb().prepare('SELECT * FROM stock_logs ORDER BY createdAt ASC').all() as never[]).map(mapStockLog),

  saveStockLogs: (data: StockLog[]) => {
    const d = getDb()
    const upsert = d.prepare(`
      INSERT INTO stock_logs (id, productId, productName, ingredientId, ingredientName, type, qty, note, createdAt)
      VALUES (@id, @productId, @productName, @ingredientId, @ingredientName, @type, @qty, @note, @createdAt)
      ON CONFLICT(id) DO UPDATE SET
        productId=excluded.productId, productName=excluded.productName,
        ingredientId=excluded.ingredientId, ingredientName=excluded.ingredientName,
        type=excluded.type, qty=excluded.qty, note=excluded.note
    `)
    d.transaction(() => {
      data.forEach(r => upsert.run({
        ...r,
        ingredientId: r.ingredientId ?? '',
        ingredientName: r.ingredientName ?? '',
      }))
      if (data.length > 0) {
        d.prepare(`DELETE FROM stock_logs WHERE id NOT IN (${data.map(() => '?').join(',')})`).run(...data.map(r => r.id))
      } else {
        d.prepare('DELETE FROM stock_logs').run()
      }
    })()
  },

  addStockLog: (log: StockLog) => {
    const d = getDb()
    d.prepare(`INSERT INTO stock_logs (id, productId, productName, ingredientId, ingredientName, type, qty, note, createdAt) VALUES (@id, @productId, @productName, @ingredientId, @ingredientName, @type, @qty, @note, @createdAt)`).run({
      ...log,
      ingredientId: log.ingredientId ?? '',
      ingredientName: log.ingredientName ?? '',
    })
  },

  // ── Ingredients ─────────────────────────────────────────────────────────────
  getIngredients: (): Ingredient[] =>
    (getDb().prepare('SELECT * FROM ingredients ORDER BY name ASC').all() as never[]).map(mapIngredient),

  saveIngredients: (data: Ingredient[]) => {
    const d = getDb()
    const upsert = d.prepare(`
      INSERT INTO ingredients (id, name, unit, stock, lowStockThreshold, createdAt)
      VALUES (@id, @name, @unit, @stock, @lowStockThreshold, @createdAt)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, unit=excluded.unit,
        stock=excluded.stock, lowStockThreshold=excluded.lowStockThreshold
    `)
    d.transaction(() => {
      data.forEach(r => upsert.run(r))
      if (data.length > 0) {
        d.prepare(`DELETE FROM ingredients WHERE id NOT IN (${data.map(() => '?').join(',')})`).run(...data.map(r => r.id))
      } else {
        d.prepare('DELETE FROM ingredients').run()
      }
    })()
  },

  getIngredientById: (id: string): Ingredient | undefined => {
    const row = getDb().prepare('SELECT * FROM ingredients WHERE id = ?').get(id)
    return row ? mapIngredient(row) : undefined
  },

  updateIngredientStock: (id: string, stock: number) => {
    getDb().prepare('UPDATE ingredients SET stock = ? WHERE id = ?').run(stock, id)
  },

  deleteIngredient: (id: string) => {
    const d = getDb()
    d.transaction(() => {
      d.prepare('DELETE FROM recipe_ingredients WHERE ingredientId = ?').run(id)
      d.prepare('DELETE FROM ingredients WHERE id = ?').run(id)
    })()
  },

  // ── Recipes ──────────────────────────────────────────────────────────────────
  getRecipeByProductId: (productId: string): RecipeIngredient[] =>
    (getDb().prepare(`
      SELECT ri.*, i.name as ingredientName, i.unit as ingredientUnit
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.id = ri.ingredientId
      WHERE ri.productId = ?
      ORDER BY i.name ASC
    `).all(productId) as never[]).map(mapRecipeIngredient),

  hasRecipe: (productId: string): boolean => {
    const row = getDb().prepare('SELECT COUNT(*) as cnt FROM recipe_ingredients WHERE productId = ?').get(productId) as { cnt: number }
    return (row?.cnt ?? 0) > 0
  },

  saveRecipe: (productId: string, items: RecipeIngredient[]) => {
    const d = getDb()
    const insert = d.prepare(`
      INSERT INTO recipe_ingredients (id, productId, ingredientId, qtyPerUnit, createdAt)
      VALUES (@id, @productId, @ingredientId, @qtyPerUnit, @createdAt)
    `)
    d.transaction(() => {
      d.prepare('DELETE FROM recipe_ingredients WHERE productId = ?').run(productId)
      items.forEach(r => insert.run(r))
    })()
  },

  deleteRecipe: (productId: string) => {
    getDb().prepare('DELETE FROM recipe_ingredients WHERE productId = ?').run(productId)
  },

  getAvailableStock: (productId: string): number | null => {
    const rows = getDb().prepare(`
      SELECT ri.qtyPerUnit, i.stock
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.id = ri.ingredientId
      WHERE ri.productId = ?
    `).all(productId) as { qtyPerUnit: number; stock: number }[]
    if (rows.length === 0) return null
    return Math.min(...rows.map(r => Math.floor(r.stock / r.qtyPerUnit)))
  },

  getAllAvailableStock: (): Record<string, number> => {
    const rows = getDb().prepare(`
      SELECT ri.productId, ri.qtyPerUnit, i.stock
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.id = ri.ingredientId
    `).all() as { productId: string; qtyPerUnit: number; stock: number }[]
    const minMap: Record<string, number[]> = {}
    for (const r of rows) {
      if (!minMap[r.productId]) minMap[r.productId] = []
      minMap[r.productId].push(Math.floor(r.stock / r.qtyPerUnit))
    }
    const result: Record<string, number> = {}
    for (const [pid, vals] of Object.entries(minMap)) {
      result[pid] = Math.min(...vals)
    }
    return result
  },

  deductIngredientStock: (productId: string, qty: number, receiptNo: string) => {
    const d = getDb()
    const recipeRows = d.prepare(`
      SELECT ri.ingredientId, ri.qtyPerUnit, i.name as ingredientName, i.stock
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.id = ri.ingredientId
      WHERE ri.productId = ?
    `).all(productId) as { ingredientId: string; qtyPerUnit: number; ingredientName: string; stock: number }[]
    const now = new Date().toISOString()
    d.transaction(() => {
      for (const r of recipeRows) {
        const deduct = r.qtyPerUnit * qty
        const newStock = Math.max(0, r.stock - deduct)
        d.prepare('UPDATE ingredients SET stock = ? WHERE id = ?').run(newStock, r.ingredientId)
        d.prepare(`INSERT INTO stock_logs (id, productId, productName, ingredientId, ingredientName, type, qty, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          crypto.randomUUID(), '', '', r.ingredientId, r.ingredientName, 'out', deduct, `ขาย #${receiptNo}`, now
        )
      }
    })()
  },

  // ── Settings ─────────────────────────────────────────────────────────────────
  getSettings: (): Settings => {
    const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
    if (rows.length === 0) return DEFAULT_SETTINGS
    const obj: Record<string, unknown> = { ...DEFAULT_SETTINGS }
    rows.forEach(r => {
      try { obj[r.key] = JSON.parse(r.value) } catch { obj[r.key] = r.value }
    })
    return obj as unknown as Settings
  },

  saveSettings: (data: Settings) => {
    const d = getDb()
    const upsert = d.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value
    `)
    d.transaction(() => {
      Object.entries(data).forEach(([k, v]) => upsert.run(k, JSON.stringify(v)))
    })()
  },

  // ── Stations ─────────────────────────────────────────────────────────────────
  getStations: (): Station[] =>
    (getDb().prepare('SELECT * FROM stations ORDER BY createdAt ASC').all() as never[]).map(mapStation),

  saveStations: (data: Station[]) => {
    const d = getDb()
    const upsert = d.prepare(`
      INSERT INTO stations (id, name, color, printerId, isActive, createdAt)
      VALUES (@id, @name, @color, @printerId, @isActive, @createdAt)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, color=excluded.color,
        printerId=excluded.printerId, isActive=excluded.isActive
    `)
    d.transaction(() => {
      data.forEach(r => upsert.run({ ...r, isActive: fromBool(r.isActive) }))
      if (data.length > 0) {
        d.prepare(`DELETE FROM stations WHERE id NOT IN (${data.map(() => '?').join(',')})`).run(...data.map(r => r.id))
      } else {
        d.prepare('DELETE FROM stations').run()
      }
    })()
  },

  // ── Kitchen Orders ───────────────────────────────────────────────────────────
  getKitchenOrders: (): KitchenOrder[] =>
    (getDb().prepare('SELECT * FROM kitchen_orders ORDER BY createdAt ASC').all() as never[]).map(mapKitchenOrder),

  // Insert new kitchen orders (append only — safe for concurrent use)
  addKitchenOrders: (orders: KitchenOrder[]) => {
    if (orders.length === 0) return
    const d = getDb()
    const insert = d.prepare(`
      INSERT OR IGNORE INTO kitchen_orders (id, saleId, receiptNo, stationId, stationName, tableNo, items, status, note, createdAt, updatedAt)
      VALUES (@id, @saleId, @receiptNo, @stationId, @stationName, @tableNo, @items, @status, @note, @createdAt, @updatedAt)
    `)
    d.transaction(() => {
      orders.forEach(r => insert.run({
        id: r.id, saleId: r.saleId, receiptNo: r.receiptNo,
        stationId: r.stationId, stationName: r.stationName,
        tableNo: r.tableNo ?? null, items: fromJson(r.items),
        status: r.status, note: r.note ?? null,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      }))
    })()
  },

  saveKitchenOrders: (data: KitchenOrder[]) => {
    const d = getDb()
    const upsert = d.prepare(`
      INSERT INTO kitchen_orders (id, saleId, receiptNo, stationId, stationName, tableNo, items, status, note, createdAt, updatedAt)
      VALUES (@id, @saleId, @receiptNo, @stationId, @stationName, @tableNo, @items, @status, @note, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        status=excluded.status, items=excluded.items,
        note=excluded.note, updatedAt=excluded.updatedAt
    `)
    d.transaction(() => {
      data.forEach(r => upsert.run({ ...r, items: fromJson(r.items) }))
      if (data.length > 0) {
        d.prepare(`DELETE FROM kitchen_orders WHERE id NOT IN (${data.map(() => '?').join(',')})`).run(...data.map(r => r.id))
      } else {
        d.prepare('DELETE FROM kitchen_orders').run()
      }
    })()
  },

  // ── Printers ─────────────────────────────────────────────────────────────────
  getPrinters: (): Printer[] =>
    (getDb().prepare('SELECT * FROM printers ORDER BY createdAt ASC').all() as never[]).map(mapPrinter),

  savePrinters: (data: Printer[]) => {
    const d = getDb()
    const upsert = d.prepare(`
      INSERT INTO printers (id, name, type, connectionType, ipAddress, port, usbVendorId, bluetoothAddress, paperWidth, isDefault, isActive, lastSeen, createdAt)
      VALUES (@id, @name, @type, @connectionType, @ipAddress, @port, @usbVendorId, @bluetoothAddress, @paperWidth, @isDefault, @isActive, @lastSeen, @createdAt)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, type=excluded.type, connectionType=excluded.connectionType,
        ipAddress=excluded.ipAddress, port=excluded.port, usbVendorId=excluded.usbVendorId,
        bluetoothAddress=excluded.bluetoothAddress, paperWidth=excluded.paperWidth,
        isDefault=excluded.isDefault, isActive=excluded.isActive, lastSeen=excluded.lastSeen
    `)
    d.transaction(() => {
      data.forEach(r => upsert.run({ ...r, isDefault: fromBool(r.isDefault), isActive: fromBool(r.isActive) }))
      if (data.length > 0) {
        d.prepare(`DELETE FROM printers WHERE id NOT IN (${data.map(() => '?').join(',')})`).run(...data.map(r => r.id))
      } else {
        d.prepare('DELETE FROM printers').run()
      }
    })()
  },

  // ── Open Orders ──────────────────────────────────────────────────────────────
  getOpenOrders: (): OpenOrder[] =>
    (getDb().prepare('SELECT * FROM open_orders ORDER BY createdAt ASC').all() as never[]).map(mapOpenOrder),

  // ── Notifications ────────────────────────────────────────────────────────────
  getNotifications: (status?: string): Notification[] => {
    const d = getDb()
    if (status) {
      return d.prepare('SELECT * FROM notifications WHERE status = ? ORDER BY createdAt DESC').all(status) as Notification[]
    }
    return d.prepare('SELECT * FROM notifications ORDER BY createdAt DESC LIMIT 50').all() as Notification[]
  },

  addNotification: (n: Notification) => {
    const d = getDb()
    d.prepare(`INSERT INTO notifications (id, type, tableNo, orderId, message, status, createdAt) VALUES (@id, @type, @tableNo, @orderId, @message, @status, @createdAt)`).run(n)
  },

  markNotificationRead: (id: string) => {
    getDb().prepare('UPDATE notifications SET status = ? WHERE id = ?').run('read', id)
  },

  markAllNotificationsRead: () => {
    getDb().prepare("UPDATE notifications SET status = 'read' WHERE status = 'unread'").run()
  },

  saveOpenOrders: (data: OpenOrder[]) => {
    const d = getDb()
    const upsert = d.prepare(`
      INSERT INTO open_orders (id, orderNo, tableNo, items, note, memberId, memberName, discount, discountNote, subtotal, total, status, createdAt, updatedAt)
      VALUES (@id, @orderNo, @tableNo, @items, @note, @memberId, @memberName, @discount, @discountNote, @subtotal, @total, @status, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        tableNo=excluded.tableNo, items=excluded.items, note=excluded.note,
        memberId=excluded.memberId, memberName=excluded.memberName,
        discount=excluded.discount, discountNote=excluded.discountNote,
        subtotal=excluded.subtotal, total=excluded.total,
        status=excluded.status, updatedAt=excluded.updatedAt
    `)
    d.transaction(() => {
      data.forEach(r => upsert.run({ ...r, items: fromJson(r.items) }))
      if (data.length > 0) {
        d.prepare(`DELETE FROM open_orders WHERE id NOT IN (${data.map(() => '?').join(',')})`).run(...data.map(r => r.id))
      } else {
        d.prepare('DELETE FROM open_orders').run()
      }
    })()
  },
}

// Helper to generate receipt number
export function generateReceiptNo(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const datePrefix = now.toISOString().slice(0, 10)
  const row = getDb()
    .prepare(`SELECT COUNT(*) as cnt FROM sales WHERE createdAt LIKE ?`)
    .get(`${datePrefix}%`) as { cnt: number }
  const seq = String((row?.cnt ?? 0) + 1).padStart(4, '0')
  return `RCP${date}${seq}`
}
