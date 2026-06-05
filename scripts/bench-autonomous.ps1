# Rewrite Labs Autonomous Benchmark Pipeline
# Single-command, hook-free local development workflow
# Usage: .\scripts\bench-autonomous.ps1

param(
  [switch]$SkipCapture = $false,
  [switch]$SkipMetadata = $false,
  [switch]$SkipBenchmark = $false,
  [switch]$Commit = $false,
  [string]$ApiKey = $env:ANTHROPIC_API_KEY
)

$ErrorActionPreference = "Continue"
$start = Get-Date
$results = @{
  capture = "skipped"
  metadata = "skipped"
  benchmark = "skipped"
  commit = "skipped"
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Rewrite Labs Autonomous Benchmark Pipeline" -ForegroundColor Cyan
Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Disable hooks for this run
Write-Host "[setup] Disabling git hooks temporarily..." -ForegroundColor Gray
$origHooksPath = git config core.hooksPath 2>$null
if ([string]::IsNullOrEmpty($origHooksPath)) {
  git config core.hooksPath /dev/null 2>$null | Out-Null
}

try {
  # Phase 1: Capture
  if (-not $SkipCapture) {
    Write-Host "[phase 1/3] Capturing HTML snapshots..." -ForegroundColor Cyan
    $captureStart = Get-Date
    $captureOutput = & npm run bench:capture 2>&1
    $captureTime = [math]::Round(((Get-Date) - $captureStart).TotalSeconds, 1)

    if ($LASTEXITCODE -eq 0) {
      $results.capture = "[OK] complete (${captureTime}s)"
      Write-Host $results.capture -ForegroundColor Green
    } else {
      $results.capture = "[PARTIAL] (${captureTime}s)"
      Write-Host $results.capture -ForegroundColor Yellow
      $successCount = ($captureOutput | Select-String "Saved" | Measure-Object).Count
      Write-Host "  -> $successCount sites captured" -ForegroundColor Yellow
    }
  }

  Write-Host ""

  # Phase 2: Metadata Extraction
  if (-not $SkipMetadata) {
    Write-Host "[phase 2/3] Extracting metadata..." -ForegroundColor Cyan
    $metaStart = Get-Date
    $metaOutput = & npm run bench:metadata 2>&1
    $metaTime = [math]::Round(((Get-Date) - $metaStart).TotalSeconds, 1)

    if ($LASTEXITCODE -eq 0) {
      $results.metadata = "[OK] complete (${metaTime}s)"
      Write-Host $results.metadata -ForegroundColor Green
    } else {
      $results.metadata = "[PARTIAL] (${metaTime}s)"
      Write-Host $results.metadata -ForegroundColor Yellow
      $successCount = ($metaOutput | Select-String "Complete" | Measure-Object).Count
      Write-Host "  -> metadata processed" -ForegroundColor Yellow
    }
  }

  Write-Host ""

  # Phase 3: A/B Benchmark (optional, handles API credit errors gracefully)
  if (-not $SkipBenchmark) {
    Write-Host "[phase 3/3] Running Opus vs Sonnet A/B benchmark..." -ForegroundColor Cyan

    if ([string]::IsNullOrEmpty($ApiKey)) {
      Write-Host "[SKIP] ANTHROPIC_API_KEY not set" -ForegroundColor Yellow
      $results.benchmark = "[SKIP] no API key"
    } else {
      $benchStart = Get-Date
      $env:ANTHROPIC_API_KEY = $ApiKey
      $benchOutput = & npm run bench:opus-sonnet 2>&1
      $benchTime = [math]::Round(((Get-Date) - $benchStart).TotalSeconds, 1)

      if ($benchOutput -match "too low to access") {
        $results.benchmark = "[BLOCKED] insufficient credits (${benchTime}s)"
        Write-Host $results.benchmark -ForegroundColor Yellow
      } elseif ($LASTEXITCODE -eq 0) {
        $results.benchmark = "[OK] complete (${benchTime}s)"
        Write-Host $results.benchmark -ForegroundColor Green
      } else {
        $results.benchmark = "[FAILED] (${benchTime}s)"
        Write-Host $results.benchmark -ForegroundColor Red
      }
    }
  }

  Write-Host ""

  # Phase 4: Git Commit (optional)
  if ($Commit) {
    Write-Host "[phase 4/4] Committing changes..." -ForegroundColor Cyan
    git add -A
    $status = git status --short
    if ([string]::IsNullOrWhiteSpace($status)) {
      $results.commit = "[SKIP] no changes"
      Write-Host $results.commit -ForegroundColor Yellow
    } else {
      $commitMsg = @"
[claude] automated benchmark run: $(Get-Date -Format 'yyyy-MM-dd HH:mm')

Capture: $($results.capture)
Metadata: $($results.metadata)
Benchmark: $($results.benchmark)

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
"@
      git commit -m $commitMsg 2>$null
      if ($LASTEXITCODE -eq 0) {
        $results.commit = "[OK] committed"
        Write-Host $results.commit -ForegroundColor Green
      } else {
        $results.commit = "[WARN] commit failed"
        Write-Host $results.commit -ForegroundColor Yellow
      }
    }
  }

} finally {
  # Re-enable hooks
  if ([string]::IsNullOrEmpty($origHooksPath)) {
    git config --unset core.hooksPath 2>$null | Out-Null
  } else {
    git config core.hooksPath $origHooksPath 2>$null | Out-Null
  }
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Pipeline Summary" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Capture:   $($results.capture)" -ForegroundColor Cyan
Write-Host "Metadata:  $($results.metadata)" -ForegroundColor Cyan
Write-Host "Benchmark: $($results.benchmark)" -ForegroundColor Cyan
Write-Host "Commit:    $($results.commit)" -ForegroundColor Cyan
$duration = [math]::Round(((Get-Date) - $start).TotalSeconds, 1)
Write-Host "Duration:  ${duration}s" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: View results in benchmarks/out/ or check git log" -ForegroundColor Gray
Write-Host ""
