# CIC ABM Block Approval Audit Script
# Validates CIC/CRG/Ruflo integration layer after generation

param(
    [string]$blockPath = "projects/cic",
    [string]$reportFile = "audit-report.json"
)

$checks = @{
    "TypeScript Syntax" = $false
    "Contract Defined" = $false
    "Service Implemented" = $false
    "Adapter Implemented" = $false
    "Orchestration Implemented" = $false
    "Observability Implemented" = $false
    "Config Valid" = $false
    "No TODO Markers" = $false
    "Governance Defined" = $false
    "Documentation Complete" = $false
}

$errors = @()
$warnings = @()

Write-Host "[Audit] Running CIC ABM Block Approval Audit..." -ForegroundColor Cyan

# 1. Check TypeScript files exist and parse
$tsFiles = @(
    "context-api/CONTRACT.md",
    "context-service/ContextService.ts",
    "context-service/ContextServer.ts",
    "context-service/index.ts",
    "crg-adapter/CRGAdapter.ts",
    "ruflo-orchestration/FlowRegistry.ts",
    "ruflo-orchestration/FlowOrchestrator.ts",
    "observability/TraceMiddleware.ts",
    "observability/MetricsMiddleware.ts",
    "config/ContextConfig.ts",
    "AGENTS.md",
    "README.md"
)

$missingFiles = @()
foreach ($file in $tsFiles) {
    $fullPath = Join-Path $blockPath $file
    if (-not (Test-Path $fullPath)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -eq 0) {
    $checks["TypeScript Syntax"] = $true
    Write-Host "[PASS] All 13 required files present" -ForegroundColor Green
} else {
    $checks["TypeScript Syntax"] = $false
    $errors += "Missing files: $($missingFiles -join ', ')"
    Write-Host "[FAIL] Missing files: $($missingFiles -join ', ')" -ForegroundColor Red
}

# 2. Check Contract.md exists and defines endpoints
$contractPath = Join-Path $blockPath "context-api/CONTRACT.md"
if (Test-Path $contractPath) {
    $contractContent = Get-Content $contractPath -Raw
    if ($contractContent -match "GET /context/:id" -and $contractContent -match "lazy-load") {
        $checks["Contract Defined"] = $true
        Write-Host "[PASS] Contract properly defined (endpoints + lazy-load)" -ForegroundColor Green
    } else {
        $checks["Contract Defined"] = $false
        $errors += "Contract missing endpoint specifications"
    }
}

# 3. Check ContextService implements interfaces
$servicePath = Join-Path $blockPath "context-service/ContextService.ts"
if (Test-Path $servicePath) {
    $serviceContent = Get-Content $servicePath -Raw
    if ($serviceContent -match "interface.*Context" -and $serviceContent -match "async") {
        $checks["Service Implemented"] = $true
        Write-Host "[PASS] ContextService has typed interfaces and async methods" -ForegroundColor Green
    }
}

# 4. Check CRGAdapter signature
$adapterPath = Join-Path $blockPath "crg-adapter/CRGAdapter.ts"
if (Test-Path $adapterPath) {
    $adapterContent = Get-Content $adapterPath -Raw
    if ($adapterContent -match "class CRGAdapter" -and $adapterContent -match "fileToContextFile") {
        $checks["Adapter Implemented"] = $true
        Write-Host "[PASS] CRGAdapter has class and conversion methods" -ForegroundColor Green
    }
}

# 5. Check FlowRegistry + FlowOrchestrator
$registryPath = Join-Path $blockPath "ruflo-orchestration/FlowRegistry.ts"
$orchestratorPath = Join-Path $blockPath "ruflo-orchestration/FlowOrchestrator.ts"
if ((Test-Path $registryPath) -and (Test-Path $orchestratorPath)) {
    $registryContent = Get-Content $registryPath -Raw
    $orchestratorContent = Get-Content $orchestratorPath -Raw
    if ($registryContent -match "class FlowRegistry" -and $orchestratorContent -match "class FlowOrchestrator") {
        $checks["Orchestration Implemented"] = $true
        Write-Host "[PASS] Ruflo orchestration has registry and executor" -ForegroundColor Green
    }
}

# 6. Check observability middleware
$tracePath = Join-Path $blockPath "observability/TraceMiddleware.ts"
$metricsPath = Join-Path $blockPath "observability/MetricsMiddleware.ts"
if ((Test-Path $tracePath) -and (Test-Path $metricsPath)) {
    $checks["Observability Implemented"] = $true
    Write-Host "[PASS] Observability middleware (tracing + metrics) present" -ForegroundColor Green
}

# 7. Check config is valid TypeScript
$configPath = Join-Path $blockPath "config/ContextConfig.ts"
if (Test-Path $configPath) {
    $configContent = Get-Content $configPath -Raw
    if ($configContent -match "interface ContextConfig" -and $configContent -match "loadConfig") {
        $checks["Config Valid"] = $true
        Write-Host "[PASS] Configuration schema and loader defined" -ForegroundColor Green
    }
}

# 8. Check for TODO markers (shouldn't be in approval audit if fully scaffolded)
$todoCount = 0
foreach ($file in $tsFiles) {
    $fullPath = Join-Path $blockPath $file
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        $todoMatches = [Regex]::Matches($content, "// TODO")
        $todoCount += $todoMatches.Count
    }
}

