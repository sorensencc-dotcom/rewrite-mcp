# CIC Stability Soak — Integration Guide

This guide shows how to wire the health-check endpoint and restart script into your actual soak runner.

---

## 1. Wire Health Endpoint Into Your Express App

If you have an Express server in your soak runner:

### Before (current structure):

```javascript
// src/server/intelligence-server.js (or wherever you initialize Express)
import express from 'express';
import healthRoutes from '../stability/health-endpoint.js';

const app = express();

// ... other routes ...

app.use('/health/stability', healthRoutes);

app.listen(3000, () => {
  console.log('CIC server listening on :3000');
});
```

### Then call endpoints from your soak:

```javascript
// src/stability/orchestrator.js (or your main soak runner)

async function reportHeartbeat(metrics, status = 'running') {
  try {
    await fetch('http://localhost:3000/health/stability/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        metrics: {
          driftAvg: metrics.drift,
          contradictionAvg: metrics.contradiction,
          adversarialRate: metrics.adversarial,
          stabilityScore: metrics.stability,
        },
      }),
    });
  } catch (err) {
    console.warn('Failed to report health heartbeat:', err.message);
    // Don't crash the soak if health endpoint is down
  }
}

// Call every 30 seconds from your metrics loop:
setInterval(() => {
  reportHeartbeat(currentMetrics);
}, 30_000);
```

---

## 2. Call Startup/End Endpoints

### On soak start:

```javascript
async function startSoakSession(duration) {
  try {
    await fetch('http://localhost:3000/health/stability/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration }),
    });
    console.log('✅ Soak session registered with health endpoint');
  } catch (err) {
    console.warn('Health endpoint not available (OK for local testing)');
  }
}
```

### On completion or error:

```javascript
async function endSoakSession(status = 'completed', reason = '') {
  try {
    await fetch('http://localhost:3000/health/stability/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    });
  } catch (err) {
    console.warn('Could not report soak end');
  }
}

// On completion
await endSoakSession('completed', 'All 12 hours elapsed');

// On error
process.on('uncaughtException', (err) => {
  endSoakSession('failed', `Uncaught: ${err.message}`);
});
```

---

## 3. Integrate Restart Script Hooks

If your soak has cleanup logic before exit, wire it to the restart script:

### Define cleanup tasks in your soak runner:

```javascript
// src/stability/orchestrator.js

export async function cleanup() {
  console.log('Cleaning up soak state...');
  
  // Clear in-memory metrics
  globalMetrics = null;
  
  // Gracefully close DB connections
  await db.close();
  
  // Write final state to disk
  await fs.writeFile('.tmp/final-state.json', JSON.stringify(finalMetrics));
  
  console.log('Cleanup complete');
}

// Register signal handlers
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, cleaning up...');
  await cleanup();
  process.exit(0);
});
```

### The restart script calls this indirectly:

The restart script sends `SIGTERM` to the process, giving it 5 seconds to clean up. Your signal handler above catches it and exits gracefully.

---

## 4. Wire Into PM2

Ensure your package.json has the right script:

```json
{
  "scripts": {
    "orchestrate:stability": "node src/stability/orchestrator.js",
    "test:stability": "vitest run --reporter=verbose",
    "queue:clear": "node scripts/clear-queues.js",
    "dlq:clear": "node scripts/clear-dlq.js"
  }
}
```

Then PM2 will automatically:
1. Kill the process if it hits 2GB (configured in ecosystem.config.js)
2. Restart it after 4 seconds
3. Log output to `logs/stability-soak.*.log`

**Verify PM2 is wired up:**

```bash
pm2 start ecosystem.config.js
pm2 logs cic-stability-orchestrate
# Should see your soak runner start, and health heartbeats every 30 seconds
```

---

## 5. Test Health Endpoint Locally

Before running the full 12-hour soak:

```bash
# Terminal 1: Start your soak (or just the health endpoint server)
npm run start

# Terminal 2: Test endpoints
curl http://localhost:3000/health/stability

# Should return:
{
  "healthy": false,
  "soak": { "status": "starting", ... },
  "metrics": { "driftAvg": 0, ... }
}
```

---

## 6. Monitor From Grafana

Once metrics are flowing into Prometheus:

```bash
# Terminal: Check Prometheus is scraping
curl 'http://localhost:9090/api/v1/query?query=cic_stability_drift_avg'

# Should return:
{
  "status": "success",
  "data": {
    "resultType": "vector",
    "result": [
      {
        "metric": { "__name__": "cic_stability_drift_avg" },
        "value": [1234567890, "0.62"]
      }
    ]
  }
}
```

