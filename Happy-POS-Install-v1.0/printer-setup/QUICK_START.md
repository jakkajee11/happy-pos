# Happy POS — Printer Quick Start Guide
**คู่มือติดตั้งเครื่องพิมพ์ ฉบับรวดเร็ว**

---

## ✅ 3 ขั้นตอนหลัก

```
1. ดาวน์โหลด & ติดตั้ง Driver
2. ตั้ง Default Printer บน Windows
3. ตั้ง Paper Size → 80mm
```

---

## 📥 Driver Download Links

### 80mm Thermal USB
| Brand | Model | Driver URL |
|-------|-------|-----------|
| Xprinter | XP-80C, XP-N160II | https://xprinter.net/downloads/ |
| Rongta | RP80 USE | https://rongtatech.com/support/ |
| GPRINTER | GP-80250I | https://gprinter.net.cn/download/ |
| iDPRT | SP320, SP420BT | https://idprt.com/support/ |
| BIXOLON | SRP-330III, SRP-350V | https://www.bixolon.com/board_list.php?board_cate=Support |
| Epson | TM-T20III, TM-T88VII | https://pos.epson.com/support/ |
| Star Micronics | TSP100IV, TSP654II | https://www.starmicronics.com/support/ |
| CITIZEN | CT-S310II | https://www.citizen-systems.com/global/support/ |

### Network / Wi-Fi
| Brand | Model | Driver URL |
|-------|-------|-----------|
| Xprinter | XP-Q801K, XP-N160I LAN | https://xprinter.net/downloads/ |
| Epson | TM-T82III-i (Wi-Fi) | https://pos.epson.com/support/ |

### Bluetooth
| Brand | Model | Driver URL |
|-------|-------|-----------|
| Xprinter | XP-365B | https://xprinter.net/downloads/ |
| Rongta | RPP300BU | https://rongtatech.com/support/ |

---

## ⚙️ Windows — ตั้ง Custom Paper Size 80mm

```
1. Control Panel → Devices and Printers
2. คลิกขวาที่เครื่องพิมพ์ → Printing Preferences
3. Paper tab → Paper Size → Custom
   Width: 80mm  |  Height: 297mm
4. OK → Apply
```

---

## 🌐 Chrome — ตั้งค่าสำหรับ 80mm

```
1. กด Ctrl+P เมื่อต้องการพิมพ์
2. More settings (การตั้งค่าเพิ่มเติม)
3. Paper size: "80mm Receipt" หรือ Custom 80x297
4. Margins: None
5. Scale: 100%
6. Background graphics: เปิด ✓
```

---

## 🔌 Network Printer — ตั้ง Static IP

```bat
REM ทดสอบ ping เครื่องพิมพ์
ping 192.168.1.200

REM ถ้าตอบ → Add Printer
Control Panel → Add Printer → TCP/IP
→ ใส่ IP: 192.168.1.200 → Port: 9100
```

---

## 🔧 Troubleshoot

| ปัญหา | แก้ไข |
|------|------|
| พิมพ์ไม่ออก | ตรวจ Default Printer + รีสตาร์ท Print Spooler |
| ข้อความเกินกว้าง | Paper size ต้อง 80mm, Margins: None |
| Network offline | ping IP ก่อน, ตรวจ firewall TCP:9100 |
| Bluetooth หลุด | ปิด Power Management ของ BT device |
| ไม่มีข้อมูลร้าน | Settings → ร้านค้า → กรอกข้อมูล → Save |

---

> 📄 ดูคู่มือเต็ม: `Happy_POS_Printer_Guide.pdf`
> 🛠️ ติดต่อ: support@happytech.th
