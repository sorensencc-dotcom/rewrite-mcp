# CIC Phase 7.15–7.20 Stability Soak — Operator Runbook

**Last Updated:** 2026-06-06  
**Phase:** 7.15–7.20 (ARL Confidence Model + Drift Calculator Validation)  
**Operator Guide:** All four infrastructure pieces for 12-hour continuous load test

---

## Overview

The stability soak test validates the **Advanced Reasoning Layer** under continuous adversarial load for 12 hours. Four key metrics must update every 30 seconds:

- **Drift Avg** — semantic/temporal/causal signal divergence
- **Contradiction Avg** — narrative contradiction detection
- **Adversarial Rate** — attack surface exposure (should climb steadily)
- **Stability Score** — overall system resilience (should oscillate, not freeze)

If any metric stops updating for 5 minutes, **the process is dead** and must restart.

---

## Quick Start (One Command)

### Windows (PowerShell)

```powershell
# Restart a failed soak with full cleanup
.\scripts\restart-stability-soak.ps1 -Mode orchestrate -Duration 12h

# OR with queue clearing skipped (if you're confident state is clean)
.\scripts\restart-stability-soak.ps1 -Mode orchestrate -Duration 12h -SkipQueueClear

# Dry-run mode (shows what would happen, doesn't execute)
.\scripts\restart-stability-soak.ps1 -Mode orchestrate -Duration 12h -DryRun
```

### Linux / macOS

```bash
# Direct invocation
npm run orchestrate:stability -- --hours=12

# OR via PM2 (if installed)
pm2 start ecosystem.config.js
```

---

## Infrastructure Pieces

### 1. **Restart Script** (`scripts/restart-stability-soak.ps1`)

**Purpose:** Atomic restart with full process cleanup + state reset

**What it does:**
1. Kills any orphaned `node` processes matching `(stability|orchestrate)`
2. Clears DLQ (Dead Letter Queue) and event buffers
3. Removes stale `.tmp/*.state.json` and `.tmp/*.lock` files
4. Validates `npm run test:stability` and `npm run orchestrate:stability` exist
5. Starts fresh 12-hour soak

**Usage:**

```powershell
# Default: orchestrate mode, 12 hours
.\scripts\restart-stability-soak.ps1

# Test mode instead
.\scripts\restart-stability-soak.ps1 -Mode test

# 6-hour or 24-hour soaks
.\scripts\restart-stability-soak.ps1 -Duration 6h
.\scripts\restart-stability-soak.ps1 -Duration 24h

# Skip queue clearing (dangerous — only if you know state is clean)
.\scripts\restart-stability-soak.ps1 -SkipQueueClear

# Dry-run (no side effects, shows commands)
.\scripts\restart-stability-soak.ps1 -DryRun
```

---

### 2. **PM2 Ecosystem Config** (`ecosystem.config.js`)

**Purpose:** Supervisor that auto-restarts crashed soak, enforces memory limits

**Features:**
- Restarts crashed process up to 5 times (with 4s backoff)
- 2GB memory limit enforced (OOM-kill at 2GB)
- High water mark at 1.8GB (triggers graceful restart)
- Logs to `./logs/stability-soak.out.log` and `.err.log`
- Cluster mode (allows multiple instances)

**Installation:**

```bash
npm install -g pm2
```

**Start supervision:**

```bash
# Start orchestration soak with auto-restart
pm2 start ecosystem.config.js --name cic-stability-orchestrate

# OR test mode
pm2 start ecosystem.config.js --name cic-stability-test

# Monitor in real-time
pm2 monit

# View logs
pm2 logs cic-stability-orchestrate
pm2 logs cic-stability-orchestrate --err

# Stop
pm2 stop cic-stability-orchestrate

# Restart
pm2 restart cic-stability-orchestrate

# Remove from PM2
pm2 delete cic-stability-orchestrate
```

**Persistent start (Linux/macOS):**

```bash
pm2 startup
pm2 save
```

This registers PM2 to auto-start on system boot.

---

### 3. **systemd Service** (`cic-stability.service`)

**Purpose:** Production-grade init system integration (Linux/macOS only)

**Features:**
- Auto-restart on boot
- Restart on crash (max 3 restarts per 10 minutes)
- 2GB memory limit via cgroup
- Graceful shutdown (30s timeout)
- systemd journal logging

**Installation (Linux):**

```bash
sudo cp cic-stability.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable cic-stability.service
sudo systemctl start cic-stability.service
```

**Operations:**

```bash
# Check status
sudo systemctl status cic-stability.service

# View logs
journalctl -u cic-stability.service -f

# Restart
sudo systemctl restart cic-stability.service

# Stop
sudo systemctl stop cic-stability.service

# Disable auto-start
sudo systemctl disable cic-stability.service
```

