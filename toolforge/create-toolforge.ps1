# create-toolforge.ps1
# Creates the full toolforge directory structure under C:\dev

$root = "C:\dev\toolforge"

$dirs = @(
    "$root",
    "$root\mcp-servers",
    "$root\adapters",
    "$root\daemons",
    "$root\sync-tools",
    "$root\scaffolds",
    "$root\prototypes",
    "$root\utilities"
)

foreach ($d in $dirs) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d | Out-Null
    }
}

Write-Output "toolforge directory structure created at C:\dev\toolforge"