If you don't see data, check:
1. Is your soak runner actually pushing metrics to Prometheus?
2. Is Prometheus configured to scrape from your app?
3. Is the scrape interval short enough (should be 30s)?

---

## 7. Full Integration Checklist

- [ ] Health endpoint wired into Express app (or standalone server)
- [ ] Soak runner calls `/health/stability/start` on boot
- [ ] Soak runner calls `/health/stability/heartbeat` every 30 seconds
- [ ] Soak runner calls `/health/stability/end` on completion/error
- [ ] `npm run orchestrate:stability` script defined in package.json
- [ ] `npm run test:stability` script defined (optional)
- [ ] `npm run queue:clear` script defined (optional)
- [ ] `npm run dlq:clear` script defined (optional)
- [ ] PM2 installed: `npm install -g pm2`
- [ ] Test restart script: `.\scripts\restart-stability-soak.ps1 -DryRun`
- [ ] Prometheus scraping health endpoint
- [ ] Grafana alert rules imported
- [ ] Dashboard URL bookmarked: `http://localhost:3000/d/arl-v2-dash`

---

## 8. Example: Minimal Soak Runner

Here's a complete minimal example to test the infrastructure:

### `src/stability/orchestrator.js`

```javascript
import fetch from 'node-fetch';

class StabilitySoakRunner {
  constructor(durationHours = 12) {
    this.durationHours = durationHours;
    this.startTime = null;
    this.metrics = {
      driftAvg: Math.random(),
      contradictionAvg: Math.random(),
      adversarialRate: Math.random(),
      stabilityScore: Math.random(),
    };
  }

  async start() {
    console.log(`🚀 Starting ${this.durationHours}-hour stability soak...`);
    this.startTime = Date.now();

    // Register with health endpoint
    await this.reportStart();

    // Heartbeat every 30 seconds
    const heartbeatInterval = setInterval(async () => {
      this.updateMetrics();
      await this.reportHeartbeat();
    }, 30_000);

    // Run for specified duration
    const durationMs = this.durationHours * 60 * 60 * 1000;
    setTimeout(async () => {
      clearInterval(heartbeatInterval);
      await this.reportEnd('completed');
      console.log(`✅ Soak completed after ${this.durationHours} hours`);
      process.exit(0);
    }, durationMs);
  }

  updateMetrics() {
    // Simulate metrics changing
    this.metrics.driftAvg += (Math.random() - 0.5) * 0.1;
    this.metrics.contradictionAvg += (Math.random() - 0.5) * 0.1;
    this.metrics.adversarialRate += Math.random() * 0.01;
    this.metrics.stabilityScore += (Math.random() - 0.5) * 0.05;

    // Clamp to 0-1
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = Math.max(0, Math.min(1, this.metrics[key]));
    });

    console.log(`📊 Metrics:`, this.metrics);
  }

  async reportStart() {
    try {
      await fetch('http://localhost:3000/health/stability/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: `${this.durationHours}h` }),
      });
      console.log('✅ Registered with health endpoint');
    } catch (err) {
      console.log('⚠️  Health endpoint not available (OK for now)');
    }
  }

  async reportHeartbeat() {
    try {
      await fetch('http://localhost:3000/health/stability/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'running',
          metrics: this.metrics,
        }),
      });
    } catch (err) {
      console.warn('Failed to report heartbeat:', err.message);
    }
  }

  async reportEnd(status) {
    try {
      await fetch('http://localhost:3000/health/stability/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.warn('Failed to report soak end');
    }
  }
}

// Main
const soak = new StabilitySoakRunner(0.1); // 6 minutes for testing
soak.start().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await soak.reportEnd('terminated');
  process.exit(0);
});
```

### `package.json`

```json
{
  "scripts": {
    "start": "node src/server/intelligence-server.js",
    "orchestrate:stability": "node src/stability/orchestrator.js",
    "test:stability": "echo 'not implemented yet'"
  },
  "dependencies": {
    "express": "^4.18.0",
    "node-fetch": "^3.0.0"
  }
}
```

**Test it:**

```bash
npm run orchestrate:stability

# In another terminal, query health:
curl http://localhost:3000/health/stability | jq

# Should show metrics changing every 30 seconds
```

---

## Questions?

Refer to:
- **Full Runbook:** `STABILITY_SOAK_RUNBOOK.md`
- **Memory Notes:** [[arl-phase-7-7-confidence-model]], [[arl-phase-7-8-drift-calculator]]
