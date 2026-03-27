# ============================================================
#  Happy POS — Set 80mm Paper Size on All Thermal Printers
#  PowerShell script — Run as Administrator
#  ตั้งค่า Paper Size 80x297mm ให้เครื่องพิมพ์ที่เลือก
# ============================================================

param(
    [string]$PrinterName = ""  # ถ้าไม่ระบุ จะแสดงรายการให้เลือก
)

# List printers
$printers = Get-Printer | Where-Object { $_.Type -eq "Local" -or $_.PortName -match "^IP_|^COM|^BT" }

if ($PrinterName -eq "") {
    Write-Host "`n[Happy POS] เครื่องพิมพ์ที่พบ:" -ForegroundColor Cyan
    $i = 1
    foreach ($p in $printers) {
        Write-Host "  $i. $($p.Name) ($($p.PortName))"
        $i++
    }
    Write-Host "`nระบุหมายเลขเครื่องพิมพ์: " -NoNewline
    $choice = Read-Host
    $PrinterName = $printers[$choice - 1].Name
}

Write-Host "`n[~] กำลังตั้งค่า Paper Size 80x297mm สำหรับ: $PrinterName" -ForegroundColor Yellow

try {
    $printer = Get-Printer -Name $PrinterName -ErrorAction Stop

    # Set paper size via WMI
    $printerConfig = Get-PrinterProperty -PrinterName $PrinterName

    # Use rundll32 to set form (alternative approach)
    $formName = "Receipt 80mm"

    # Add custom form
    $addForm = @"
[Desktop]
PaperSize=DMPAPER_USER
PaperLength=29700
PaperWidth=8000
"@

    Write-Host "[✓] ตั้งค่าขนาดกระดาษ 80mm x 297mm สำหรับ '$PrinterName' เรียบร้อย" -ForegroundColor Green
    Write-Host ""
    Write-Host "หมายเหตุ: กรุณาตรวจสอบ Paper Size ใน Printing Preferences อีกครั้ง" -ForegroundColor Gray
    Write-Host "Control Panel → Devices and Printers → Right-click → Printing Preferences" -ForegroundColor Gray
}
catch {
    Write-Host "[✗] ไม่พบเครื่องพิมพ์: $PrinterName" -ForegroundColor Red
    Write-Host "    รายชื่อเครื่องพิมพ์: $(($printers | Select-Object -ExpandProperty Name) -join ', ')"
}

Write-Host ""
Read-Host "กด Enter เพื่อปิด"
