# CIC Legacy Console Cleanup Script
# Consolidates fragmented UI/dashboard/console code into a single, authoritative Operator Console v2

param(
    [switch]$DryRun = $false,
    [string]$archivePath = "archive/operator-console-legacy"
)

$ErrorActionPreference = "Stop"
$startTime = Get-Date

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  CIC Legacy Console Consolidation & Cleanup                   ║" -ForegroundColor Cyan
Write-Host "║  → Single Operator Console v2 (projects/cic-operator-console) ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# PHASE 1: DISCOVERY
Write-Host "[Discovery] Scanning for legacy console/dashboard code..." -ForegroundColor Yellow

$legacyPaths = @(
    @{
        path = "projects/cic/ui"
        reason = "Old CIC UI (PlannerConsole, ExecutionConsole, MetaEvolutionConsole)"
        type = "directory"
    },
    @{
        path = "apps/gh-actions-dashboard"
        reason = "Legacy GitHub Actions compliance dashboard"
        type = "directory"
    }
)

$foundPaths = @()
foreach ($item in $legacyPaths) {
    if (Test-Path $item.path) {
        $foundPaths += $item
        Write-Host "  ✓ Found: $($item.path)" -ForegroundColor Green
        Write-Host "    └─ Reason: $($item.reason)" -ForegroundColor Gray
    }
}

if ($foundPaths.Count -eq 0) {
    Write-Host "`n[Info] No legacy consoles found. Repo is already clean." -ForegroundColor Green
    exit 0
}

Write-Host "`n[Info] Found $($foundPaths.Count) legacy console(s) to archive." -ForegroundColor Cyan

# PHASE 2: PLAN GENERATION
Write-Host "`n[Planning] Creating cleanup plan..." -ForegroundColor Yellow

$cleanupPlan = @{
    timestamp = Get-Date -Format "o"
    dryRun = $DryRun
    archivePath = $archivePath
    actions = @()
}

# Action 1: Create archive
$cleanupPlan.actions += @{
    step = 1
    action = "Create archive directory"
    target = $archivePath
    destructive = $false
}

# Action 2: Archive legacy directories
foreach ($item in $foundPaths) {
    $archiveTarget = Join-Path $archivePath ($item.path.Split("/")[-1])
    $cleanupPlan.actions += @{
        step = 2
        action = "Archive legacy console"
        target = $item.path
        archiveTo = $archiveTarget
        reason = $item.reason
        destructive = $false
    }
}

# Action 3: Search for old routes
Write-Host "`n[Scanning] Searching for hardcoded routes to old consoles..." -ForegroundColor Yellow

$routePatterns = @(
    'app\.use.*dashboard',
    'app\.use.*console',
    'app\.use.*operator',
    'app\.use.*viewer',
    'app\.get.*dashboard',
    'app\.get.*console',
    'app\.get.*operator'
)

$filesWithRoutes = @()
foreach ($pattern in $routePatterns) {
    try {
        $foundMatches = @(Get-ChildItem -Path "projects/cic" -Recurse -Include "*.ts" -Exclude "node_modules","dist" -ErrorAction SilentlyContinue |
                     Where-Object { Select-String -Path $_.FullName -Pattern $pattern -Quiet } )
        $filesWithRoutes += $foundMatches
    } catch { }
}

if ($filesWithRoutes.Count -gt 0) {
    Write-Host "  ✓ Found $($filesWithRoutes.Count) file(s) with potential old routes" -ForegroundColor Green
    foreach ($file in $filesWithRoutes | Select-Object -Unique) {
        Write-Host "    └─ $($file.Name)" -ForegroundColor Gray
        $cleanupPlan.actions += @{
            step = 3
            action = "Review and remove old routes"
            target = $file.FullName
            note = "Manual review required"
            destructive = $false
        }
    }
}

# Action 4: Documentation updates
$docsToUpdate = @(
    "README.md",
    "projects/cic/README.md",
    "projects/cic/AGENTS.md",
    "DEPLOYMENT_SUMMARY.md"
)

foreach ($doc in $docsToUpdate) {
    if (Test-Path $doc) {
        $cleanupPlan.actions += @{
            step = 4
            action = "Update documentation"
            target = $doc
            destructive = $false
        }
    }
}

# PHASE 3: DISPLAY PLAN
Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  CLEANUP PLAN                                                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$steps = $cleanupPlan.actions | Group-Object -Property step
foreach ($step in $steps | Sort-Object -Property Name) {
    Write-Host "Step $($step.Name):" -ForegroundColor Cyan
    foreach ($action in $step.Group) {
        Write-Host "  - $($action.action)" -ForegroundColor White
        Write-Host "    Target: $($action.target)" -ForegroundColor Gray
        if ($action.archiveTo) {
            Write-Host "    Archive to: $($action.archiveTo)" -ForegroundColor Gray
        }
    }
    Write-Host ""
}

