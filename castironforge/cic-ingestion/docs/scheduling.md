<!-- file: docs/scheduling.md | created: 2026-05-03 | version: 1.0.0 -->

# Scheduling

The CIC daily pipeline runs automatically via **Windows Task Scheduler** every day at 9:00 AM.

---

## Task Configuration

| Property | Value |
|----------|-------|
| Task name | `CIC Daily Pipeline` |
| Trigger | Daily at 09:00 |
| Action | `run-daily.bat` |
| Start in | `C:\Users\soren\temp\cic-ingestion\` |
| Log output | `logs\daily-YYYY-MM-DD.log` |
| Run as | Current user |
| Run whether logged in | Optional (requires saved credentials) |

---

## run-daily.bat

```bat
@echo off
REM file: run-daily.bat
REM created: 2026-05-03
REM version: 1.0.0

SET PROJECT=C:\Users\soren\temp\cic-ingestion
SET LOG=%PROJECT%\logs\daily-%date:~10,4%-%date:~4,2%-%date:~7,2%.log

cd /d %PROJECT%
node scripts/run-daily.js >> %LOG% 2>&1
```

> **Note:** `%date%` format is locale-dependent on Windows. If logs show wrong dates, replace with a Node-generated filename by moving the log path into `run-daily.js` directly.

---

## run-daily.js — Stage Sequence

```
Phase 0: folders-maintenance  (always runs, never skipped)
Phase 1: harvester
Phase 2: sweeper
Phase 3: indexer
Phase 4: corpus builder
Phase 5: status report
```

Each phase is wrapped in try/catch. Failures are logged and the pipeline continues.

---

## Log Files

Location: `logs/daily-YYYY-MM-DD.log`

Each log line is a structured JSON object:

```
{"level":"info","module":"run-daily","msg":"=== CIC Daily Pipeline Start ===","ts":"2026-05-03T09:00:00.000Z"}
{"level":"info","module":"harvester","msg":"Scan complete","ts":"...","found":14}
{"level":"info","module":"sweeper","msg":"Sweep complete","ts":"...","moved":14,"errors":0}
{"level":"info","module":"run-daily","msg":"=== CIC Daily Pipeline Complete ===","ts":"..."}
```

---

## Creating the Scheduled Task

### Option A — Task Scheduler GUI

1. Open **Task Scheduler** → Create Basic Task
2. Name: `CIC Daily Pipeline`
3. Trigger: Daily, 09:00
4. Action: Start a program
5. Program: `C:\Users\soren\temp\cic-ingestion\run-daily.bat`
6. Start in: `C:\Users\soren\temp\cic-ingestion\`

### Option B — PowerShell (one-liner)

```powershell
$action  = New-ScheduledTaskAction `
             -Execute 'C:\Users\soren\temp\cic-ingestion\run-daily.bat' `
             -WorkingDirectory 'C:\Users\soren\temp\cic-ingestion'
$trigger = New-ScheduledTaskTrigger -Daily -At 09:00
Register-ScheduledTask `
  -TaskName 'CIC Daily Pipeline' `
  -Action $action `
  -Trigger $trigger `
  -RunLevel Highest `
  -Force
```

### Option C — schtasks.exe

```bat
schtasks /create /tn "CIC Daily Pipeline" ^
  /tr "C:\Users\soren\temp\cic-ingestion\run-daily.bat" ^
  /sc daily /st 09:00 /f
```

---

## Manual Trigger

```bash
# From project root
npm run daily:orchestrated

# Or run full 8-stage pipeline
npm run all

# Or trigger via Castironforge API
curl -X POST http://localhost:3000/api/sweeper/pipeline
```

---

## Verifying the Schedule

```powershell
# Check task status
Get-ScheduledTask -TaskName 'CIC Daily Pipeline' | Select-Object State, LastRunTime, NextRunTime

# View last run result
(Get-ScheduledTaskInfo -TaskName 'CIC Daily Pipeline').LastTaskResult
# 0 = success
```

```bash
# Check today's log
Get-Content logs\daily-$(Get-Date -Format 'yyyy-MM-dd').log | Select-Object -Last 20
```

---

## WSL2 / Cron (alternative)

If running from WSL2 instead of Windows Task Scheduler:

```bash
# crontab -e
0 9 * * * cd /mnt/c/Users/soren/temp/cic-ingestion && node scripts/run-daily.js >> /mnt/c/Users/soren/temp/cic-ingestion/logs/daily-$(date +\%Y-\%m-\%d).log 2>&1
```

Ensure WSL2 auto-start is enabled or that the cron daemon is running (`sudo service cron start`).
