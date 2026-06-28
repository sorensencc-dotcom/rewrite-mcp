# setupTaskScheduler

**Category**: utilities  
**Version**: 1.0.0  
**Status**: active  
**Owner**: soren  

## Purpose

Windows Task Scheduler registration utility for Toolforge daemons and sync-tools. Automates creation, deletion, and testing of scheduled tasks for background execution.

## Tags

setup, scheduling, windows

## Inputs

- **Parameters**:
  - `-Install`: Register all Toolforge tasks (daemons + sync-tools)
  - `-Remove`: Unregister all Toolforge tasks
  - `-Test`: Test all registered tasks (run once)

## Outputs

- **Task Scheduler**: Registered/unregistered Windows scheduled tasks
  - Tasks: `Toolforge-Daily-09UTC`, `Toolforge-Manifest-15min`, `Toolforge-Docs-OnDemand`, `Toolforge-Index-OnDemand`
- **Console**: Status messages (tasks registered, errors)
- **Event Log**: Task execution history (System log)

## Behavior

### Install Mode
1. Check Administrator privileges (required)
2. Define Toolforge tasks:
   - Manifest sync (every 15 minutes)
   - Docs sync (on-demand)
   - Index sync (on-demand)
   - Multi-repo roadmap sync (daily 09:00 UTC)
3. Create scheduled tasks with:
   - Trigger (time-based or on-demand)
   - Action (PowerShell script + arguments)
   - Settings (run with highest privilege, repeat on failure, etc.)
4. Register tasks in Task Scheduler
5. Report success/failure for each task

### Remove Mode
1. Check Administrator privileges
2. Unregister all Toolforge tasks
3. Verify removal
4. Report results

### Test Mode
1. Run each registered task once
2. Capture output and exit codes
3. Report pass/fail status

## Dependencies

- PowerShell 7+
- Administrator privileges (required)
- Windows Task Scheduler (built-in)

## Entrypoint

- **File**: `setup-task-scheduler.ps1`
- **Runtime**: PowerShell 7+ (as Administrator)

## Configuration

Hardcoded task definitions inside script:
- Task names (e.g., `Toolforge-Daily-09UTC`)
- Triggers (Daily at 09:00 UTC, Every 15 minutes)
- Actions (PowerShell + script paths)
- Run level (Highest)

## Error Handling

- Exit code 0: Success
- Exit code 1+: Failure (permission denied, task already exists, etc.)
- Errors reported with context (task name, specific error)
- Partial success: logs which tasks succeeded/failed

## Examples

```powershell
# Register all Toolforge tasks (run as Administrator)
& "C:\dev\toolforge\utilities\setup-task-scheduler\setup-task-scheduler.ps1" -Install

# Unregister all Toolforge tasks
& "C:\dev\toolforge\utilities\setup-task-scheduler\setup-task-scheduler.ps1" -Remove

# Test all tasks (run once)
& "C:\dev\toolforge\utilities\setup-task-scheduler\setup-task-scheduler.ps1" -Test

# View registered tasks
Get-ScheduledTask -TaskName "Toolforge*" | Select TaskName, State, NextRunTime

# View task execution history
Get-ScheduledTaskInfo -TaskName "Toolforge-Daily-09UTC"

# Manually run a task
Start-ScheduledTask -TaskName "Toolforge-Daily-09UTC"
```

## Registered Tasks

| Task Name | Schedule | Entrypoint | Purpose |
|-----------|----------|-----------|---------|
| Toolforge-Manifest-15min | Every 15 min | toolforge-manifest-sync.ps1 | Update manifest.json |
| Toolforge-Docs-OnDemand | On-demand | toolforge-docs-sync.ps1 | Regenerate tool docs |
| Toolforge-Index-OnDemand | On-demand | toolforge-index-sync.ps1 | Update tool index |
| Toolforge-Daily-09UTC | Daily 09:00 UTC | run-tool.ps1 -Run multiRepoRoadmapSync | Sync roadmaps |

## Notes

- Requires Administrator privileges to register/remove tasks
- Tasks run with highest privilege level
- Test mode useful for validation before deployment
- Event log contains execution history

## See Also

- [utilities/README.md](../../utilities/README.md) — Utilities category guide
- [OPERATOR_GUIDE.md](../../OPERATOR_GUIDE.md) — How to use Task Scheduler
- [daemons/](../../daemons/) — Daemon implementations
- [sync-tools/](../../sync-tools/) — Sync-tools directory