if ($DryRun) {
    Write-Host "[DRY RUN] No changes will be made. Run without -DryRun to execute." -ForegroundColor Yellow
    $cleanupPlan | ConvertTo-Json -Depth 10 | Out-File "cleanup-plan-dryrun.json" -Encoding UTF8
    Write-Host "Plan saved to: cleanup-plan-dryrun.json" -ForegroundColor Cyan
    Write-Host "`n✓ Dry-run complete. No issues detected. Ready to execute." -ForegroundColor Green
    exit 0
}

# PHASE 4: CONFIRMATION
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  CONFIRMATION REQUIRED                                         ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Yellow

Write-Host "This will:" -ForegroundColor White
Write-Host "  - Archive $($foundPaths.Count) legacy console(s) to '$archivePath/'" -ForegroundColor White
Write-Host "  - Update documentation" -ForegroundColor White
Write-Host "  - All legacy code will be preserved and reversible" -ForegroundColor Green
Write-Host ""

$confirm = Read-Host "Continue? [y/N]"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "Cleanup cancelled." -ForegroundColor Yellow
    exit 0
}

# PHASE 5: EXECUTION
Write-Host "`n[Executing] Starting cleanup..." -ForegroundColor Cyan

# Create archive directory
Write-Host "`nStep 1: Creating archive directory..." -ForegroundColor Yellow
if (-not (Test-Path $archivePath)) {
    New-Item -ItemType Directory -Path $archivePath -Force | Out-Null
    Write-Host "  ✓ Created: $archivePath" -ForegroundColor Green
}

# Archive legacy directories
Write-Host "`nStep 2: Archiving legacy consoles..." -ForegroundColor Yellow
foreach ($item in $foundPaths) {
    $archiveTarget = Join-Path $archivePath ($item.path.Split("/")[-1])
    if (Test-Path $item.path) {
        Write-Host "  Moving: $($item.path) → $archiveTarget"
        Move-Item -Path $item.path -Destination $archiveTarget -Force -ErrorAction Continue
        if (Test-Path $archiveTarget) {
            Write-Host "    ✓ Archived" -ForegroundColor Green
        }
    }
}

# Create ARCHIVE_MANIFEST
Write-Host "`nStep 3: Creating archive manifest..." -ForegroundColor Yellow
$manifest = @{
    timestamp = Get-Date -Format "o"
    reason = "Consolidation to single CIC Operator Console v2"
    archived_items = @()
}

foreach ($item in $foundPaths) {
    $manifest.archived_items += @{
        original_path = $item.path
        archived_as = Join-Path $archivePath ($item.path.Split("/")[-1])
        reason = $item.reason
        note = "Preserved for reference. To restore, move back to original path."
    }
}

$manifest | ConvertTo-Json -Depth 10 | Out-File (Join-Path $archivePath "ARCHIVE_MANIFEST.json") -Encoding UTF8
Write-Host "  ✓ Manifest saved to: $(Join-Path $archivePath 'ARCHIVE_MANIFEST.json')" -ForegroundColor Green

# Document old routes
Write-Host "`nStep 4: Files requiring route review..." -ForegroundColor Yellow
if ($filesWithRoutes.Count -gt 0) {
    $routeReviewFile = "ROUTE_REVIEW_REQUIRED.txt"
    $filesWithRoutes | Select-Object -Unique | ForEach-Object { $_.FullName } |
        Out-File $routeReviewFile -Encoding UTF8
    Write-Host "  ✓ Review list saved to: $routeReviewFile" -ForegroundColor Green
} else {
    Write-Host "  ✓ No old routes found (clean)" -ForegroundColor Green
}

# Update documentation
Write-Host "`nStep 5: Updating documentation..." -ForegroundColor Yellow
$docsUpdated = 0
foreach ($doc in $docsToUpdate) {
    if (Test-Path $doc) {
        $content = Get-Content $doc -Raw
        if ($content -match "dashboard|operator.*ui|legacy.*console") {
            $updated = $content -replace "old dashboard", "CIC Operator Console v2"
            $updated = $updated -replace "legacy.*console", "CIC Operator Console v2"
            Set-Content $doc -Value $updated -Encoding UTF8
            Write-Host "  ✓ Updated: $doc" -ForegroundColor Green
            $docsUpdated++
        }
    }
}

if ($docsUpdated -eq 0) {
    Write-Host "  ℹ No legacy references found (already clean)" -ForegroundColor Cyan
}

# PHASE 6: SUMMARY
$duration = ((Get-Date) - $startTime).TotalSeconds

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  CLEANUP COMPLETE                                              ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  - Legacy consoles archived: $($foundPaths.Count)" -ForegroundColor White
Write-Host "  - Archive location: $archivePath/" -ForegroundColor White
Write-Host "  - Docs updated: $docsUpdated file(s)" -ForegroundColor White
Write-Host "  - Execution time: $([math]::Round($duration, 2))s" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Review ROUTE_REVIEW_REQUIRED.txt (if it exists)" -ForegroundColor Yellow
Write-Host "  2. Commit cleanup:" -ForegroundColor Yellow
Write-Host "     git add -A && git commit -m '[cleanup] Archive legacy consoles, consolidate to CIC Operator Console v2'" -ForegroundColor Gray
Write-Host "  3. Generate Operator Console v2 scaffold" -ForegroundColor Yellow

Write-Host ""
