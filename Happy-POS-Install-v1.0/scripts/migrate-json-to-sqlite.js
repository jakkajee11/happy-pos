/**
 * Migration script: JSON files → SQLite
 * Usage: npm run migrate-db
 *
 * - อ่านไฟล์ JSON ทุกไฟล์ใน /data
 * - เขียนเข้า SQLite (happy-pos.db)
 * - ไฟล์ JSON เดิมจะถูก backup ไว้ใน /data/backup_json (ไม่ลบ)
 */

const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'happy-pos.db')
const BACKUP_DIR = path.join(DATA_DIR, 'backup_json')
const SOURCE_DIR = BACKUP_DIR  // Read from backup_json

// ── Helpers ──────────────────────────────────────────────────────────────────

function readJson(filename, defaultValue = []) {
  const filePath = path.join(SOURCE_DIR, filename)
  if (!fs.existsSync(filePath)) return defaultValue
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    console.warn(`  ⚠️  อ่านไฟล์ ${filename} ไม่ได้ ข้ามไป`)
    return defaultValue
  }
}

const B = v => (v ? 1 : 0)
const J = v => JSON.stringify(v ?? [])

// ── Initialize DB schema ─────────────────────────────────────────────────────

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      icon TEXT DEFAULT '', color TEXT DEFAULT '', createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      price REAL DEFAULT 0, cost REAL DEFAULT 0,
      categoryId TEXT DEFAULT '', stationId TEXT,
      stock REAL DEFAULT 0, trackStock INTEGER DEFAULT 0,
      barcode TEXT, image TEXT, isActive INTEGER DEFAULT 1, createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stations (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      color TEXT DEFAULT '', printerId TEXT,
      isActive INTEGER DEFAULT 1, createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS printers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      type TEXT DEFAULT 'receipt', connectionType TEXT DEFAULT 'browser',
      ipAddress TEXT, port INTEGER, usbVendorId TEXT, bluetoothAddress TEXT,
      paperWidth INTEGER DEFAULT 80, isDefault INTEGER DEFAULT 0,
      isActive INTEGER DEFAULT 1, lastSeen TEXT, createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT DEFAULT '',
      email TEXT, points REAL DEFAULT 0, totalSpent REAL DEFAULT 0,
      joinedAt TEXT NOT NULL, notes TEXT
    );
    CREATE TABLE IF NOT EXISTS promotions (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      type TEXT DEFAULT 'percent', value REAL DEFAULT 0,
      minAmount REAL DEFAULT 0, maxDiscount REAL, buyQty INTEGER, freeQty INTEGER,
      isActive INTEGER DEFAULT 1, startDate TEXT NOT NULL, endDate TEXT, code TEXT
    );
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY, receiptNo TEXT NOT NULL, tableNo TEXT,
      items TEXT DEFAULT '[]', subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0, discountNote TEXT,
      total REAL DEFAULT 0, paymentMethod TEXT DEFAULT 'cash',
      cashReceived REAL, change REAL, memberId TEXT, memberName TEXT,
      pointsEarned REAL DEFAULT 0, createdAt TEXT NOT NULL,
      status TEXT DEFAULT 'completed'
    );
    CREATE INDEX IF NOT EXISTS idx_sales_createdAt ON sales(createdAt);
    CREATE INDEX IF NOT EXISTS idx_sales_receiptNo  ON sales(receiptNo);
    CREATE TABLE IF NOT EXISTS stock_logs (
      id TEXT PRIMARY KEY, productId TEXT NOT NULL, productName TEXT NOT NULL,
      type TEXT DEFAULT 'in', qty REAL DEFAULT 0, note TEXT, createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_stock_logs_productId ON stock_logs(productId);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS kitchen_orders (
      id TEXT PRIMARY KEY, saleId TEXT NOT NULL, receiptNo TEXT NOT NULL,
      stationId TEXT NOT NULL, stationName TEXT NOT NULL, tableNo TEXT,
      items TEXT DEFAULT '[]', status TEXT DEFAULT 'pending',
      note TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_kitchen_orders_status    ON kitchen_orders(status);
    CREATE INDEX IF NOT EXISTS idx_kitchen_orders_stationId ON kitchen_orders(stationId);
    CREATE TABLE IF NOT EXISTS open_orders (
      id TEXT PRIMARY KEY, orderNo TEXT NOT NULL, tableNo TEXT,
      items TEXT DEFAULT '[]', note TEXT, memberId TEXT, memberName TEXT,
      discount REAL DEFAULT 0, discountNote TEXT,
      subtotal REAL DEFAULT 0, total REAL DEFAULT 0,
      status TEXT DEFAULT 'open', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
  `)
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('🚀 เริ่ม migration: JSON → SQLite\n')

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error('❌ ไม่พบโฟลเดอร์ /data/backup_json')
    process.exit(1)
  }

  console.log(`📂 อ่านข้อมูลจาก: ${SOURCE_DIR}\n`)

  // Remove existing DB to start fresh
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH)
    console.log('🗑️  ลบ DB เก่าแล้ว\n')
  }

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  console.log('📋 สร้าง schema...')
  initSchema(db)
  console.log('   ✅ Schema พร้อมใช้งาน\n')

  console.log('📥 ย้ายข้อมูล...')

  // categories
  const cats = readJson('categories.json', [])
  if (cats.length) {
    const s = db.prepare('INSERT OR IGNORE INTO categories VALUES (@id,@name,@icon,@color,@createdAt)')
    db.transaction(() => cats.forEach(r => s.run({ icon: '', color: '', ...r })))()
  }
  console.log(`  ✅ categories: ${cats.length} รายการ`)

  // products
  const prods = readJson('products.json', [])
  if (prods.length) {
    const s = db.prepare('INSERT OR IGNORE INTO products VALUES (@id,@name,@price,@cost,@categoryId,@stationId,@stock,@trackStock,@barcode,@image,@isActive,@createdAt)')
    db.transaction(() => prods.forEach(r => s.run({
      stationId: null, barcode: null, image: null, ...r,
      trackStock: B(r.trackStock), isActive: B(r.isActive ?? true)
    })))()
  }
  console.log(`  ✅ products: ${prods.length} รายการ`)

  // stations
  const stations = readJson('stations.json', [])
  if (stations.length) {
    const s = db.prepare('INSERT OR IGNORE INTO stations VALUES (@id,@name,@color,@printerId,@isActive,@createdAt)')
    db.transaction(() => stations.forEach(r => s.run({ printerId: null, ...r, isActive: B(r.isActive ?? true) })))()
  }
  console.log(`  ✅ stations: ${stations.length} รายการ`)

  // printers
  const printers = readJson('printers.json', [])
  if (printers.length) {
    const s = db.prepare('INSERT OR IGNORE INTO printers VALUES (@id,@name,@type,@connectionType,@ipAddress,@port,@usbVendorId,@bluetoothAddress,@paperWidth,@isDefault,@isActive,@lastSeen,@createdAt)')
    db.transaction(() => printers.forEach(r => s.run({
      ipAddress: null, port: null, usbVendorId: null, bluetoothAddress: null, lastSeen: null, ...r,
      isDefault: B(r.isDefault), isActive: B(r.isActive ?? true)
    })))()
  }
  console.log(`  ✅ printers: ${printers.length} รายการ`)

  // members
  const members = readJson('members.json', [])
  if (members.length) {
    const s = db.prepare('INSERT OR IGNORE INTO members VALUES (@id,@name,@phone,@email,@points,@totalSpent,@joinedAt,@notes)')
    db.transaction(() => members.forEach(r => s.run({ email: null, notes: null, ...r })))()
  }
  console.log(`  ✅ members: ${members.length} รายการ`)

  // promotions
  const promos = readJson('promotions.json', [])
  if (promos.length) {
    const s = db.prepare('INSERT OR IGNORE INTO promotions VALUES (@id,@name,@type,@value,@minAmount,@maxDiscount,@buyQty,@freeQty,@isActive,@startDate,@endDate,@code)')
    db.transaction(() => promos.forEach(r => s.run({
      maxDiscount: null, buyQty: null, freeQty: null, endDate: null, code: null, ...r,
      isActive: B(r.isActive ?? true)
    })))()
  }
  console.log(`  ✅ promotions: ${promos.length} รายการ`)

  // sales
  const sales = readJson('sales.json', [])
  if (sales.length) {
    const s = db.prepare('INSERT OR IGNORE INTO sales VALUES (@id,@receiptNo,@tableNo,@items,@subtotal,@discount,@discountNote,@total,@paymentMethod,@cashReceived,@change,@memberId,@memberName,@pointsEarned,@createdAt,@status)')
    db.transaction(() => sales.forEach(r => s.run({
      tableNo: null, discountNote: null, cashReceived: null, change: null, memberId: null, memberName: null, ...r,
      items: J(r.items)
    })))()
  }
  console.log(`  ✅ sales: ${sales.length} รายการ`)

  // stock_logs
  const logs = readJson('stock_logs.json', [])
  if (logs.length) {
    const s = db.prepare('INSERT OR IGNORE INTO stock_logs VALUES (@id,@productId,@productName,@type,@qty,@note,@createdAt)')
    db.transaction(() => logs.forEach(r => s.run({ note: null, ...r })))()
  }
  console.log(`  ✅ stock_logs: ${logs.length} รายการ`)

  // settings
  const settings = readJson('settings.json', {})
  if (Object.keys(settings).length) {
    const s = db.prepare('INSERT OR REPLACE INTO settings VALUES (?, ?)')
    db.transaction(() => Object.entries(settings).forEach(([k, v]) => s.run(k, JSON.stringify(v))))()
  }
  console.log(`  ✅ settings: ${Object.keys(settings).length} keys`)

  // kitchen_orders
  const kOrders = readJson('kitchen_orders.json', [])
  if (kOrders.length) {
    const s = db.prepare('INSERT OR IGNORE INTO kitchen_orders VALUES (@id,@saleId,@receiptNo,@stationId,@stationName,@tableNo,@items,@status,@note,@createdAt,@updatedAt)')
    db.transaction(() => kOrders.forEach(r => s.run({ tableNo: null, note: null, ...r, items: J(r.items) })))()
  }
  console.log(`  ✅ kitchen_orders: ${kOrders.length} รายการ`)

  // open_orders
  const openOrds = readJson('open_orders.json', [])
  if (openOrds.length) {
    const s = db.prepare('INSERT OR IGNORE INTO open_orders VALUES (@id,@orderNo,@tableNo,@items,@note,@memberId,@memberName,@discount,@discountNote,@subtotal,@total,@status,@createdAt,@updatedAt)')
    db.transaction(() => openOrds.forEach(r => s.run({
      tableNo: null, note: null, memberId: null, memberName: null, discountNote: null, ...r,
      items: J(r.items)
    })))()
  }
  console.log(`  ✅ open_orders: ${openOrds.length} รายการ`)

  db.close()

  const dbSize = (fs.statSync(DB_PATH).size / 1024).toFixed(1)
  console.log(`\n✅ Migration เสร็จสมบูรณ์!`)
  console.log(`   ไฟล์ DB: data/happy-pos.db (${dbSize} KB)`)
  console.log(`   Backup:  data/backup_json/`)
  console.log(`\nหมายเหตุ: ไฟล์ .json เดิมยังอยู่ใน data/ สามารถลบได้หลังจากทดสอบแล้ว`)
}

main()
