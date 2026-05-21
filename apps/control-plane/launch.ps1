<#
.SYNOPSIS
  CIC Control-Plane Launcher
  File: launch.ps1 | Version: 1.0.0 | Date: 2026-05-18

.DESCRIPTION
  Reads .env from the same directory, exports all KEY=VALUE pairs into the
  current process environment, then starts index.js in the requested mode.
  Modes:
    local  — AUTH_DISABLED=true, no Google credentials needed (default)
    dev    — uses .env as-is, node --watch for auto-restart
    prod   — uses .env as-is, plain node (no watch)

.EXAMPLES
  .\launch.ps1              # local mode (default)
  .\launch.ps1 local        # same as above
  .\launch.ps1 dev          # .env + node --watch
  .\launch.ps1 prod         # .env + node
#>

param(
  [ValidateSet("local","dev","prod")]
  [string]$Mode = "local"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# ── Load .env ────────────────────────────────────────────────────────────────
$EnvFile = Join-Path $ScriptDir ".env"
if (Test-Path $EnvFile) {
  Write-Host "[launcher] Loading $EnvFile" -ForegroundColor Cyan
  Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    # skip blanks and comments
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key   = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    # strip surrounding quotes if present
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    Write-Host "  $key = $(if ($key -match 'SECRET|TOKEN|KEY|PASSWORD') { '***' } else { $value })" -ForegroundColor DarkGray
  }
} else {
  Write-Host "[launcher] No .env found at $EnvFile" -ForegroundColor Yellow
}

# ── Mode overrides ────────────────────────────────────────────────────────────
switch ($Mode) {
  "local" {
    [System.Environment]::SetEnvironmentVariable("AUTH_DISABLED", "true", "Process")
    Write-Host "[launcher] Mode: LOCAL  (AUTH_DISABLED=true)" -ForegroundColor Green
    $NodeArgs = @("index.js")
  }
  "dev" {
    Write-Host "[launcher] Mode: DEV  (node --watch, .env loaded)" -ForegroundColor Yellow
    $NodeArgs = @("--watch", "index.js")
  }
  "prod" {
    Write-Host "[launcher] Mode: PROD  (.env loaded)" -ForegroundColor Red
    $NodeArgs = @("index.js")
  }
}

# ── Preflight checks ──────────────────────────────────────────────────────────
if ($Mode -ne "local") {
  $clientId = [System.Environment]::GetEnvironmentVariable("GOOGLE_CLIENT_ID", "Process")
  if (-not $clientId) {
    Write-Host ""
    Write-Host "[launcher] ERROR: GOOGLE_CLIENT_ID is not set." -ForegroundColor Red
    Write-Host "  Add it to .env or run:  .\launch.ps1 local" -ForegroundColor Red
    exit 1
  }
}

$port = [System.Environment]::GetEnvironmentVariable("PORT", "Process")
if (-not $port) { $port = "3000" }
Write-Host "[launcher] Starting on port $port  →  http://localhost:$port" -ForegroundColor Cyan
Write-Host ""

# ── Launch ────────────────────────────────────────────────────────────────────
& node @NodeArgs