**Health check:**

```bash
# Monitor via journalctl
journalctl -u cic-stability.service --since "5 minutes ago"
```

---

### 4. **Grafana Alert Rules** (`provisioning/dashboards/cic-stability-alerts.json`)

**Purpose:** Fire alerts when stability metrics go stale

**Alert Rules:**

| Alert | Condition | Fire After | Severity |
|-------|-----------|-----------|----------|
| **Drift Metric Stalled** | No change in 5 min | 5 min | 🔴 Critical |
| **Contradiction Metric Stalled** | No change in 5 min | 5 min | 🔴 Critical |
| **Adversarial Rate Not Advancing** | No increase in 5 min | 5 min | 🟠 Warning |
| **Stability Score Not Updating** | Change < 0.001 in 5 min | 5 min | 🔴 Critical |
| **Process Not Running** | `up{job="cic-stability"}` < 1 | 2 min | 🔴 Critical |

**Installation:**

1. Export JSON from provisioning directory
2. Import into Grafana: **Alerting → Alert Rules → Import**
3. Ensure Prometheus datasource is named `prometheus` (edit JSON if not)
4. Set up notification channels (Slack, PagerDuty, email)

**Testing alerts:**

```bash
# Manually trigger from Grafana UI:
# 1. Go to Alert Rules
# 2. Click "Edit" on "CIC Stability — Drift Metric Stalled"
# 3. Click "Test" to simulate fire condition
```

---

## Health Check Endpoint

If you've wired up `src/stability/health-endpoint.js`, you can query soak state:

```bash
# Is the soak running and healthy?
curl http://localhost:3000/health/stability

# Expected response (HTTP 200 if healthy):
{
  "healthy": true,
  "soak": {
    "phase": "7.15-7.20",
    "status": "running",
    "startTime": "2026-06-06T14:30:00Z",
    "duration": "12h",
    "metricsLastUpdated": "2026-06-06T14:35:30Z",
    "secondsSinceLastUpdate": 2
  },
  "metrics": {
    "driftAvg": 0.62,
    "contradictionAvg": 0.58,
    "adversarialRate": 0.71,
    "stabilityScore": 0.68
  }
}

# If metrics are stale (HTTP 503):
curl http://localhost:3000/health/stability
# => "healthy": false, "secondsSinceLastUpdate": 312 (>5 min)
```

**Prometheus scrape config:**

```yaml
- job_name: 'cic-stability'
  static_configs:
    - targets: ['localhost:3000']
  metrics_path: '/health/stability'
  scrape_interval: 30s
```

---

## Troubleshooting

### Soak Dies After 30 Minutes

**Symptom:** Grafana shows metrics updating, then flatline

**Diagnosis:**
1. Check PM2 logs: `pm2 logs cic-stability-orchestrate`
2. Check systemd journal: `journalctl -u cic-stability.service -n 50`
3. Check node process memory: `node --expose-gc` or `ps aux | grep node`

**Common causes:**
- **OOM Kill** — process hit 2GB limit
  - Fix: Increase `MemoryMax` in ecosystem.config.js or systemd service
  - Or reduce test load (smaller batch sizes, fewer concurrent adversarial queries)

- **Unhandled Rejection** — async operation threw and wasn't caught
  - Fix: Check logs for `UnhandledPromiseRejectionWarning`
  - Add `.catch()` handlers to all promises in soak runner

- **Event Loop Blocked** — synchronous operation taking >5 seconds
  - Fix: Profile with `clinic.js` or ` 0x`
  - Move blocking ops to worker threads

### Metrics Update But Show Wrong Values

**Symptom:** All metrics at 0, or frozen at first value

**Diagnosis:**
1. Check soak runner is actually running: `ps aux | grep orchestrate`
2. Check metrics collection code for bugs
3. Verify Prometheus scrape is hitting the right endpoint

**Fix:**
```bash
# Kill and restart
.\scripts\restart-stability-soak.ps1 -Mode orchestrate -Duration 12h
```

### Can't Start via PM2

**Error:** `npm ERR! Missing script: "orchestrate:stability"`

**Fix:** Add to `ingestion/package.json`:

```json
{
  "scripts": {
    "orchestrate:stability": "node src/stability/orchestrator.js",
    "test:stability": "vitest run --reporter=verbose --bail=false"
  }
}
```

### Grafana Alerts Not Firing

**Symptom:** Alerts created but never fire even when metrics are stale

**Diagnosis:**
1. Check datasource: **Grafana → Configuration → Data Sources → prometheus**
2. Verify Prometheus is scraping correctly: Visit `http://prometheus:9090` and search `cic_stability_drift_avg`
3. Check alert rule syntax in JSON

