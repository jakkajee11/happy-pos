@echo off
REM ============================================================
REM  Happy POS — Fix Print Spooler
REM  ใช้เมื่อเครื่องพิมพ์ไม่ตอบสนอง หรืองานค้างใน queue
REM  รันด้วย Run as Administrator
REM ============================================================

echo.
echo [Happy POS] กำลังแก้ไข Print Spooler...
echo.

REM Stop spooler
echo -- หยุด Print Spooler...
net stop spooler /y >nul 2>&1
timeout /t 2 /nobreak >nul

REM Clear print queue
echo -- ล้าง Print Queue...
del /Q /F /S "%systemroot%\System32\spool\PRINTERS\*.*" >nul 2>&1

REM Restart spooler
echo -- เริ่ม Print Spooler ใหม่...
net start spooler >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo [✓] เสร็จแล้ว! ลองพิมพ์ใหม่อีกครั้ง
echo.
pause
