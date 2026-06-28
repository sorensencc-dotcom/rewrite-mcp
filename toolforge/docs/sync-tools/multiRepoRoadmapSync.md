# multiRepoRoadmapSync

**Category**: sync-tools  
**Version**: 0.1.0  
**Status**: active  
**Owner**: soren  

## Purpose

Unified drift detector and roadmap updater for sorensencc-dotcom repos. Scans multiple repositories to detect when roadmap.json diverges from ROADMAP.md, reports drift, and optionally auto-syncs changes.

## Tags

sync, automation, multi-repo

## Inputs

- **repo-registry.json**: Configuration file listing target repositories to scan
  - Format: `basePath`, `repos[]`, `masterRoadmap`, `reportDir`, `archiveDir`
  - Each repo entry: `name`, `roadmapDoc` (path to ROADMAP.md)

## Outputs

- **Console**: Summary of drift findings (repos scanned, drift detected, changes listed)
- **File**: `C:\dev\logs\roadmap-sync-YYYY-MM-DD.log` (if configured)
- **Reports**: Drift analysis + recommended sync actions

## Behavior

1. Load `repo-registry.json` with list of target repositories
2. Scan each enabled repo for roadmap changes
3. Detect drift:
   - File modification times (< 24 hours = active)
   - Stalled repos (> 14 days since update)
   - Content changes in ROADMAP.md vs expected state
4. Generate drift report with:
   - Summary (count + severity)
   - Per-file diffs
   - Recommended fixes (resync, version bump, etc.)
5. Log results to console and optional file

## Dependencies

- Node.js 20+
- PowerShell 7+
- Git (for repo operations)

## Entrypoint

- **File**: `run.ps1` (PowerShell wrapper)
- **Runtime**: Node.js (via ts-node or CommonJS)

## Configuration

```json
{
  "basePath": "C:/dev",
  "repos": [
    {
      "name": "repo-name",
      "roadmapDoc": "path/to/ROADMAP.md"
    }
  ],
  "masterRoadmap": "TheFoundry/out/docs/roadmap/MASTER_ROADMAP_v3.0.md",
  "reportDir": "TheFoundry/reports/roadmap-diffs",
  "archiveDir": "TheFoundry/reports/roadmap-archive"
}
```

## Schedule

- **Frequency**: Daily 09:00 UTC
- **Last Run**: 2026-06-28 09:15:00Z
- **Next Run**: 2026-06-29 09:00:00Z
- **Registration**: Windows Task Scheduler (via setupTaskScheduler)

## Error Handling

- Exit code 0: Success
- Exit code 1+: Failure (reported to Task Scheduler)
- Errors logged with timestamps and severity (INFO/WARN/ERROR)

## Examples

```powershell
# Run with registry config
.\run-tool.ps1 -Run multiRepoRoadmapSync -Config repo-registry.json

# Direct invocation
& "C:\dev\toolforge\sync-tools\multiRepoRoadmapSync\run.ps1" repo-registry.json

# Check logs
Get-Content "C:\dev\logs\roadmap-sync-*.log" -Tail 50
```

## Performance Notes

- Scans multiple repos in parallel when safe
- Respects GitHub API rate limits
- Typical runtime: 5–10 minutes for 7 repos
- Logs progress for monitoring

## See Also

- [sync-tools/README.md](../../sync-tools/README.md) — Category guide
- [GOVERNANCE.md](../../GOVERNANCE.md) — Tool standards
- [repo-registry.json](../../sync-tools/repo-registry.json) — Registry config
