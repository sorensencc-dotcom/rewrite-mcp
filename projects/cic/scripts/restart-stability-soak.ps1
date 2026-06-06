# CIC Phase 7.15–7.20 Stability Soak Restart Script
# Operator-grade restart with full state cleanup and 12-hour validation

param(
    [ValidateSet("test", "orchestrate")]
    [string]$Mode = "orchestrate",

    [ValidateSet("12h", "6h", "24h")]
    [string]$Duration = "12h",

    [switch]$SkipQueueClear,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$CicRoot = Split-Path -Parent $PSScriptRoot
$IngestionDir = Join-Path $CicRoot "ingestion"

Write-Host "=== CIC Phase 7.15–7.20 Stability Soak Restart ===" -ForegroundColor Cyan
Write-Host "Mode: $Mode | Duration: $Duration | Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

# Step 1: Kill any orphaned runners
Write-Host "`n[1/4] Killing orphaned CIC stability processes..." -ForegroundColor Yellow
$procs = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -match "(stability|orchestrate)" -and $_.Id -ne $PID
}

if ($procs) {
    foreach ($proc in $procs) {
        Write-Host "  Terminating PID $($proc.Id) ($($proc.Name))" -ForegroundColor Red
        if (-not $DryRun) {
            $proc | Stop-Process -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 100
        }
    }
} else {
    Write-Host "  No orphaned processes found" -ForegroundColor Green
}

# Step 2: Clear queues if not skipped
if (-not $SkipQueueClear) {
    Write-Host "`n[2/4] Clearing DLQ and event buffers..." -ForegroundColor Yellow

    Push-Location $CicRoot
    try {
        if (-not $DryRun) {
            if (Test-Path "package.json") {
                npm run queue:clear 2>$null || Write-Host "  queue:clear not defined (expected)" -ForegroundColor Gray
                npm run dlq:clear 2>$null || Write-Host "  dlq:clear not defined (expected)" -ForegroundColor Gray
            }

            # Also clear any stale temp state files
            $stateDir = Join-Path $CicRoot ".tmp"
            if (Test-Path $stateDir) {
                Remove-Item "$stateDir\*.state.json" -Force -ErrorAction SilentlyContinue
                Remove-Item "$stateDir\*.lock" -Force -ErrorAction SilentlyContinue
                Write-Host "  Cleared stale state files from .tmp/" -ForegroundColor Green
            }
        } else {
            Write-Host "  [DRY RUN] Would clear queues and state" -ForegroundColor Cyan
        }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "`n[2/4] Skipping queue clear (-SkipQueueClear specified)" -ForegroundColor Yellow
}

# Step 3: Validate npm scripts exist
Write-Host "`n[3/4] Validating npm scripts..." -ForegroundColor Yellow
Push-Location $IngestionDir
try {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $scripts = $packageJson.scripts

    $testStabilityExists = $scripts.PSObject.Properties.Name -contains "test:stability"
    $orchestrateStabilityExists = $scripts.PSObject.Properties.Name -contains "orchestrate:stability"

    if ($testStabilityExists) {
        Write-Host "  ✓ npm run test:stability defined" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ npm run test:stability NOT defined" -ForegroundColor Yellow
    }

    if ($orchestrateStabilityExists) {
        Write-Host "  ✓ npm run orchestrate:stability defined" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ npm run orchestrate:stability NOT defined" -ForegroundColor Yellow
    }
} finally {
    Pop-Location
}

# Step 4: Start fresh soak
Write-Host "`n[4/4] Starting $Duration stability soak ($($Mode) mode)..." -ForegroundColor Yellow

Push-Location $IngestionDir
try {
    $cmd = if ($Mode -eq "test") {
        "npm run test:stability -- --duration=$Duration"
    } else {
        "npm run orchestrate:stability -- --hours=$($Duration -replace 'h', '')"
    }

    Write-Host "  Command: $cmd" -ForegroundColor Cyan

    if (-not $DryRun) {
        Write-Host "  Process starting (PID will be displayed below)..." -ForegroundColor Gray
        Invoke-Expression $cmd
    } else {
        Write-Host "  [DRY RUN] Would execute: $cmd" -ForegroundColor Cyan
    }
} finally {
    Pop-Location
}

Write-Host "`n=== Stability Soak Started ===" -ForegroundColor Green
Write-Host "Monitor dashboard: http://localhost:3000/d/arl-v2-dash?from=now-6h&to=now" -ForegroundColor Cyan
Write-Host "Expected metrics updating every 30 seconds:" -ForegroundColor Gray
Write-Host "  • Drift Avg" -ForegroundColor Gray
Write-Host "  • Contradiction Avg" -ForegroundColor Gray
Write-Host "  • Adversarial Rate (climbing)" -ForegroundColor Gray
Write-Host "  • Stability Score (oscillating)" -ForegroundColor Gray
Write-Host "`nTo restart with PM2 supervision: pm2 start ecosystem.config.js" -ForegroundColor Cyan
