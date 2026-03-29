# 🧾 Happy POS

ระบบ Point of Sale สำหรับธุรกิจ SME ไทย — ออฟไลน์ · ใช้งานง่าย · ไม่ต้องพึ่ง Cloud

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

### 🛒 หน้าขาย (POS)
- ค้นหาสินค้า / สแกนบาร์โค้ด (auto-add)
- จัดการตะกร้า + หมายเหตุต่อรายการ (ส่งครัว)
- เลือกสมาชิก + สะสมแต้ม
- ส่วนลด: manual / โปรโมชั่น / promo code / Buy X Get Y
- ระบุหมายเลขโต๊ะ

### 💳 ชำระเงิน
- เงินสด (พร้อมคำนวณเงินทอน + quick amounts)
- QR PromptPay (gen QR ตามยอดจริง · EMV standard)
- บัตรเครดิต / อื่นๆ
- **แยกจ่าย 2–6 คน** (3 โหมด):
  - เท่าๆ กัน — หารเท่ากัน + tracker จ่ายรายคน
  - กำหนดยอด — ใส่ยอดต่อคน + auto-fill คนสุดท้าย
  - แบ่งรายการ — กดเลือกว่าแต่ละรายการเป็นของคนไหน ระบบคำนวณยอดให้

### 🍳 Kitchen Display System (KDS)
- ส่ง order ไปครัว/บาร์แบบ real-time
- แยกตาม Station (ครัว, บาร์, ฯลฯ)
- Status flow: `pending → preparing → ready → done`
- พิมพ์ KOT อัตโนมัติเมื่อสั่ง

### 📋 ออเดอร์ที่เปิดอยู่ (Open Orders)
- บันทึกออเดอร์พัก / Dine-in
- กลับมาชำระภายหลังได้
- Dashboard badge แสดง live count + alert ค้างนาน > 30 นาที

### 📱 QR Code เมนูลูกค้า
- ลูกค้าสแกน QR บนโต๊ะ → สั่งอาหารเองจากมือถือ
- ออเดอร์เข้าระบบอัตโนมัติ
- สร้าง QR ต่อโต๊ะ + พิมพ์ได้ใน Settings

### 📊 รายงาน & Dashboard
- Dashboard: ยอดขายวันนี้, สินค้าขายดี, กราฟรายชั่วโมง
- ปิดยอดประจำวัน (พิมพ์ 80mm thermal)
- รายงานยอดขาย + Export CSV

### 🏪 จัดการร้าน
- สินค้า + หมวดหมู่ + บาร์โค้ด
- คลังสินค้า (stock in/out/adjust)
- สมาชิก + คะแนนสะสม
- โปรโมชั่น + ส่วนลด
- ตั้งค่าใบเสร็จ (logo, ชื่อร้าน, footer)
- Themes: 10 สีสำเร็จรูป + custom color

---

## 🖥️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 App Router + TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | lucide-react |
| Storage | File-based JSON (offline-first) |
| QR Code | qrcode + EMV PromptPay (pure TS) |
| Printing | Browser Print API (80mm thermal) |
| Port | 21300 |

---

## 🚀 เริ่มใช้งาน

### ความต้องการ
- Node.js 18+
- npm 9+

### ติดตั้ง

```bash
git clone https://github.com/jakkajee11/happy-pos.git
cd happy-pos
npm install
npm run dev
```

เปิดเบราว์เซอร์ที่ → **http://localhost:21300**

### เปิดจากมือถือในเครือข่ายเดียวกัน

```bash
# หา IP เครื่อง (macOS)
ipconfig getifaddr en0

# เปิดบนมือถือ
http://<IP เครื่อง>:21300
```

---

## 📁 โครงสร้างโปรเจกต์

```
happy-pos/
├── app/
│   ├── page.tsx              ← Dashboard
│   ├── pos/                  ← หน้าขาย
│   ├── menu/                 ← QR Menu (ลูกค้า)
│   ├── orders/               ← ออเดอร์ที่เปิดอยู่
│   ├── closing/              ← ปิดยอดประจำวัน
│   ├── kitchen/[stationId]/  ← Kitchen Display
│   ├── products/             ← จัดการสินค้า
│   ├── inventory/            ← คลังสินค้า
│   ├── reports/              ← รายงานยอดขาย
│   ├── members/              ← สมาชิก
│   ├── promotions/           ← โปรโมชั่น
│   └── settings/             ← ตั้งค่า
├── components/
│   ├── POSClient.tsx         ← หน้าขาย (main UI)
│   ├── MenuClient.tsx        ← เมนูลูกค้า (QR)
│   ├── KitchenDisplay.tsx    ← KDS realtime
│   ├── PromptPayQR.tsx       ← QR PromptPay
│   ├── ReceiptModal.tsx      ← ใบเสร็จ + พิมพ์
│   ├── DashboardClient.tsx   ← Dashboard
│   └── ...
├── lib/
│   ├── db.ts                 ← Types + JSON DB helpers
│   ├── promptpay.ts          ← EMV QR generator (CRC-16)
│   └── themes.ts             ← Theme system
├── data/                     ← ข้อมูล JSON (local storage)
└── printer-setup/            ← คู่มือเครื่องพิมพ์ + scripts
```

---

## 🖨️ เครื่องพิมพ์ที่รองรับ

รองรับเครื่องพิมพ์ thermal 80mm ทุกยี่ห้อผ่าน Browser Print API

| ประเภท | วิธีเชื่อมต่อ |
|--------|-------------|
| USB | ต่อสาย USB → ตั้งเป็น Default Printer |
| Network/Wi-Fi | ใส่ IP ใน Settings → เครื่องพิมพ์ |
| Bluetooth | จับคู่กับ OS → ตั้งเป็น Default Printer |

ดูคู่มือเต็มได้ที่ [`printer-setup/`](./printer-setup/) หรือไฟล์ `Happy_POS_Printer_Guide.pdf`

---

## ⚙️ ตั้งค่าเบื้องต้น

1. ไปที่ **Settings → ร้านค้า** — ใส่ชื่อร้าน, PromptPay ID
2. ไปที่ **Settings → สถานี** — ตั้งค่าครัว/บาร์ และผูกสินค้า
3. ไปที่ **Settings → เครื่องพิมพ์** — เพิ่มเครื่องพิมพ์
4. ไปที่ **Settings → QR เมนู** — สร้าง QR ต่อโต๊ะ
5. เพิ่มสินค้าที่ **Products**

---

## 💾 Backup ข้อมูล

ข้อมูลทั้งหมดเก็บใน folder `data/` เป็นไฟล์ JSON

```bash
# Backup
cp -r data/ data-backup-$(date +%Y%m%d)/

# Restore
cp -r data-backup-20260101/ data/
```

---

## 📝 License

MIT © 2026 HappyTech
