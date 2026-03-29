#!/bin/bash
# Happy POS - เปิดระบบ POS
# ดับเบิลคลิกไฟล์นี้เพื่อเปิด Happy POS
# ติดตั้งทุกอย่างให้อัตโนมัติถ้ายังไม่มี

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

clear

echo ""
echo -e "  ${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "  ${CYAN}║                                              ║${NC}"
echo -e "  ${CYAN}║        ${BOLD}Happy POS - เปิดระบบ${NC}${CYAN}                 ║${NC}"
echo -e "  ${CYAN}║                                              ║${NC}"
echo -e "  ${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# หาตำแหน่งโปรเจกต์
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="$HOME/HappyPOS"

# ถ้ารันจากโฟลเดอร์โปรเจกต์โดยตรง
if [[ -f "$SCRIPT_DIR/package.json" ]]; then
    INSTALL_DIR="$SCRIPT_DIR"
fi

# ตรวจสอบว่ามีไฟล์โปรเจกต์
if [[ ! -f "$INSTALL_DIR/package.json" ]]; then
    echo -e "  ${RED}[!] ไม่พบไฟล์ Happy POS${NC}"
    echo "  กรุณารัน install-mac.command ก่อน"
    echo "  หน้าต่างจะปิดอัตโนมัติใน 10 วินาที..."
    sleep 10
    exit 1
fi

# =============================================
# ตรวจสอบ Homebrew PATH (Apple Silicon)
# =============================================
if [[ -f "/opt/homebrew/bin/brew" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
elif [[ -f "/usr/local/bin/brew" ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
fi

# =============================================
# ตรวจสอบ Node.js - ถ้าไม่มีก็ติดตั้งให้เลย
# =============================================
if ! command -v node &>/dev/null; then
    echo -e "  ${YELLOW}[*] ไม่พบ Node.js - กำลังติดตั้งให้อัตโนมัติ...${NC}"
    echo ""

    # ติดตั้ง Homebrew ถ้ายังไม่มี
    if ! command -v brew &>/dev/null; then
        echo "  กำลังติดตั้ง Homebrew..."
        echo "  (ถ้ามีหน้าต่างถามรหัสผ่าน กรุณาพิมพ์รหัสผ่าน Mac แล้วกด Enter)"
        NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

        if [[ -f "/opt/homebrew/bin/brew" ]]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile" 2>/dev/null || true
        fi
    fi

    # ติดตั้ง Node.js
    echo "  กำลังติดตั้ง Node.js..."
    brew install node@20 2>&1 | tail -2
    brew link node@20 --force --overwrite 2>/dev/null || true

    if ! command -v node &>/dev/null; then
        echo -e "  ${RED}[X] ติดตั้ง Node.js ไม่สำเร็จ${NC}"
        echo "  กรุณาดาวน์โหลดเองที่ https://nodejs.org"
        sleep 15
        exit 1
    fi
    echo -e "  ${GREEN}[OK] ติดตั้ง Node.js สำเร็จ! ($(node -v))${NC}"
    echo ""
fi

# =============================================
# ตรวจสอบ node_modules - ถ้าไม่มีก็ติดตั้งให้เลย
# =============================================
if [[ ! -d "$INSTALL_DIR/node_modules" ]]; then
    echo -e "  ${YELLOW}[*] ยังไม่ได้ติดตั้ง packages - กำลังติดตั้งให้อัตโนมัติ...${NC}"
    echo "      (ใช้เวลาประมาณ 2-5 นาที กรุณารอสักครู่)"
    echo ""
    cd "$INSTALL_DIR"
    npm install 2>&1 | tail -5
    echo -e "  ${GREEN}[OK] ติดตั้ง packages สำเร็จ!${NC}"
    echo ""
fi

# =============================================
# สร้างฐานข้อมูลถ้ายังไม่มี
# =============================================
if [[ ! -f "$INSTALL_DIR/data/happy-pos.db" ]]; then
    echo -e "  ${YELLOW}[*] สร้างฐานข้อมูลเริ่มต้น...${NC}"
    cd "$INSTALL_DIR"
    node scripts/init-db.js 2>/dev/null || true
    echo -e "  ${GREEN}[OK] สร้างฐานข้อมูลสำเร็จ!${NC}"
    echo ""
fi

# =============================================
# ตรวจสอบว่า port 21300 ถูกใช้อยู่แล้วหรือไม่
# =============================================
if lsof -i :21300 &>/dev/null; then
    echo -e "  ${GREEN}[OK] Happy POS กำลังทำงานอยู่แล้ว!${NC}"
    echo "      กำลังเปิดเบราว์เซอร์..."
    open "http://localhost:21300"
    sleep 2
    exit 0
fi

# =============================================
# เริ่มต้น Happy POS
# =============================================
echo "  ═══════════════════════════════════════════"
echo -e "  Happy POS กำลังเริ่มต้น..."
echo -e "  เบราว์เซอร์จะเปิดอัตโนมัติ"
echo ""
echo -e "  ที่อยู่: ${BOLD}http://localhost:21300${NC}"
echo ""
echo -e "  ${YELLOW}* อย่าปิดหน้าต่างนี้ขณะใช้งาน *${NC}"
echo -e "  ${YELLOW}* กด Ctrl+C เพื่อปิดระบบ *${NC}"
echo "  ═══════════════════════════════════════════"
echo ""

cd "$INSTALL_DIR"

# เปิดเบราว์เซอร์หลัง 4 วินาที
(sleep 4 && open "http://localhost:21300") &

# เริ่ม server
npm run dev
