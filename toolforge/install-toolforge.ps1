$root = "C:\dev\toolforge"

# Environment variable
[Environment]::SetEnvironmentVariable("TOOLFORGE_ROOT", $root, "User")

# Claude workspace config
$workspace = @"
{
  "workspace": {
    "roots": [
      "C:/dev/toolforge"
    ],
    "description": "Dedicated workspace for all generated tools, daemons, scaffolds, and prototypes for Rewrite Labs and CIC."
  }
}
"@

Set-Content -Path "$root\CLAUDE_WORKSPACE.json" -Value $workspace

Write-Output "Toolforge installed. Claude Desktop now targets C:\dev\toolforge."
