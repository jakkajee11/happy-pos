@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Happy POS - กำลังติดตั้ง...
color 0A

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║                                              ║
echo  ║        Happy POS - ตัวติดตั้งอัตโนมัติ       ║
echo  ║        สำหรับ Windows                        ║
echo  ║                                              ║
echo  ║  ไม่ต้องทำอะไร รอจนระบบเปิดใช้งานเอง        ║
echo  ║                                              ║
echo  ╚══════════════════════════════════════════════╝
echo.

REM =============================================
REM ตรวจสอบสิทธิ์ Administrator - ถ้าไม่มีจะขอยกระดับอัตโนมัติ
REM =============================================
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo  [*] กำลังขอสิทธิ์ผู้ดูแลระบบ...
    echo  [*] ถ้ามีหน้าต่างถามสิทธิ์ กรุณากด "Yes" หรือ "ใช่"
    echo.
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b 0
)

REM =============================================
REM ตั้งค่าตำแหน่ง
REM =============================================
set "SCRIPT_DIR=%~dp0"
set "INSTALL_DIR=%USERPROFILE%\HappyPOS"
set "LOCAL_MODE=0"

if exist "%SCRIPT_DIR%package.json" (
    set "LOCAL_MODE=1"
)

REM =============================================
REM [1/6] ติดตั้ง Node.js
REM =============================================
echo  [1/6] ตรวจสอบ Node.js...

where node >nul 2>&1
if %errorLevel% neq 0 (
    echo         ไม่พบ Node.js - กำลังดาวน์โหลดและติดตั้งให้อัตโนมัติ...
    echo         (ใช้เวลาประมาณ 1-3 นาที)
    echo.

    powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile '%TEMP%\nodejs-install.msi' }"

    if not exist "%TEMP%\nodejs-install.msi" (
        echo  [X] ดาวน์โหลด Node.js ไม่สำเร็จ - ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
        echo.
        echo  กรุณาดาวน์โหลดเองที่ https://nodejs.org
        echo  ติดตั้งให้เสร็จ แล้วดับเบิลคลิกไฟล์นี้อีกครั้ง
        echo.
        timeout /t 15
        exit /b 1
    )

    echo         กำลังติดตั้ง Node.js...
    msiexec /i "%TEMP%\nodejs-install.msi" /qn /norestart

    REM รีเฟรช PATH
    set "PATH=%PATH%;C:\Program Files\nodejs"

    where node >nul 2>&1
    if !errorLevel! neq 0 (
        echo  [X] ติดตั้ง Node.js ไม่สำเร็จ
        echo  กรุณาดาวน์โหลดเองที่ https://nodejs.org
        echo  ติดตั้งให้เสร็จ แล้วดับเบิลคลิกไฟล์นี้อีกครั้ง
        echo.
        timeout /t 15
        exit /b 1
    )

    echo  [OK]    ติดตั้ง Node.js สำเร็จ!
    del "%TEMP%\nodejs-install.msi" >nul 2>&1
) else (
    for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
    echo  [OK]    พบ Node.js !NODE_VER!
)

echo.

REM =============================================
REM [2/6] ติดตั้ง Git (ข้ามถ้ามีไฟล์ในเครื่อง)
REM =============================================
if "%LOCAL_MODE%"=="1" (
    echo  [2/6] ข้ามการติดตั้ง Git (ใช้ไฟล์ในเครื่อง)
) else (
    echo  [2/6] ตรวจสอบ Git...
    where git >nul 2>&1
    if !errorLevel! neq 0 (
        echo         ไม่พบ Git - กำลังดาวน์โหลดและติดตั้งให้อัตโนมัติ...
        echo.

        powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.47.0.windows.1/Git-2.47.0-64-bit.exe' -OutFile '%TEMP%\git-install.exe' }"

        if not exist "%TEMP%\git-install.exe" (
            echo  [X] ดาวน์โหลด Git ไม่สำเร็จ
            echo  ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วดับเบิลคลิกไฟล์นี้อีกครั้ง
            echo.
            timeout /t 15
            exit /b 1
        )

        echo         กำลังติดตั้ง Git...
        "%TEMP%\git-install.exe" /VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS

        set "PATH=%PATH%;C:\Program Files\Git\cmd"

        echo  [OK]    ติดตั้ง Git สำเร็จ!
        del "%TEMP%\git-install.exe" >nul 2>&1
    ) else (
        for /f "tokens=*" %%i in ('git --version') do set GIT_VER=%%i
        echo  [OK]    พบ !GIT_VER!
    )
)

echo.

