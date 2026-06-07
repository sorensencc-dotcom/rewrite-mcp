# Local Deployment Script - Start CIC Service + Operator Console
# Usage: PowerShell -File scripts/deploy-local.ps1

param(
    [switch]$ServiceOnly = $false,
    [switch]$ConsoleOnly = $false
)

$root = Split-Path (Split-Path $PSScriptRoot)
$ErrorActionPreference = "Continue"

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         CIC Local Deployment — Service + Console              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Service
if (-not $ConsoleOnly) {
    Write-Host "[Service] Starting CIC Context Service..." -ForegroundColor Yellow
    Write-Host "          Location: projects/cic" -ForegroundColor Gray
    Write-Host "          API: http://localhost:8080" -ForegroundColor Gray
    Write-Host "          Health: http://localhost:8080/health" -ForegroundColor Gray

    Push-Location "$root/projects/cic"
    Write-Host "`n   cd projects/cic && npm start`n" -ForegroundColor Green

    # Show what's about to run
    Write-Host "Service will run on port 8080." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C in this window to stop." -ForegroundColor Cyan
}

# Console
if (-not $ServiceOnly) {
    Write-Host "`n[Console] In another terminal, run:" -ForegroundColor Yellow
    Write-Host "`n   cd projects/cic-operator-console && npm start`n" -ForegroundColor Green
    Write-Host "          Console: http://localhost:5173" -ForegroundColor Gray
}

Write-Host "`n[Test] Verify deployment:" -ForegroundColor Yellow
Write-Host "   curl http://localhost:8080/health" -ForegroundColor Green

Write-Host "`n[Docs] See:" -ForegroundColor Yellow
Write-Host "   - CIC_QUICK_START.md" -ForegroundColor Gray
Write-Host "   - CIC_DEPLOYMENT_CHECKLIST.md" -ForegroundColor Gray
Write-Host "   - projects/cic/DEPLOYMENT.md" -ForegroundColor Gray

Write-Host "`n════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Ready. Start service or console above." -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

if (-not $ConsoleOnly) {
    Pop-Location
}
