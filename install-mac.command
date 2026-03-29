#!/bin/bash
# Happy POS - ตัวติดตั้งอัตโนมัติสำหรับ Mac
# ดับเบิลคลิกไฟล์นี้ แล้วรอจนระบบเปิดให้อัตโนมัติ

set -e

# สี
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
echo -e "  ${CYAN}║     ${BOLD}Happy POS - ตัวติดตั้งอัตโนมัติ${NC}${CYAN}         ║${NC}"
echo -e "  ${CYAN}║     สำหรับ Mac                               ║${NC}"
echo -e "  ${CYAN}║                                              ║${NC}"
echo -e "  ${CYAN}║  ไม่ต้องทำอะไร รอจนระบบเปิดใช้งานเอง        ║${NC}"
echo -e "  ${CYAN}║                                              ║${NC}"
echo -e "  ${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

INSTALL_DIR="$HOME/HappyPOS"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOCAL_MODE=0

# ตรวจสอบว่ามีไฟล์โปรเจกต์อยู่ในโฟลเดอร์เดียวกันหรือไม่
if [[ -f "$SCRIPT_DIR/package.json" ]]; then
    LOCAL_MODE=1
fi

# ฟังก์ชันแสดงสถานะ
ok()   { echo -e "  ${GREEN}[OK]${NC}    $1"; }
fail() { echo -e "  ${RED}[X]${NC}     $1"; }
info() { echo -e "  ${YELLOW}[*]${NC}     $1"; }
step() { echo -e "  ${BLUE}[$1]${NC} $2"; }

# =============================================
# [1/6] ตรวจสอบและติดตั้ง Homebrew
# =============================================
step "1/6" "ตรวจสอบ Homebrew..."