REM =============================================
REM [3/6] เตรียมไฟล์ Happy POS
REM =============================================
echo  [3/6] เตรียมไฟล์ Happy POS...

if "%LOCAL_MODE%"=="1" (
    REM --- ติดตั้งจากไฟล์ในเครื่อง ---
    if /i "%SCRIPT_DIR:~0,-1%" == "%INSTALL_DIR%" (
        echo  [OK]    อยู่ในโฟลเดอร์ติดตั้งอยู่แล้ว
        cd /d "%INSTALL_DIR%"
    ) else if exist "%INSTALL_DIR%\package.json" (
        echo         กำลังอัปเดตไฟล์...
        robocopy "%SCRIPT_DIR%" "%INSTALL_DIR%" /E /XD node_modules .git data /XF *.db /NFL /NDL /NJH /NJS /NC /NS >nul 2>&1
        cd /d "%INSTALL_DIR%"
        echo  [OK]    อัปเดตไฟล์สำเร็จ!
    ) else (
        echo         กำลังคัดลอกไฟล์ไปที่ %INSTALL_DIR%...
        robocopy "%SCRIPT_DIR%" "%INSTALL_DIR%" /E /XD node_modules .git /NFL /NDL /NJH /NJS /NC /NS >nul 2>&1
        cd /d "%INSTALL_DIR%"
        echo  [OK]    คัดลอกไฟล์สำเร็จ!
    )
) else (
    REM --- ดาวน์โหลดจาก GitHub ---
    if exist "%INSTALL_DIR%\package.json" (
        echo         กำลังอัปเดต...
        cd /d "%INSTALL_DIR%"
        git pull origin main >nul 2>&1
        echo  [OK]    อัปเดตสำเร็จ!
    ) else (
        echo         กำลังดาวน์โหลดจาก GitHub...
        git clone https://github.com/happydaddy/happy-pos.git "%INSTALL_DIR%" >nul 2>&1
        if !errorLevel! neq 0 (
            echo  [X] ดาวน์โหลดไม่สำเร็จ
            echo  ตรวจสอบอินเทอร์เน็ต แล้วดับเบิลคลิกไฟล์นี้อีกครั้ง
            echo.
            timeout /t 15
            exit /b 1
        )
        cd /d "%INSTALL_DIR%"
        echo  [OK]    ดาวน์โหลดสำเร็จ!
    )
)

echo.

REM =============================================
REM [4/6] ติดตั้ง Dependencies
REM =============================================
echo  [4/6] ติดตั้ง packages (ใช้เวลาประมาณ 2-5 นาที)...
echo         กรุณารอสักครู่ อย่าปิดหน้าต่างนี้
echo.
cd /d "%INSTALL_DIR%"
call npm install >nul 2>&1

if %errorLevel% neq 0 (
    echo         ลองติดตั้งอีกครั้ง...
    call npm install 2>nul
)

echo  [OK]    ติดตั้ง packages สำเร็จ!
echo.

REM =============================================
REM [5/6] สร้างฐานข้อมูลเริ่มต้น
REM =============================================
echo  [5/6] สร้างฐานข้อมูลเริ่มต้น...
cd /d "%INSTALL_DIR%"
call node scripts/init-db.js >nul 2>&1
echo  [OK]    สร้างฐานข้อมูลสำเร็จ!
echo.

REM =============================================
REM [6/6] สร้าง Shortcut บน Desktop
REM =============================================
echo  [6/6] สร้าง shortcut บน Desktop...

set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT=%DESKTOP%\Happy POS.lnk"
set "START_SCRIPT=%INSTALL_DIR%\start-happy-pos.bat"

powershell -Command "& { $ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%START_SCRIPT%'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Description = 'เปิด Happy POS'; $s.IconLocation = 'shell32.dll,21'; $s.Save() }" >nul 2>&1

echo  [OK]    สร้าง shortcut "Happy POS" บน Desktop แล้ว!
echo.

REM =============================================
REM ติดตั้งเสร็จ! เปิดระบบอัตโนมัติทันที
REM =============================================
echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║                                              ║
echo  ║    ติดตั้ง Happy POS สำเร็จแล้ว!             ║
echo  ║                                              ║
echo  ║    กำลังเปิดระบบให้อัตโนมัติ...              ║
echo  ║                                              ║
echo  ╚══════════════════════════════════════════════╝
echo.

REM ===== เปิด Happy POS ทันที =====
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

REM เปิดเบราว์เซอร์หลัง 5 วินาที
start /b cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:21300"

REM เริ่ม server
call npm run dev
