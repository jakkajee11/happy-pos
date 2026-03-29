# Happy POS — Printer Setup Package

**แพ็คเกจติดตั้งเครื่องพิมพ์ สำหรับ Happy POS**

---

## 📦 ไฟล์ในแพ็คเกจนี้

| ไฟล์ | คำอธิบาย |
|------|---------|
| `Happy_POS_Printer_Guide.pdf` | **คู่มือหลัก** — รายชื่อเครื่องพิมพ์แนะนำ + ขั้นตอนติดตั้งแบบละเอียด |
| `QUICK_START.md` | คู่มือรวดเร็ว 1 หน้า + driver download links ทั้งหมด |
| `fix_print_spooler.bat` | สคริปต์แก้ไขเมื่อพิมพ์ไม่ออก / queue ค้าง |
| `add_network_printer.bat` | สคริปต์เพิ่มเครื่องพิมพ์ Network (TCP/IP) อัตโนมัติ |
| `set_paper_80mm.ps1` | PowerShell script ตั้ง paper size 80mm |

---

## 🚀 เริ่มต้นใช้งาน

### ขั้นตอนสำหรับผู้ใช้ทั่วไป
1. เปิดอ่าน **`Happy_POS_Printer_Guide.pdf`** ก่อน
2. ดาวน์โหลด driver ตามรุ่นเครื่องพิมพ์ (ดูลิงก์ใน QUICK_START.md)
3. ติดตั้ง driver และตั้ง Default Printer บน Windows
4. เปิด Happy POS → Settings → กรอกข้อมูลร้าน
5. ทดสอบพิมพ์ใบเสร็จ

### สำหรับ IT / ช่างติดตั้ง
- Network printer: รัน `add_network_printer.bat` (Run as Administrator)
- แก้ print queue ค้าง: รัน `fix_print_spooler.bat` (Run as Administrator)
- ตั้ง paper size batch: รัน `set_paper_80mm.ps1` ใน PowerShell (Admin)

---

## 📋 เครื่องพิมพ์แนะนำ (สรุปย่อ)

### 💚 ราคาประหยัด (< ฿2,000)
- **Xprinter XP-80C** — USB, 230mm/s, ราคา ฿1,100-1,400
- **Rongta RP80 USE** — USB, 200mm/s, ราคา ฿1,300-1,600

### 💛 Mid-range (฿2,000-5,000)
- **BIXOLON SRP-330III** — USB/LAN, 220mm/s, ราคา ฿3,000-3,800
- **Epson TM-T20III** — USB/LAN, 250mm/s, ราคา ฿4,000-4,800

### ❤️ Pro (> ฿5,000)
- **Epson TM-T88VII** — USB/LAN/Wi-Fi, 350mm/s, ราคา ฿7,500-9,000

### 🌐 Network/Wi-Fi
- **Xprinter XP-Q801K** — Wi-Fi+USB, ราคา ฿2,000-2,500
- **Epson TM-T82III-i** — Wi-Fi+USB, ราคา ฿5,500-6,500

### 📱 Bluetooth
- **Xprinter XP-365B** — BT 4.0+USB, ราคา ฿1,500-1,900

---

## 🔗 Driver Links

- Xprinter: https://xprinter.net/downloads/
- Rongta: https://rongtatech.com/support/
- BIXOLON: https://www.bixolon.com/board_list.php?board_cate=Support
- Epson: https://pos.epson.com/support/
- Star Micronics: https://www.starmicronics.com/support/
- CITIZEN: https://www.citizen-systems.com/global/support/

---

*Happy POS v1.0 · HappyTech · support@happytech.th*
