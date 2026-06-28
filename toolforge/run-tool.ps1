<#
.SYNOPSIS
  Universal Toolforge tool runner. Discovers and executes tools from any category.

.PARAMETER Name
  Tool name (directory name). Required for -Run.

.PARAMETER List
  List all discovered tools with metadata.

.PARAMETER Run
  Execute tool by name.

.PARAMETER Config
  Path to config file (passed to tool).

.PARAMETER Inspect
  Show full details of a tool.

.PARAMETER Refresh
  Rescan directories and update manifest.

.EXAMPLE
  ./run-tool.ps1 -List
  ./run-tool.ps1 -Run multiRepoRoadmapSync -Config config.json
  ./run-tool.ps1 -Inspect multiRepoRoadmapSync
#>

param(
  [string]$Name,
  [switch]$List,
  [switch]$Run,
  [string]$Config,
  [switch]$Inspect,
  [switch]$Refresh
)

$ErrorActionPreference = "Stop"
$TOOLFORGE_ROOT = Split-Path -Parent $PSCommandPath
$MANIFEST_FILE = Join-Path $TOOLFORGE_ROOT "manifest.json"
$CATEGORIES = @("sync-tools", "daemons", "adapters", "mcp-servers", "utilities", "scaffolds", "prototypes")

function Load-Manifest {
  if (Test-Path $MANIFEST_FILE) {
    return Get-Content $MANIFEST_FILE | ConvertFrom-Json
  }
  return $null
}

function Discover-Tools {
  Write-Host "🔍 Scanning toolforge directories..." -ForegroundColor Cyan
  $tools = @()

  foreach ($category in $CATEGORIES) {
    $categoryPath = Join-Path $TOOLFORGE_ROOT $category
    if (-not (Test-Path $categoryPath)) { continue }

    Get-ChildItem -Path $categoryPath -File -Filter "*.cjs", "*.ts", "*.ps1", "*.sh" | ForEach-Object {
      $tool = @{
        name        = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
        category    = $category
        filename    = $_.Name
        path        = $_.FullName
        discovered  = $true
      }
      $tools += $tool
    }
  }

  Write-Host "✓ Found $($tools.Count) tool files" -ForegroundColor Green
  return $tools
}

function Update-Manifest {
  $discovered = Discover-Tools
  $current = Load-Manifest

  if ($null -eq $current) {
    $current = @{ version = "1.0.0"; generated = (Get-Date -AsUTC -Format o); tools = @() }
  }

  # Preserve existing metadata, update discovery status
  $merged = @()
  foreach ($tool in $discovered) {
    $existing = $current.tools | Where-Object { $_.name -eq $tool.name }
    if ($existing) {
      $existing | Add-Member -MemberType NoteProperty -Name "discovered" -Value $true -Force
      $merged += $existing
    } else {
      $tool | Add-Member -MemberType NoteProperty -Name status -Value "beta"
      $tool | Add-Member -MemberType NoteProperty -Name version -Value "0.1.0"
      $merged += $tool
    }
  }

  $current.tools = $merged
  $current.generated = (Get-Date -AsUTC -Format o)
  $current | ConvertTo-Json -Depth 5 | Set-Content $MANIFEST_FILE
  Write-Host "✓ Manifest updated: $MANIFEST_FILE" -ForegroundColor Green
}

function List-Tools {
  $manifest = Load-Manifest
  if ($null -eq $manifest -or $manifest.tools.Count -eq 0) {
    Write-Host "No tools found. Run with -Refresh to scan." -ForegroundColor Yellow
    return
  }

  Write-Host ""
  Write-Host "📦 Toolforge Tools (v$($manifest.version))" -ForegroundColor Cyan
  Write-Host ""

  $manifest.tools | Group-Object -Property category | ForEach-Object {
    Write-Host "  [$($_.Name)]" -ForegroundColor Blue
    $_.Group | ForEach-Object {
      $status = $_.status ?? "unknown"
      $ver = $_.version ?? "0.0.0"
      Write-Host "    • $($_.name) ($ver) [$status]" -ForegroundColor White
      if ($_.description) { Write-Host "      $($_.description)" -ForegroundColor Gray }
    }
    Write-Host ""
  }
}

