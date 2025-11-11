# Test Installer Script
# Run this script after building the installer to verify

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Magic English Installer Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check installer exists
$installerPath = "dist\Magic English-Setup-1.0.0.exe"
if (Test-Path $installerPath) {
    $size = (Get-Item $installerPath).Length / 1MB
    Write-Host "[OK] Installer found: $installerPath" -ForegroundColor Green
    Write-Host "     Size: $([math]::Round($size, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "[ERROR] Installer not found!" -ForegroundColor Red
    Write-Host "        Run: npm run build:win" -ForegroundColor Yellow
    exit 1
}

# 2. Check icon file
if (Test-Path "static\icon.ico") {
    Write-Host "[OK] Icon file exists: static\icon.ico" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Icon file missing!" -ForegroundColor Red
}

# 3. Check required files
$requiredFiles = @(
    "LICENSE.txt",
    "installer.nsh",
    ".env.example",
    "README.md",
    "INSTALL.md",
    "SECURITY.md"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "[OK] $file exists" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] $file missing!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Manual Testing Checklist" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[ ] 1. Gỡ phiên bản cũ nếu có" -ForegroundColor Yellow
Write-Host "      Settings → Apps → Uninstall 'Magic English'" -ForegroundColor Gray
Write-Host ""

Write-Host "[ ] 2. Clear icon cache" -ForegroundColor Yellow
Write-Host "      Run: ie4uinit.exe -show" -ForegroundColor Gray
Write-Host ""

Write-Host "[ ] 3. Chạy installer" -ForegroundColor Yellow
Write-Host "      Double-click: $installerPath" -ForegroundColor Gray
Write-Host ""

Write-Host "[ ] 4. Verify trong quá trình cài đặt:" -ForegroundColor Yellow
Write-Host "      - Logo hiển thị trong installer" -ForegroundColor Gray
Write-Host "      - License agreement xuất hiện" -ForegroundColor Gray
Write-Host "      - Có option chọn installation path" -ForegroundColor Gray
Write-Host "      - Có checkbox Desktop shortcut" -ForegroundColor Gray
Write-Host ""

Write-Host "[ ] 5. Sau khi cài đặt, kiểm tra:" -ForegroundColor Yellow
Write-Host "      - Desktop shortcut có icon đúng" -ForegroundColor Gray
Write-Host "      - Start Menu shortcut có icon đúng" -ForegroundColor Gray
Write-Host "      - Double-click để mở app" -ForegroundColor Gray
Write-Host ""

Write-Host "[ ] 6. Khi app đang chạy:" -ForegroundColor Yellow
Write-Host "      - Taskbar icon phải là Magic English icon" -ForegroundColor Gray
Write-Host "      - Task Manager hiện 'Magic English' không phải 'Electron'" -ForegroundColor Gray
Write-Host "      - Press F12 → DevTools KHÔNG mở (production)" -ForegroundColor Gray
Write-Host "      - Không có console logs trong terminal" -ForegroundColor Gray
Write-Host ""

Write-Host "[ ] 7. Test Magic Search:" -ForegroundColor Yellow
Write-Host "      - Cấu hình .env trong installation folder" -ForegroundColor Gray
Write-Host "      - Press Ctrl+K để mở Magic Search" -ForegroundColor Gray
Write-Host "      - Magic Search window có icon đúng" -ForegroundColor Gray
Write-Host ""

Write-Host "[ ] 8. Test uninstaller:" -ForegroundColor Yellow
Write-Host "      - Settings → Apps → Uninstall" -ForegroundColor Gray
Write-Host "      - Verify tất cả files bị xóa" -ForegroundColor Gray
Write-Host "      - Check registry: HKLM\SOFTWARE\Magic English (phải xóa)" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Auto-check after installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if app is installed
$installPath = "C:\Program Files\Magic English"
if (Test-Path $installPath) {
    Write-Host "✅ App installed at: $installPath" -ForegroundColor Green
    
    # Check files
    if (Test-Path "$installPath\Magic English.exe") {
        Write-Host "✅ Main executable found" -ForegroundColor Green
    }
    if (Test-Path "$installPath\.env.example") {
        Write-Host "✅ .env.example found" -ForegroundColor Green
    } else {
        Write-Host "⚠️  .env.example not found - user can't configure API" -ForegroundColor Yellow
    }
    
    # Check registry
    $regPath = "HKLM:\SOFTWARE\Magic English"
    if (Test-Path $regPath) {
        Write-Host "✅ Registry entries found" -ForegroundColor Green
    }
    
    # Check if running
    $process = Get-Process -Name "Magic English" -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "[OK] App is running as Magic English" -ForegroundColor Green
        Write-Host "   Process ID: $($process.Id)" -ForegroundColor Gray
    } else {
        Write-Host "[INFO] App is not currently running" -ForegroundColor Cyan
    }
} else {
    Write-Host "ℹ️  App not installed yet" -ForegroundColor Cyan
    Write-Host "   Install using: $installerPath" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Security Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check for debug code
Write-Host "Checking for debug code in production bundle..." -ForegroundColor Yellow
$debugPatterns = @(
    "console.log(",
    "console.warn(",
    "console.error(",
    "console.debug(",
    "debugger;"
)

$foundDebug = $false
$distPath = "dist\win-unpacked\resources\app.asar"

if (Test-Path $distPath) {
    Write-Host "ℹ️  Note: Kiểm tra app.asar yêu cầu extract" -ForegroundColor Cyan
    Write-Host "   Production có thể có console.error wrapped với isDev" -ForegroundColor Gray
} else {
    Write-Host "⚠️  Bundle not found for debug check" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
