const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(process.cwd(), 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const write = (file, data) => fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2))
const exists = (file) => fs.existsSync(path.join(DATA_DIR, file))

// Settings
if (!exists('settings.json')) {
  write('settings.json', {
    shopName: 'Happy POS ร้านค้า',
    shopAddress: '123 ถนนสุขุมวิท กรุงเทพฯ 10110',
    shopPhone: '02-xxx-xxxx',
    receiptHeader: 'ขอบคุณที่ใช้บริการ',
    receiptFooter: 'ยินดีต้อนรับกลับมาเสมอ',
    receiptShowLogo: false,
    currency: 'THB',
    taxRate: 7,
    pointsPerBaht: 10,
    pointsValue: 1,
    lowStockAlert: 10,
    businessType: 'general',
    primaryColor: '#f59000',
  })
}

// Categories
if (!exists('categories.json')) {
  write('categories.json', [
    { id: 'cat1', name: 'เครื่องดื่ม', icon: '☕', color: '#8B5CF6', createdAt: new Date().toISOString() },
    { id: 'cat2', name: 'อาหาร', icon: '🍜', color: '#F59E0B', createdAt: new Date().toISOString() },
    { id: 'cat3', name: 'ของหวาน', icon: '🍰', color: '#EC4899', createdAt: new Date().toISOString() },
    { id: 'cat4', name: 'สินค้า', icon: '📦', color: '#10B981', createdAt: new Date().toISOString() },
  ])
}

// Products
if (!exists('products.json')) {
  write('products.json', [
    { id: 'p1', name: 'อเมริกาโน่', price: 60, cost: 15, categoryId: 'cat1', stock: 100, trackStock: false, isActive: true, createdAt: new Date().toISOString() },
    { id: 'p2', name: 'ลาเต้', price: 75, cost: 20, categoryId: 'cat1', stock: 100, trackStock: false, isActive: true, createdAt: new Date().toISOString() },
    { id: 'p3', name: 'ชานมไข่มุก', price: 65, cost: 18, categoryId: 'cat1', stock: 100, trackStock: false, isActive: true, createdAt: new Date().toISOString() },
    { id: 'p4', name: 'ส้มปั่น', price: 55, cost: 12, categoryId: 'cat1', stock: 100, trackStock: false, isActive: true, createdAt: new Date().toISOString() },
    { id: 'p5', name: 'ข้าวผัดหมู', price: 80, cost: 30, categoryId: 'cat2', stock: 50, trackStock: false, isActive: true, createdAt: new Date().toISOString() },
    { id: 'p6', name: 'ผัดกะเพราไก่', price: 75, cost: 28, categoryId: 'cat2', stock: 50, trackStock: false, isActive: true, createdAt: new Date().toISOString() },
    { id: 'p7', name: 'ก๋วยเตี๋ยว', price: 70, cost: 25, categoryId: 'cat2', stock: 50, trackStock: false, isActive: true, createdAt: new Date().toISOString() },
    { id: 'p8', name: 'เค้กช็อกโกแลต', price: 90, cost: 35, categoryId: 'cat3', stock: 20, trackStock: true, isActive: true, createdAt: new Date().toISOString() },
    { id: 'p9', name: 'วาฟเฟิล', price: 85, cost: 30, categoryId: 'cat3', stock: 15, trackStock: true, isActive: true, createdAt: new Date().toISOString() },
    { id: 'p10', name: 'น้ำดื่ม', price: 15, cost: 5, categoryId: 'cat4', stock: 200, trackStock: true, barcode: '8850329000012', isActive: true, createdAt: new Date().toISOString() },
  ])
}

// Members
if (!exists('members.json')) {
  write('members.json', [
    { id: 'm1', name: 'คุณสมชาย', phone: '0812345678', points: 150, totalSpent: 1500, joinedAt: new Date().toISOString() },
    { id: 'm2', name: 'คุณสมหญิง', phone: '0898765432', email: 'somying@email.com', points: 320, totalSpent: 3200, joinedAt: new Date().toISOString() },
  ])
}

// Promotions
if (!exists('promotions.json')) {
  write('promotions.json', [
    { id: 'promo1', name: 'ลด 10% ทุกออเดอร์', type: 'percent', value: 10, minAmount: 200, isActive: true, startDate: new Date().toISOString() },
    { id: 'promo2', name: 'ส่วนลด 50 บาท', type: 'amount', value: 50, minAmount: 500, isActive: true, startDate: new Date().toISOString() },
  ])
}

// Empty files
if (!exists('sales.json')) write('sales.json', [])
if (!exists('stock_logs.json')) write('stock_logs.json', [])

console.log('✅ Database initialized successfully!')
