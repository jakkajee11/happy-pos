@echo off
REM ============================================================
REM  Happy POS — Add Network Thermal Printer (TCP/IP)
REM  แก้ไข IP_ADDRESS ด้านล่างให้ตรงกับเครื่องพิมพ์ของคุณ
REM  รันด้วย Run as Administrator
REM ============================================================

REM ── ตั้งค่าตรงนี้ ──────────────────────────────────────────
set IP_ADDRESS=192.168.1.200
set PRINTER_PORT=9100
set PRINTER_NAME=HappyPOS-Printer
REM ─────────────────────────────────────────────────────────────

echo.
echo [Happy POS] เพิ่มเครื่องพิมพ์ Network: %IP_ADDRESS%
echo.

REM Test ping
echo -- ทดสอบ ping %IP_ADDRESS%...
ping -n 2 %IP_ADDRESS% >nul 2>&1
if errorlevel 1 (
    echo [✗] ไม่สามารถ ping %IP_ADDRESS% ได้
    echo     ตรวจสอบ: IP ถูกต้อง? เครื่องพิมพ์เปิดอยู่? เชื่อมต่อ LAN แล้ว?
    pause
    exit /b 1
)
echo [✓] ping สำเร็จ

REM Add TCP port
echo -- เพิ่ม TCP/IP Port...
cscript /nologo %windir%\system32\prnport.vbs -a -r "IP_%IP_ADDRESS%" -h %IP_ADDRESS% -o raw -n %PRINTER_PORT% >nul 2>&1

REM Add printer (Generic / Text Only — เปลี่ยน driver ถ้ามี)
echo -- เพิ่มเครื่องพิมพ์ %PRINTER_NAME%...
cscript /nologo %windir%\system32\prnadd.vbs -p "%PRINTER_NAME%" -r "IP_%IP_ADDRESS%" -m "Generic / Text Only" >nul 2>&1

REM Set as default
echo -- ตั้ง Default Printer...
cscript /nologo %windir%\system32\prnmngr.vbs -t -p "%PRINTER_NAME%" >nul 2>&1

echo.
echo [✓] เพิ่มเครื่องพิมพ์ '%PRINTER_NAME%' (%IP_ADDRESS%) เรียบร้อย
echo.
echo หมายเหตุ: หากต้องใช้ driver เฉพาะรุ่น ให้ติดตั้ง driver ก่อน
echo แล้วเปลี่ยน driver ใน Control Panel - Printers - Properties
echo.
pause
