# Daily Roadmap Sync — Setup Guide

## Overview

Automated daemon that scans all repos in `C:\dev` daily (09:00 UTC) against their roadmap docs, detects drift, updates docs, and sends structured Slack notifications.

## Files

- **`multiRepoRoadmapSync.ts`** — Main scan logic (TypeScript)
- **`repo-registry.json`** — Repo paths + roadmap doc mappings (config)
- **`setup-task-scheduler.ps1`** — Windows Task Scheduler setup (admin required)

## Prerequisites

- Node.js 18+ (on PATH)
- Npm packages: `node-fetch@2` (if not already installed)
- PowerShell 7+ (for task setup) — **run as Administrator**
- Slack webhook URL (create at: https://api.slack.com/messaging/webhooks)

## Quick Start

### 1. Compile TypeScript → JavaScript

```powershell
cd C:\dev\tools
npx tsc multiRepoRoadmapSync.ts --target ES2020 --module commonjs --esModuleInterop --skipLibCheck
mv multiRepoRoadmapSync.js multiRepoRoadmapSync.cjs
```

Or install TypeScript globally:

```powershell
npm install -g typescript
tsc multiRepoRoadmapSync.ts --target ES2020 --module commonjs --esModuleInterop --skipLibCheck
mv multiRepoRoadmapSync.js multiRepoRoadmapSync.cjs
```

Result: `C:\dev\tools\multiRepoRoadmapSync.cjs` (renamed for CommonJS execution)

### 2. Set Slack Webhook (Environment Variable)

**Option A: Temporary (current PowerShell session only)**

```powershell
$env:SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/YOUR_WEBHOOK_HERE"
```

**Option B: Permanent (all sessions)**

```powershell
[Environment]::SetEnvironmentVariable(
  "SLACK_WEBHOOK_URL",
  "https://hooks.slack.com/services/YOUR_WEBHOOK_HERE",
  "User"
)
```

Then restart PowerShell/CMD to pick up the new variable.

### 3. Test the Script (One-Shot)

```powershell
cd C:\dev
$env:SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/YOUR_WEBHOOK_HERE"
node tools\multiRepoRoadmapSync.js
```

Expected output:

```
Starting daily roadmap sync (2026-06-28T...)
Base path: C:/dev
Scanning 7 repos...

[rewrite-mcp] Scanning C:/dev/rewrite-mcp...
  → [drift summary]

[cic-os] Scanning C:/dev/cic-os...
  → [drift summary]

...

Report saved: C:\dev\TheFoundry\reports\roadmap-diffs\roadmap-sync-2026-06-28.json
```

✅ If you see "Report saved", the scan worked.

### 4. Register Windows Task Scheduler (Daily Automation)

**Run as Administrator:**

```powershell
# Set your Slack webhook first
$env:SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/YOUR_WEBHOOK_HERE"

# Run setup script
C:\dev\tools\setup-task-scheduler.ps1 `
  -SlackWebhook $env:SLACK_WEBHOOK_URL `
  -TaskName "Daily Roadmap Sync" `
  -Schedule "0 9 * * *"
```

Expected output:

```
✅ Task registered: Daily Roadmap Sync
   Schedule: Daily at 09:00 UTC
   Script: C:\dev\tools\multiRepoRoadmapSync.js
   Working dir: C:\dev
```

### 5. Verify Task Created

Open Task Scheduler (Windows):

```powershell
taskschd.msc
```

Look for: **"Daily Roadmap Sync"** under `Task Scheduler Library`

To test immediately:

```powershell
Start-ScheduledTask -TaskName "Daily Roadmap Sync"
```

Check `C:\dev\TheFoundry\reports\roadmap-diffs\roadmap-sync-*.json` for results.

---

## Configuration

### Registry (`C:\dev\repo-registry.json`)

Define which repos to scan and their roadmap doc paths:

```json
{
  "basePath": "C:/dev",
  "repos": [
    {
      "name": "rewrite-mcp",
      "roadmapDoc": "TheFoundry/out/docs/roadmap/REWRITE_LABS_SUBROADMAP_v3.0.md"
    }
  ],
  "reportDir": "TheFoundry/reports/roadmap-diffs",
  "archiveDir": "TheFoundry/reports/roadmap-archive"
}
```

**Add repos by:**
1. Edit `C:\dev\repo-registry.json`
2. Add entry to `repos` array with `name` + `roadmapDoc`
3. Save
4. Re-run script

---

## Drift Detection Rules

The daemon uses these heuristics to detect phase status:

| Rule | Detection | Result |
|------|-----------|--------|
| **Recent activity** | Directory modified < 24h | "Active" |
| **Stalled** | No changes > 14 days | "Stalled ⚠️" |
| **Complete marker** | `COMPLETE_MARKER` file exists | "Marked complete" |
| **Status file** | `STATUS.md` contains "Shipped" | "Shipped" |
| **Tests present** | `test/` or `tests/` directory exists | "Tests OK" |

### Extend Drift Logic

Edit `detectDrift()` function in `multiRepoRoadmapSync.ts` to add custom rules:

```typescript
async function detectDrift(repoPath: string) {
  // Add your custom logic here
  // Example: parse package.json version, check git tags, etc.
}
```

---

## Output Artifacts

After each run:

```
C:\dev\TheFoundry\reports\roadmap-diffs\
├── roadmap-sync-2026-06-28.json      ← Structured results
├── roadmap-sync-2026-06-29.json
└── ...

C:\dev\TheFoundry\reports\roadmap-archive\
├── 2026-06-28/
│   ├── MASTER_ROADMAP_v3.0.md.bak
│   ├── CIC_SUBROADMAP_v3.0.md.bak
│   └── ...
└── ...
```

### JSON Report Format

```json
{
  "timestamp": "2026-06-28T09:00:00.000Z",
  "summary": {
    "total": 7,
    "ok": 5,
    "stalled": 1,
    "errors": 1
  },
  "results": [
    {
      "name": "rewrite-mcp",
      "status": "ok",
      "driftSummary": "active",
      "changes": [
        "Directory modified in last 24 hours",
        "package.json updated"
      ],
      "lastModified": "2026-06-28T08:30:00.000Z"
    }
  ]
}
```

---

## Troubleshooting

### Task doesn't run

1. Check Windows Event Viewer → Windows Logs → System
2. Verify `multiRepoRoadmapSync.js` exists and is executable
3. Test manually: `node C:\dev\tools\multiRepoRoadmapSync.js`

### No Slack notification

1. Verify `SLACK_WEBHOOK_URL` environment variable is set (not placeholder)
2. Check webhook is correct: https://api.slack.com/messaging/webhooks
3. Review logs in `C:\dev\TheFoundry\reports\roadmap-diffs\roadmap-sync-*.json`

### Roadmap docs not updating

1. Verify roadmap doc paths in `repo-registry.json` are correct
2. Check file permissions (must be writable)
3. Look for errors in JSON report

### Task Scheduler access denied

1. Right-click PowerShell → "Run as administrator"
2. Run `setup-task-scheduler.ps1` again

---

## Monitoring

### Check latest report

```powershell
Get-Content C:\dev\TheFoundry\reports\roadmap-diffs\latest.json | ConvertFrom-Json | Format-Table
```

### View task history

```powershell
Get-ScheduledTaskInfo -TaskName "Daily Roadmap Sync"
```

### Manual run (test)

```powershell
Start-ScheduledTask -TaskName "Daily Roadmap Sync"

# Wait 10s, then check report
Start-Sleep 10
Get-Content C:\dev\TheFoundry\reports\roadmap-diffs\roadmap-sync-*.json | ConvertFrom-Json
```

---

## Advanced: Custom Drift Rules

To add repo-specific logic, extend `detectDrift()`:

```typescript
async function detectDrift(repoPath: string): Promise<...> {
  // ... existing code ...

  // Example: parse package.json
  const pkgPath = path.join(repoPath, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    if (pkg.version) {
      changes.push(`Version: ${pkg.version}`);
    }
  }

  // Example: check git status (requires repo to be a git repo)
  try {
    const status = execSync(`git -C "${repoPath}" status --short`, {
      encoding: "utf-8"
    });
    if (status.trim()) {
      changes.push("Uncommitted changes");
    }
  } catch (e) {
    // Not a git repo, skip
  }

  return { driftSummary, changes, lastModified };
}
```

---

## Support

- **Slack webhook help:** https://api.slack.com/messaging/webhooks
- **Task Scheduler docs:** https://docs.microsoft.com/en-us/windows/win32/taskschd/about-the-task-scheduler
- **TypeScript compilation:** `tsc --help`

---

**Status:** Ready for deployment  
**Version:** 1.0.0  
**Created:** 2026-06-28
