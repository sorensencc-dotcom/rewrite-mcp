# toolforge-install.ps1
# Full Toolforge platform scaffolding installer

$root = "C:\dev\toolforge"

Write-Output "Installing Toolforge platform into $root ..."

# -----------------------------
# 1. Create directory structure
# -----------------------------
$dirs = @(
    "$root",
    "$root\api",
    "$root\daemons",
    "$root\mcp-servers",
    "$root\adapters",
    "$root\sync-tools",
    "$root\scaffolds",
    "$root\prototypes",
    "$root\utilities",
    "$root\_TEMPLATE",
    "$root\_TEMPLATE\src",
    "$root\_TEMPLATE\tests",
    "$root\_TEMPLATE\logs",
    "$root\_TEMPLATE\scripts"
)

foreach ($d in $dirs) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d | Out-Null
    }
}

# -----------------------------
# 2. Write core files
# -----------------------------

# README.md
Set-Content "$root\README.md" @"
# Toolforge

Local-first platform for generated tools, daemons, scaffolds, and prototypes used across Rewrite Labs and CIC.

See ROADMAP.md for evolution plans.
"@

# ROADMAP.md
Set-Content "$root\ROADMAP.md" @"
# Toolforge Roadmap

## Phase 1 — Foundation (Complete)
- Directory architecture
- Bootstrap + installer scripts
- CLI + runner
- Manifest + sync daemons
- API v1 + v2
- Launcher GUI
- Governance

## Phase 2 — Operationalization (In Progress)
- Metadata enrichment
- Dashboard v2
- Docs pipeline v2
- Release pipeline
- Status badges

## Phase 3 — Integration
- CIC/Rewrite Labs adapters
- Multi-repo drift detectors
- Roadmap sync automation

## Phase 4 — Platformization
- Desktop app
- API v3
- Marketplace
"@

# GOVERNANCE.md
Set-Content "$root\GOVERNANCE.md" @"
# Toolforge Governance

Naming, versioning, and lifecycle rules for all tools.
"@

# INDEX.md
Set-Content "$root\INDEX.md" "# Toolforge Index`nGenerated: $(Get-Date)"

# CHANGELOG.md
Set-Content "$root\CHANGELOG.md" "## 1.0.0 - Initial platform scaffolding"

# VERSION.md
Set-Content "$root\VERSION.md" "version: 1.0.0`ndate: $(Get-Date -Format yyyy-MM-dd)"

# .gitignore
Set-Content "$root\.gitignore" @"
node_modules/
dist/
build/
out/
*.log
*.tmp
*.cache
.DS_Store
.vscode/
.idea/
"@

# Logo
Set-Content "$root\toolforge-logo.svg" @"
<svg width='340' height='80' viewBox='0 0 340 80' xmlns='http://www.w3.org/2000/svg'>
  <rect width='340' height='80' fill='#0a0a0a'/>
  <text x='20' y='52' font-family='Consolas, monospace' font-size='42' fill='#00ff88'>
    TOOLFORGE
  </text>
  <rect x='20' y='60' width='300' height='3' fill='#00ff88'/>
</svg>
"@

# CLAUDE_WORKSPACE.json
Set-Content "$root\CLAUDE_WORKSPACE.json" @"
{
  "workspace": {
    "roots": ["C:/dev/toolforge"],
    "description": "Toolforge workspace"
  }
}
"@

# -----------------------------
# 3. CLI + Runner
# -----------------------------

# toolforge.ps1
Set-Content "$root\toolforge.ps1" @"
param(
  [string]$Name,
  [string]$Category
)
Copy-Item -Recurse -Force "$root\_TEMPLATE" "$root\$Category\$Name"
"@

# run-tool.ps1
Set-Content "$root\run-tool.ps1" @"
param(
  [string]$Name,
  [string]$Category
)
Write-Output \"Running $Name ($Category)...\"
"@

# -----------------------------
# 4. Manifest + Daemons
# -----------------------------

Set-Content "$root\manifest.json" "{ \"tools\": [] }"

Set-Content "$root\daemons\toolforge-manifest-sync.ps1" @"
Write-Output \"Syncing manifest...\"
"@

Set-Content "$root\daemons\toolforge-index-sync.ps1" @"
Write-Output \"Syncing INDEX.md...\"
"@

Set-Content "$root\daemons\toolforge-docs-sync.ps1" @"
Write-Output \"Syncing DOCS_INDEX...\"
"@

# -----------------------------
# 5. API servers
# -----------------------------

Set-Content "$root\api\server.ts" @"
console.log('Toolforge API v1');
"@

Set-Content "$root\api\server-v2.ts" @"
console.log('Toolforge API v2');
"@

# -----------------------------
# 6. Launcher GUI
# -----------------------------

Set-Content "$root\launcher.html" @"
<!DOCTYPE html>
<html><body style='background:#0a0a0a;color:#eee;font-family:Consolas'>
<h1 style='color:#00ff88'>Toolforge Launcher</h1>
<p>Tools will appear here once manifest is populated.</p>
</body></html>
"@

# -----------------------------
# 7. Template scaffold
# -----------------------------

Set-Content "$root\_TEMPLATE\README.md" "# <Tool Name>"
Set-Content "$root\_TEMPLATE\VERSION.md" "version: 0.1.0"

Write-Output "Toolforge installation complete."
