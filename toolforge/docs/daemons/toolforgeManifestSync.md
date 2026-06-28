# toolforgeManifestSync

**Category**: daemons  
**Version**: 0.1.0  
**Status**: active  
**Owner**: soren  

## Purpose

Background daemon that syncs the toolforge manifest index. Rescans all tool directories, detects changes, and updates manifest.json with latest metadata.

## Tags

daemon, metadata

## Inputs

None (runs on schedule via Task Scheduler). Reads from:
- All category directories: `sync-tools/`, `daemons/`, `utilities/`, etc.
- Existing `manifest.json` (if present)

## Outputs

- **manifest.json**: Updated with discovered tools and metadata
- **Console**: Progress messages (tools found, changes detected)
- **Logs**: `C:\dev\logs\manifest-sync-*.log`

## Behavior

1. Scan all 7 Toolforge category directories
2. Discover files: `*.ps1`, `*.cjs`, `*.ts`, `*.sh`, `*.js`
3. Identify entrypoints and extract metadata:
   - Tool name (directory name)
   - Category (parent directory)
   - Entrypoint file (file with matching name)
   - Status (active/beta/archived)
   - Version (from VERSION.md if present)
4. Merge with existing manifest (preserves schedule, lastRun, custom metadata)
5. Write updated manifest.json
6. Log changes (new tools, removed tools, metadata updates)

## Dependencies

- PowerShell 7+

## Entrypoint

- **File**: `toolforge-manifest-sync.ps1`
- **Runtime**: PowerShell 7+

## Schedule

- **Frequency**: Every 15 minutes
- **Registration**: Windows Task Scheduler
- **Task Name**: `Toolforge-Manifest-15min`

## Error Handling

- Exit code 0: Success
- Exit code 1+: Failure (logged to event log)
- Errors trigger retry on next interval
- Manifest backup created before updates

## Examples

```powershell
# Run manually
& "C:\dev\toolforge\daemons\toolforge-manifest-sync\toolforge-manifest-sync.ps1"

# Check last run
Get-ScheduledTaskInfo -TaskName "Toolforge-Manifest-15min"

# View manifest
Get-Content C:\dev\toolforge\manifest.json | ConvertFrom-Json | Select -ExpandProperty tools
```

## Notes

- Daemon runs silently (no user interaction)
- Detects new tools automatically
- Preserves custom manifest fields (schedule, owner, tags, etc.)
- Used by `run-tool.ps1` to discover available tools

## See Also

- [daemons/README.md](../../daemons/README.md) — Daemon guidelines
- [manifest.json](../../manifest.json) — Tool registry
- [run-tool.ps1](../../run-tool.ps1) — Tool runner (uses manifest)