function Inspect-Tool {
  param([string]$ToolName)

  $manifest = Load-Manifest
  $tool = $manifest.tools | Where-Object { $_.name -eq $ToolName }

  if (-not $tool) {
    Write-Host "❌ Tool not found: $ToolName" -ForegroundColor Red
    exit 1
  }

  Write-Host ""
  Write-Host "📋 Tool: $($tool.name)" -ForegroundColor Cyan
  Write-Host "  Category:     $($tool.category)"
  Write-Host "  Version:      $($tool.version ?? '0.0.0')"
  Write-Host "  Status:       $($tool.status ?? 'unknown')"
  Write-Host "  Description:  $($tool.description ?? '(none)')"
  Write-Host "  Path:         $($tool.path)"
  Write-Host "  Entrypoint:   $($tool.entrypoint ?? 'run.ps1')"
  if ($tool.dependencies) {
    Write-Host "  Dependencies: $($tool.dependencies -join ', ')"
  }
  Write-Host ""
}

function Invoke-Tool {
  param([string]$ToolName, [string]$ConfigPath)

  $manifest = Load-Manifest
  $tool = $manifest.tools | Where-Object { $_.name -eq $ToolName }

  if (-not $tool) {
    Write-Host "❌ Tool not found: $ToolName" -ForegroundColor Red
    exit 1
  }

  $entrypoint = $tool.entrypoint ?? "run.ps1"
  $toolDir = Split-Path -Parent $tool.path
  $runPath = Join-Path $toolDir $entrypoint

  if (-not (Test-Path $runPath)) {
    Write-Host "❌ Entrypoint not found: $runPath" -ForegroundColor Red
    exit 1
  }

  Write-Host ""
  Write-Host "▶️  Running: $($tool.name) v$($tool.version ?? '0.0.0')" -ForegroundColor Cyan
  Write-Host "   Category: $($tool.category)" -ForegroundColor Gray
  Write-Host ""

  $args = @()
  if ($ConfigPath) { $args += $ConfigPath }

  switch ([System.IO.Path]::GetExtension($runPath)) {
    ".ps1" {
      & $runPath @args
    }
    ".cjs" {
      node $runPath @args
    }
    ".ts" {
      npx ts-node $runPath @args
    }
    ".sh" {
      bash $runPath @args
    }
    default {
      Write-Host "❌ Unknown entrypoint type: $([System.IO.Path]::GetExtension($runPath))" -ForegroundColor Red
      exit 1
    }
  }

  if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tool exited with code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
  }
  Write-Host ""
  Write-Host "✓ Complete" -ForegroundColor Green
}

# Main dispatcher
if ($Refresh) {
  Update-Manifest
  exit 0
}

if ($List) {
  List-Tools
  exit 0
}

if ($Inspect) {
  if (-not $Name) {
    Write-Host "Error: -Inspect requires -Name" -ForegroundColor Red
    exit 1
  }
  Inspect-Tool -ToolName $Name
  exit 0
}

if ($Run) {
  if (-not $Name) {
    Write-Host "Error: -Run requires -Name" -ForegroundColor Red
    exit 1
  }
  Invoke-Tool -ToolName $Name -ConfigPath $Config
  exit 0
}

# No action specified
Write-Host "Toolforge Tool Runner" -ForegroundColor Cyan
Write-Host ""
Write-Host "Usage:" -ForegroundColor Yellow
Write-Host "  ./run-tool.ps1 -List              # Show all tools"
Write-Host "  ./run-tool.ps1 -Run <name>        # Execute a tool"
Write-Host "  ./run-tool.ps1 -Inspect <name>    # Show tool details"
Write-Host "  ./run-tool.ps1 -Refresh           # Rescan directories"
Write-Host ""
Write-Host "Examples:" -ForegroundColor Yellow
Write-Host "  ./run-tool.ps1 -List"
Write-Host "  ./run-tool.ps1 -Run multiRepoRoadmapSync -Config config.json"
Write-Host "  ./run-tool.ps1 -Inspect multiRepoRoadmapSync"
Write-Host ""