**Fix:** Test query in Grafana:
1. Go to **Explore**
2. Select Prometheus
3. Run: `increase(cic_stability_drift_avg[5m])`
4. You should see a graph. If not, metrics aren't being scraped.

---

## Monitoring During 12-Hour Soak

**Dashboard URL:** `http://localhost:3000/d/arl-v2-dash?from=now-6h&to=now`

**What to watch:**

| Metric | Expected Behavior | Red Flag |
|--------|-------------------|----------|
| **Drift Avg** | Slowly increase/decrease (≈0.01 per 30s) | Flat line or NaN |
| **Contradiction Avg** | Similar to Drift (couples drift) | Frozen at 0 |
| **Adversarial Rate** | Steady climb (≈0.005 per 30s) | Stuck at same value |
| **Stability Score** | Oscillates (0.6–0.8 range) | Frozen or steadily declining |
| **Process Up** | 1 (running) | 0 (down) |

**If anything flatlines:**
1. Check Grafana alerts — they should fire within 5 minutes
2. If alert fired: check PM2/systemd logs
3. Restart: `.\scripts\restart-stability-soak.ps1`

---

## End-to-End Workflow

### First Time Setup

```powershell
# 1. Install PM2 (optional but recommended)
npm install -g pm2

# 2. Create logs directory
mkdir logs

# 3. Validate npm scripts exist
Get-Content "ingestion/package.json" | ConvertFrom-Json | Select-Object -ExpandProperty scripts

# 4. Run initial soak with restart script
.\scripts\restart-stability-soak.ps1 -Mode orchestrate -Duration 12h
```

### During Soak

```bash
# Watch Grafana dashboard
open http://localhost:3000/d/arl-v2-dash

# OR query health endpoint every 30s
while true; do curl http://localhost:3000/health/stability | jq .; sleep 30; done

# OR monitor PM2 (if using PM2)
pm2 monit
```

### If Soak Crashes

```powershell
# Restart immediately with full cleanup
.\scripts\restart-stability-soak.ps1 -Mode orchestrate -Duration 12h

# After restart, verify metrics are updating
# (wait 30 seconds for first metric push)
curl http://localhost:3000/health/stability
```

### After 12-Hour Completion

```bash
# Download results
# Metrics should be in Prometheus TSDB at:
# http://localhost:9090/graph?expr=cic_stability_drift_avg

# Export for analysis
# (use Prometheus HTTP API or Grafana export)

# Archive logs
gzip -c logs/stability-soak.*.log > archive/stability-soak-2026-06-06.tar.gz
```

---

## Reference: Script Parameters

### `restart-stability-soak.ps1`

```powershell
Parameters:
  -Mode (test|orchestrate)
    test:        Use npm run test:stability (vitest-based)
    orchestrate: Use npm run orchestrate:stability (multi-agent) [DEFAULT]

  -Duration (6h|12h|24h)
    6h:  Quick validation (2 cycles of 3h)
    12h: Full stability soak [DEFAULT]
    24h: Extended stress test

  -SkipQueueClear
    Skip clearing DLQ and event buffers
    WARNING: Only use if you're certain state is clean

  -DryRun
    Show what would happen without executing side effects
```

---

## Files Included

```
cic-stability/
├── scripts/
│   └── restart-stability-soak.ps1           # Main restart CLI
├── ecosystem.config.js                      # PM2 supervision config
├── cic-stability.service                    # systemd service (Linux)
├── provisioning/
│   └── dashboards/
│       └── cic-stability-alerts.json        # Grafana alert rules
├── ingestion/
│   └── src/stability/
│       └── health-endpoint.js               # Health check HTTP endpoint
├── logs/                                    # (auto-created)
│   ├── stability-soak.out.log
│   └── stability-soak.err.log
└── STABILITY_SOAK_RUNBOOK.md                # This file
```

---

## Support & Escalation

**If you get stuck:**

1. **Process won't start** → Check npm scripts exist, run `npm install`
2. **Process crashes immediately** → Check `pm2 logs` or `journalctl`
3. **Metrics don't update** → Check Prometheus scrape, verify soak runner is hitting metrics endpoint
4. **Alerts fire but metrics look OK** → Check Prometheus query is correct in Grafana
5. **Need to debug the soak itself** → Look at Phase 7.7–7.8 implementation in code

**Next steps after 12-hour soak completes:**
- Review [[arl-phase-7-7-confidence-model]] for confidence scoring details
- Review [[arl-phase-7-8-drift-calculator]] for drift detection logic
- Check if any threshold tuning is needed based on 12-hour data
