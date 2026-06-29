# DocsManager Dashboard Integration

## Overview

DocsManagerPanel consumes ingestion metrics from the `/console/metrics` endpoint and displays:
- **Drift Score**: Real-time documentation semantic drift (0.0–1.0)
- **Audit Events**: Schema/format/reference/coverage issues (last 10)
- **Sync Status**: Last synchronization timestamp
- **Event Counters**: Processed/skipped event statistics

## API Endpoint

### GET /console/metrics

Returns system metrics + docs-manager ingestion stats:

```json
{
  "status": "ok",
  "data": {
    "timestamp": "2026-06-30T12:34:56.789Z",
    "cpuPercent": 45.2,
    "memoryPercent": 62.1,
    "diskPercent": 38.5,
    "networkIn": 1024,
    "networkOut": 2048,
    "requestsPerSecond": 120,
    "errorRate": 0.01,
    "avgLatencyMs": 45,
    "docsManager": {
      "drift": 0.25,
      "auditCount": 42,
      "lastSync": 1719747296000,
      "eventsProcessed": 1503,
      "eventsSkipped": 7,
      "audits": [
        {
          "timestamp": 1719747296000,
          "sequenceId": 1503,
          "docId": "doc:api:v1",
          "path": "specs/api.yaml",
          "severity": "error",
          "category": "schema",
          "message": "Missing operationId in endpoint"
        },
        ...
      ]
    }
  },
  "timestamp": "2026-06-30T12:34:56.789Z"
}
```

## Component Usage

### Import & Mount

```tsx
import { DocsManagerPanel } from '@/dashboard/DocsManagerPanel';

export function MyDashboard() {
  return (
    <div className="dashboard-grid">
      {/* other panels */}
      <DocsManagerPanel refreshInterval={5000} />
    </div>
  );
}
```

### Props

- `refreshInterval?: number` — Polling interval in ms (default: 5000)

### Styling

Component includes internal CSS (`DocsManagerPanel.css`). All classes prefixed with `.docs-manager-panel`:

- `.docs-manager-panel` — Container
- `.panel-header` — Title + refresh button
- `.summary-section` — Metrics list
- `.audits-section` — Audit event table
- `.severity-{error|warning|info}` — Row coloring per severity

## Drift Score Color Coding

| Range | Color | Severity |
|-------|-------|----------|
| 0.0–0.1 | Green | Healthy |
| 0.1–0.3 | Cyan | Warning |
| 0.3–0.6 | Yellow | Caution |
| 0.6–0.8 | Orange | Concerning |
| 0.8–1.0 | Red | Critical |

## Data Flow

1. **Producer** (docs-manager/emitter.ts)
   - Emits Audit/Drift/Sync/Consolidation events
   - Appends to JSONL log: `cic-ingestion/logs/docs_manager.jsonl`

2. **Ingestion** (cic-ingestion/src/ingestion/jobs/docsManagerJob.ts)
   - Reads JSONL (30s cycle via daemon)
   - Tracks state with `lastSeenSequenceId` (replay-safe)
   - Updates CICPersistedState.audits + CICPersistedState.drift["docs-manager"]
   - Accumulates drift penalties: 0.1 @ 0.2, 0.2 @ 0.4, 0.2 @ 0.6

3. **Metrics Export** (console.ts /console/metrics)
   - Calls `getDocsManagerMetrics(state)`
   - Returns metrics + last 10 audits to dashboard

4. **Dashboard** (DocsManagerPanel)
   - Polls `/console/metrics` every 5s (configurable)
   - Renders drift chart, audit table, sync status

## Testing

### Manual Test

```bash
# Start CIC daemon + docs-manager emitter
npm run dev

# In another terminal:
curl http://localhost:3000/console/metrics | jq .data.docsManager

# Should show:
{
  "drift": 0.25,
  "auditCount": 5,
  "lastSync": 1719747296000,
  "eventsProcessed": 5,
  "eventsSkipped": 0,
  "audits": [...]
}
```

### Emit Test Events

```bash
# From docs-manager/emitter.test.ts
npm test -- docs-manager/emitter.test.ts

# From cic-ingestion/src/ingestion/jobs/docsManagerIntegration.test.ts
npm test -- docsManagerIntegration.test.ts
```

Both test suites verify:
- ✓ JSONL append + validation
- ✓ Ingestion replay safety (offset tracking)
- ✓ Drift accumulation thresholds
- ✓ Metrics export shape
- ✓ E2E emit → ingest → metrics flow

## Next Steps

1. **Mount in UI** — Add DocsManagerPanel to main dashboard layout
2. **Customize Styles** — Adapt colors/spacing to design system
3. **Add Webhooks** — Emit Slack/email alerts on drift > threshold
4. **Calibrate SLAs** — Map drift penalties to incident severity + escalation
