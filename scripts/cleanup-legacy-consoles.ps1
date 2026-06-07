#Cleanup script for legacy CIC consoles
param([switch]$DryRun = $false)

$archivePath = "archive/operator-console-legacy"
$ErrorActionPreference = "Stop"
$startTime = Get-Date

Write-Host "`n=== CIC Legacy Console Cleanup ===" -ForegroundColor Cyan
Write-Host "Single Operator Console v2" -ForegroundColor Cyan

#PHASE 1: DISCOVERY
Write-Host "`n[Discovery] Scanning for legacy consoles..." -ForegroundColor Yellow

$legacyPaths = @(
    "projects/cic/ui",
    "apps/gh-actions-dashboard"
)

$foundPaths = @()
foreach ($path in $legacyPaths) {
    if (Test-Path $path) {
        $foundPaths += $path
        Write-Host "  Found: $path" -ForegroundColor Green
    }
}

if ($foundPaths.Count -eq 0) {
    Write-Host "No legacy consoles found. Repo is clean." -ForegroundColor Green
    exit 0
}

Write-Host "`nFound $($foundPaths.Count) legacy console(s) to archive.`n" -ForegroundColor Cyan

#PHASE 2: DISPLAY PLAN
Write-Host "=== CLEANUP PLAN ===" -ForegroundColor Cyan
Write-Host "Step 1: Create archive directory"
Write-Host "Step 2: Archive legacy consoles"
Write-Host "Step 3: Update documentation"

Write-Host "`n=== DETAILS ===" -ForegroundColor Cyan
foreach ($path in $foundPaths) {
    Write-Host "  - $path"
}

if ($DryRun) {
    Write-Host "`n[DRY RUN] No changes. Run without -DryRun to execute." -ForegroundColor Yellow
    exit 0
}

#PHASE 3: CONFIRMATION
Write-Host "`n=== CONFIRM ===" -ForegroundColor Yellow
Write-Host "This will archive $($foundPaths.Count) legacy console(s) to $archivePath/"
Write-Host "All code will be preserved and reversible."

$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

#PHASE 4: EXECUTE
Write-Host "`n[Executing] Starting cleanup..." -ForegroundColor Cyan

#Create archive
if (-not (Test-Path $archivePath)) {
    New-Item -ItemType Directory -Path $archivePath -Force | Out-Null
    Write-Host "  Created: $archivePath" -ForegroundColor Green
}

#Archive directories
foreach ($path in $foundPaths) {
    $name = Split-Path -Leaf $path
    $target = Join-Path $archivePath $name
    if (Test-Path $path) {
        Move-Item -Path $path -Destination $target -Force
        Write-Host "  Archived: $path" -ForegroundColor Green
    }
}

#Create manifest
$manifest = @{
    timestamp = Get-Date -Format "o"
    reason = "Consolidation to CIC Operator Console v2"
    archived = $foundPaths
}
$manifest | ConvertTo-Json | Out-File (Join-Path $archivePath "MANIFEST.json") -Encoding UTF8
Write-Host "  Manifest: $(Join-Path $archivePath 'MANIFEST.json')" -ForegroundColor Green

#Summary
$duration = ((Get-Date) - $startTime).TotalSeconds
Write-Host "`n=== COMPLETE ===" -ForegroundColor Green
Write-Host "Archived: $($foundPaths.Count) console(s)"
Write-Host "Time: $([math]::Round($duration, 2))s"
Write-Host "`nNext: Commit changes and generate Operator Console v2"
Write-Host ""
