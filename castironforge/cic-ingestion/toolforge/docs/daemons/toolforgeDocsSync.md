# toolforgeDocsSync

**Category**: daemons  
**Version**: 0.1.0  
**Status**: active  
**Owner**: soren  

## Purpose

Background daemon that regenerates tool documentation. Scans tool source files, extracts metadata, and generates markdown docs in `C:\dev\toolforge\docs\<category>\`.

## Tags

daemon, documentation

## Inputs

Reads from:
- All tool files: `*.ps1`, `*.cjs`, `*.ts`, `*.sh`, `*.js`
- File headers and comments
- manifest.json (for metadata)

## Outputs

- **Markdown docs**: `C:\dev\toolforge\docs\<category>\<tool-name>.md`
- **DOCS_INDEX.md**: Master index of all generated docs
- **Console**: Progress (files processed, docs generated)
- **Logs**: `C:\dev\logs\docs-sync-*.log`

## Behavior

1. Scan all category directories for tool files
2. For each tool, extract:
   - Name, category, version
   - Purpose (from file headers)
   - Inputs/outputs (from code inspection)
   - Parameters/configuration
   - Dependencies
   - Examples
3. Merge with manifest.json metadata
4. Generate markdown doc with template:
   - Overview section
   - Inputs/outputs
   - Configuration
   - Examples
   - Dependencies
   - Related tools
5. Create/update `DOCS_INDEX.md` with links to all docs
6. Report generation summary

## Dependencies

- PowerShell 7+

## Entrypoint

- **File**: `toolforge-docs-sync.ps1`
- **Runtime**: PowerShell 7+

## Schedule

- **Frequency**: Background daemon (on-demand via Task Scheduler or manual trigger)
- **Task Name**: `Toolforge-Docs-OnDemand`

## Error Handling

- Exit code 0: Success
- Exit code 1+: Failure (logs error details)
- Skips files with parse errors (logs warning)
- Preserves existing docs on error

## Generated Docs Structure

```
C:\dev\toolforge\docs\
├── DOCS_INDEX.md
├── sync-tools/
│   ├── multiRepoRoadmapSync.md
│   └── ...
├── daemons/
│   ├── toolforgeManifestSync.md
│   ├── toolforgeDocsSync.md
│   ├── toolforgeIndexSync.md
│   └── ...
├── utilities/
│   ├── setupTaskScheduler.md
│   └── ...
└── (other categories)
```

## Examples

```powershell
# Run manually
& "C:\dev\toolforge\daemons\toolforge-docs-sync\toolforge-docs-sync.ps1"

# Trigger via Task Scheduler
Start-ScheduledTask -TaskName "Toolforge-Docs-OnDemand"

# View generated index
Get-Content C:\dev\toolforge\docs\DOCS_INDEX.md
```

## Notes

- Auto-triggered when tools are added/modified
- Supports multiple file types (PowerShell, Node.js, TypeScript, Bash)
- Generates consistent markdown format
- Preserves manual docs outside `docs/` directory

## See Also

- [daemons/README.md](../../daemons/README.md) — Daemon guidelines
- [DOCS_INDEX.md](../../docs/DOCS_INDEX.md) — Generated index
- [TOOL_CREATION_GUIDE.md](../../TOOL_CREATION_GUIDE.md) — Tool creation (includes doc requirements)
