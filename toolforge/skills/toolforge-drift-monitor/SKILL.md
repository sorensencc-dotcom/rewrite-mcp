---
skill_name: toolforge-drift-monitor
version: 0.1.0
category: operations
description: Weekly preventive drift detection for Toolforge canonical vs distributed instances
author: Chris Sorensen
tags: [toolforge, drift-detection, automation, monitoring]
---

# Toolforge Drift Monitor

Detect synchronization drift between canonical (`C:\dev\toolforge`) and distributed (`C:\dev\rewrite-mcp\toolforge`) Toolforge instances before it becomes critical.

## What It Does

Runs the multi-repo drift detector and generates a comprehensive DRIFT-REPORT.md showing:
- File count parity
- Version alignment  
- Tool implementation completeness
- Documentation presence
- Overall sync status (OK | WARNING | CRITICAL)

## When to Use

- **Weekly preventive scan** → Catch drift early, prevent 21+ item failures
- **Post-resync validation** → Confirm sync completed successfully
- **Before deployment** → Ensure distributed instance is operational
- **On-demand** → Manual check anytime

## How to Invoke

### Option A: Schedule (Recommended)
```powershell
# Daily at 09:00 UTC via Windows Task Scheduler
# Registered during toolforge setup-task-scheduler
```

### Option B: Manual
```powershell
cd C:\dev\toolforge
& ".\sync-tools\multiRepoRoadmapSync\multiRepoRoadmapSync.cjs"
```

### Option C: Via Skill (when installed)
```
Invoke-CliScript -Skill toolforge-drift-monitor -Action scan
```

## Output

**Pass (OK):**
```
✅ NO DRIFT DETECTED
- Canonical: 42 files (v1.1.0)
- Distributed: 41 files (v1.1.0)
- Status: SYNCED
```

**Warning (WARNING):**
```
⚠️ MINOR DRIFT
- Missing: 2 files in distributed
- Recommend: Manual resync
```

**Critical (CRITICAL):**
```
❌ CRITICAL DRIFT
- Missing: 21+ items
- Action: STOP. Resync required. See drift/DRIFT-REPORT.md
```

## Evidence

**Why this matters:**
- Experience: 2026-06-28 audit detected 21+ item drift after major resync
- Prevention: Early detection prevents operational failures
- Operational: System is now healthy; monitoring keeps it that way

**Historical evidence:**
- Canonical v1.1.0 (2026-06-28)
- Distributed synced (26 files)
- Task Scheduler operational (daily 09:00 UTC sync)

## Implementation Details

**Wraps:** `C:\dev\toolforge\sync-tools\multiRepoRoadmapSync\multiRepoRoadmapSync.cjs`

**Runs:** Node.js 20+ CommonJS module
- Compares canonical vs distributed
- Generates DRIFT-REPORT.md
- Returns exit code 0 (OK), 1 (WARNING), 2 (CRITICAL)

**Reports to:** `C:\dev\toolforge\drift\DRIFT-REPORT.md` (updated post-scan)

## Troubleshooting

**"Command not found"**
→ Ensure Node.js 20+ installed: `node --version`

**"Path not found"**
→ Canonical Toolforge must exist at `C:\dev\toolforge\`

**Report shows CRITICAL**
→ Stop. Run manual resync. See GOVERNANCE.md for resync procedures.

## See Also

- `GOVERNANCE.md` — Tool lifecycle rules
- `sync-tools/multiRepoRoadmapSync/` — Implementation
- `drift/DRIFT-REPORT.md` — Latest scan results

---

**Version:** 0.1.0 (beta)  
**Status:** beta (ready for testing; schedule integration pending)  
**Owner:** soren  
**Last Updated:** 2026-06-28