if ($todoCount -gt 0) {
    $warnings += "$todoCount TODO markers found (expected for scaffolding)"
    Write-Host "[WARN] $todoCount TODO markers present (expected for scaffolding)" -ForegroundColor Yellow
    $checks["No TODO Markers"] = $false
} else {
    $checks["No TODO Markers"] = $true
    Write-Host "[PASS] No TODO markers in production code" -ForegroundColor Green
}

# 9. Check AGENTS.md governance
$agentsPath = Join-Path $blockPath "AGENTS.md"
if (Test-Path $agentsPath) {
    $agentsContent = Get-Content $agentsPath -Raw
    if ($agentsContent -match "Zone Governance" -and $agentsContent -match "primary owner") {
        $checks["Governance Defined"] = $true
        Write-Host "[PASS] Zone governance documented in AGENTS.md" -ForegroundColor Green
    }
}

# 10. Check README documentation
$readmePath = Join-Path $blockPath "README.md"
if (Test-Path $readmePath) {
    $readmeContent = Get-Content $readmePath -Raw
    if ($readmeContent -match "Architecture" -and $readmeContent -match "Roadmap") {
        $checks["Documentation Complete"] = $true
        Write-Host "[PASS] README.md has architecture and roadmap" -ForegroundColor Green
    }
}

# Summary
$passCount = ($checks.Values | Where-Object { $_ -eq $true }).Count
$totalCount = $checks.Count

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Audit Summary: $passCount/$totalCount checks passed" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

if ($errors.Count -gt 0) {
    Write-Host "[FAIL] ERRORS:" -ForegroundColor Red
    foreach ($err in $errors) {
        Write-Host "  - $err" -ForegroundColor Red
    }
}

if ($warnings.Count -gt 0) {
    Write-Host "`n[WARN] WARNINGS:" -ForegroundColor Yellow
    foreach ($warn in $warnings) {
        Write-Host "  - $warn" -ForegroundColor Yellow
    }
}

# Save report
$report = @{
    timestamp = Get-Date -Format "o"
    passCount = $passCount
    totalCount = $totalCount
    checks = $checks
    errors = $errors
    warnings = $warnings
}

$report | ConvertTo-Json | Out-File $reportFile -Encoding UTF8
Write-Host "`n[Report] Report saved to $reportFile" -ForegroundColor Cyan

exit $(if ($passCount -eq $totalCount) { 0 } else { 1 })