# ตรวจสอบ Homebrew ทั้ง Intel และ Apple Silicon
if [[ -f "/opt/homebrew/bin/brew" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
elif [[ -f "/usr/local/bin/brew" ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
fi

if ! command -v brew &>/dev/null; then
    info "ไม่พบ Homebrew - กำลังติดตั้งให้อัตโนมัติ..."
    echo "  (ถ้ามีหน้าต่างถามรหัสผ่าน กรุณาพิมพ์รหัสผ่าน Mac แล้วกด Enter)"
    echo ""
    NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # เพิ่ม Homebrew ใน PATH
    if [[ -f "/opt/homebrew/bin/brew" ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile" 2>/dev/null || true
    fi

    if command -v brew &>/dev/null; then
        ok "ติดตั้ง Homebrew สำเร็จ!"
    else
        fail "ติดตั้ง Homebrew ไม่สำเร็จ"
        echo "  กรุณาติดตั้งเองที่ https://brew.sh แล้วดับเบิลคลิกไฟล์นี้อีกครั้ง"
        echo "  หน้าต่างจะปิดอัตโนมัติใน 15 วินาที..."
        sleep 15
        exit 1
    fi
else
    ok "พบ Homebrew"
fi

echo ""

# =============================================
# [2/6] ตรวจสอบและติดตั้ง Node.js
# =============================================
step "2/6" "ตรวจสอบ Node.js..."

if ! command -v node &>/dev/null; then
    info "ไม่พบ Node.js - กำลังติดตั้งให้อัตโนมัติ..."
    echo "         (ใช้เวลาประมาณ 1-3 นาที)"
    brew install node@20 2>&1 | tail -2
    brew link node@20 --force --overwrite 2>/dev/null || true

    if command -v node &>/dev/null; then
        ok "ติดตั้ง Node.js สำเร็จ! ($(node -v))"
    else
        fail "ติดตั้ง Node.js ไม่สำเร็จ"
        echo "  กรุณาดาวน์โหลดเองที่ https://nodejs.org แล้วดับเบิลคลิกไฟล์นี้อีกครั้ง"
        sleep 15
        exit 1
    fi
else
    ok "พบ Node.js $(node -v)"
fi

echo ""

# =============================================
# [3/6] ตรวจสอบ Git (ข้ามถ้ามีไฟล์ในเครื่อง)
# =============================================
if [[ "$LOCAL_MODE" -eq 1 ]]; then
    step "3/6" "ข้ามการติดตั้ง Git (ใช้ไฟล์ในเครื่อง)"
else
    step "3/6" "ตรวจสอบ Git..."

    if ! command -v git &>/dev/null; then
        info "ไม่พบ Git - กำลังติดตั้ง..."
        brew install git 2>&1 | tail -2

        if command -v git &>/dev/null; then
            ok "ติดตั้ง Git สำเร็จ!"
        else
            fail "ติดตั้ง Git ไม่สำเร็จ"
            echo "  กรุณาติดตั้ง Xcode Command Line Tools:"
            echo "  เปิด Terminal แล้วพิมพ์: xcode-select --install"
            sleep 15
            exit 1
        fi
    else
        ok "พบ $(git --version)"
    fi
fi

echo ""

# =============================================
# [4/6] เตรียมไฟล์ Happy POS
# =============================================
step "4/6" "เตรียมไฟล์ Happy POS..."

if [[ "$LOCAL_MODE" -eq 1 ]]; then
    # --- ติดตั้งจากไฟล์ในเครื่อง ---
    REAL_SCRIPT_DIR="$(cd "$SCRIPT_DIR" && pwd -P)"
    REAL_INSTALL_DIR="$(mkdir -p "$INSTALL_DIR" && cd "$INSTALL_DIR" && pwd -P)"

    if [[ "$REAL_SCRIPT_DIR" == "$REAL_INSTALL_DIR" ]]; then
        ok "อยู่ในโฟลเดอร์ติดตั้งอยู่แล้ว"
        cd "$INSTALL_DIR"
    elif [[ -f "$INSTALL_DIR/package.json" ]]; then
        echo "         กำลังอัปเดตไฟล์..."
        rsync -a --exclude='node_modules' --exclude='.git' --exclude='data/*.db' --exclude='data/*.db-*' "$SCRIPT_DIR/" "$INSTALL_DIR/"
        cd "$INSTALL_DIR"
        ok "อัปเดตไฟล์สำเร็จ!"
    else
        echo "         กำลังคัดลอกไฟล์ไปที่ $INSTALL_DIR..."
        mkdir -p "$INSTALL_DIR"
        rsync -a --exclude='node_modules' --exclude='.git' "$SCRIPT_DIR/" "$INSTALL_DIR/"
        cd "$INSTALL_DIR"
        ok "คัดลอกไฟล์สำเร็จ!"
    fi
else
    # --- ดาวน์โหลดจาก GitHub ---
    if [[ -f "$INSTALL_DIR/package.json" ]]; then
        echo "         กำลังอัปเดต..."
        cd "$INSTALL_DIR"
        git pull origin main 2>/dev/null || true
        ok "อัปเดตสำเร็จ!"
    else
        echo "         กำลังดาวน์โหลดจาก GitHub..."
        git clone https://github.com/happydaddy/happy-pos.git "$INSTALL_DIR" 2>/dev/null

        if [[ $? -ne 0 ]]; then
            fail "ดาวน์โหลดไม่สำเร็จ"
            echo "  ตรวจสอบอินเทอร์เน็ต แล้วดับเบิลคลิกไฟล์นี้อีกครั้ง"
            sleep 15
            exit 1
        fi
        cd "$INSTALL_DIR"
        ok "ดาวน์โหลดสำเร็จ!"
    fi
fi

echo ""

# =============================================
# [5/6] ติดตั้ง Dependencies + Init DB
# =============================================
step "5/6" "ติดตั้ง packages (ใช้เวลาประมาณ 2-5 นาที)..."
echo "         กรุณารอสักครู่ อย่าปิดหน้าต่างนี้"
echo ""
cd "$INSTALL_DIR"
npm install 2>&1 | tail -5

ok "ติดตั้ง packages สำเร็จ!"
echo ""

echo "         สร้างฐานข้อมูลเริ่มต้น..."
node scripts/init-db.js 2>/dev/null || true
ok "สร้างฐานข้อมูลสำเร็จ!"
echo ""

# =============================================
# [6/6] สร้าง Shortcut บน Desktop
# =============================================
step "6/6" "สร้าง shortcut บน Desktop..."

chmod +x "$INSTALL_DIR/start-happy-pos.command" 2>/dev/null || true

DESKTOP="$HOME/Desktop"
START_SCRIPT="$INSTALL_DIR/start-happy-pos.command"

if [[ -f "$START_SCRIPT" ]]; then
    ln -sf "$START_SCRIPT" "$DESKTOP/Happy POS.command" 2>/dev/null || true
    chmod +x "$DESKTOP/Happy POS.command" 2>/dev/null || true
fi

ok "สร้าง shortcut \"Happy POS\" บน Desktop แล้ว!"
echo ""

# =============================================
# ติดตั้งเสร็จ! เปิดระบบอัตโนมัติทันที
# =============================================
echo ""
echo -e "  ${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "  ${GREEN}║                                              ║${NC}"
echo -e "  ${GREEN}║    ติดตั้ง Happy POS สำเร็จแล้ว!             ║${NC}"
echo -e "  ${GREEN}║                                              ║${NC}"
echo -e "  ${GREEN}║    กำลังเปิดระบบให้อัตโนมัติ...              ║${NC}"
echo -e "  ${GREEN}║                                              ║${NC}"
echo -e "  ${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
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

# เปิดเบราว์เซอร์หลัง 5 วินาที
(sleep 5 && open "http://localhost:21300") &

# เริ่ม server
npm run dev
