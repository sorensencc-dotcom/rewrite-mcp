# bootstrap-toolforge.ps1
# Creates the full toolforge directory structure and standard templates

$root = "C:\dev\toolforge"

$dirs = @(
    "$root",
    "$root\mcp-servers",
    "$root\adapters",
    "$root\daemons",
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

# Write template README
$templateReadme = @"
# <Tool Name>

## Overview
Short description of what this tool does and which repos it interacts with.

## Layout
src/        # main source code  
tests/      # unit tests  
scripts/    # helper scripts or runners  
logs/       # runtime logs (ignored by git)

## Usage
Instructions for running or integrating the tool.

## Notes
Any repo-specific or CIC/Rewrite Labs integration details.
"@

Set-Content -Path "$root\_TEMPLATE\README.md" -Value $templateReadme

Write-Output "Toolforge bootstrap complete at C:\dev\toolforge"
