@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Happy POS
color 0A

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║                                              ║
echo  ║        Happy POS - เปิดระบบ                  ║
echo  ║                                              ║
echo  ╚══════════════════════════════════════════════╝
echo.

REM =============================================
REM หาตำแหน่งโปรเจกต์
REM =============================================
set "INSTALL_DIR=%USERPROFILE%\HappyPOS"

if exist "%~dp0package.json" (
    set "INSTALL_DIR=%~dp0"
    REM ลบ trailing backslash
    if "!INSTALL_DIR:~-1!"=="\" set "INSTALL_DIR=!INSTALL_DIR:~0,-1!"
)

REM =============================================
REM ตรวจสอบว่ามีไฟล์โปรเจกต์
REM =============================================
if not exist "%INSTALL_DIR%\package.json" (
    echo  [!] ไม่พบไฟล์ Happy POS
    echo  [!] กรุณารัน install-windows.bat ก่อน
    echo.
    timeout /t 10
    exit /b 1
)

REM =============================================
REM ตรวจสอบ Node.js - ถ้าไม่มีก็ติดตั้งให้เลย
REM =============================================
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo  [*] ไม่พบ Node.js - กำลังติดตั้งให้อัตโนมัติ...
    echo.

    REM ขอสิทธิ์ Admin สำหรับติดตั้ง Node.js
    net session >nul 2>&1
    if !errorLevel! neq 0 (
        echo  [*] ต้องการสิทธิ์ผู้ดูแลระบบเพื่อติดตั้ง Node.js
        echo  [*] กำลังขอสิทธิ์... ถ้ามีหน้าต่างถาม กรุณากด "Yes"
        powershell -Command "Start-Process '%~f0' -Verb RunAs"
        exit /b 0
    )

    echo  กำลังดาวน์โหลด Node.js v20 LTS...
    powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile '%TEMP%\nodejs-install.msi' }"

    if exist "%TEMP%\nodejs-install.msi" (
        echo  กำลังติดตั้ง Node.js...
        msiexec /i "%TEMP%\nodejs-install.msi" /qn /norestart
        set "PATH=%PATH%;C:\Program Files\nodejs"
        del "%TEMP%\nodejs-install.msi" >nul 2>&1
        echo  [OK] ติดตั้ง Node.js สำเร็จ!
    ) else (
        echo  [X] ดาวน์โหลด Node.js ไม่สำเร็จ
        echo  กรุณาดาวน์โหลดเองที่ https://nodejs.org
        timeout /t 15
        exit /b 1
    )
    echo.
)

REM =============================================
REM ตรวจสอบ node_modules - ถ้าไม่มีก็ติดตั้งให้เลย
REM =============================================
if not exist "%INSTALL_DIR%\node_modules" (
    echo  [*] ยังไม่ได้ติดตั้ง packages - กำลังติดตั้งให้อัตโนมัติ...
    echo      (ใช้เวลาประมาณ 2-5 นาที กรุณารอสักครู่)
    echo.
    cd /d "%INSTALL_DIR%"
    call npm install >nul 2>&1
    echo  [OK] ติดตั้ง packages สำเร็จ!
    echo.
)

REM =============================================
REM สร้างฐานข้อมูลถ้ายังไม่มี
REM =============================================
if not exist "%INSTALL_DIR%\data\happy-pos.db" (
    echo  [*] สร้างฐานข้อมูลเริ่มต้น...
    cd /d "%INSTALL_DIR%"
    call node scripts/init-db.js >nul 2>&1
    echo  [OK] สร้างฐานข้อมูลสำเร็จ!
    echo.
)

REM =============================================
REM ตรวจสอบว่า port 21300 ถูกใช้อยู่แล้วหรือไม่
REM =============================================
netstat -ano | findstr ":21300" >nul 2>&1
if %errorLevel% equ 0 (
    echo  [OK] Happy POS กำลังทำงานอยู่แล้ว!
    echo       กำลังเปิดเบราว์เซอร์...
    start http://localhost:21300
    timeout /t 3 /nobreak >nul
    exit /b 0
)

REM =============================================
REM เริ่มต้น Happy POS
REM =============================================
title Happy POS - กำลังทำงาน

echo  ═══════════════════════════════════════════
echo   Happy POS กำลังเริ่มต้น...
echo   เบราว์เซอร์จะเปิดอัตโนมัติ
echo.
echo   ที่อยู่: http://localhost:21300
echo.
echo   * อย่าปิดหน้าต่างนี้ขณะใช้งาน *
echo   * กด Ctrl+C เพื่อปิดระบบ *
echo  ═══════════════════════════════════════════
echo.

cd /d "%INSTALL_DIR%"

REM เปิดเบราว์เซอร์หลัง 4 วินาที
start /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:21300"

REM เริ่ม server
call npm run dev
