<!-- file: docs/api.md | created: 2026-05-03 | version: 1.0.0 -->

# API Reference

All endpoints are served by the **Castironforge MCP backend** at `http://localhost:3000` (configurable).  
All responses are JSON. All POST bodies are `application/json`.

---

## Health Endpoints

### `GET /api/health`

Liveness probe. Fast — no DB or filesystem I/O.

**Response:**
```json
{ "ok": true, "ts": 1777864315177 }
```

| Field | Type | Notes |
|-------|------|-------|
| `ok` | boolean | `true` if server is alive |
| `ts` | number | Unix timestamp ms |

---

### `GET /api/health/startup`

Reads `CIC_Processed/_status/startup.json`. Returns full environment status.

**200 — Ready:**
```json
{
  "_schema": "cic-startup-v1.0.0",
  "generated_at": "2026-05-03T09:00:00.000Z",
  "node_version": "v20.x.x",
  "platform": "win32",
  "cic_root": "G:\\My Drive\\Cast Iron Charlie...",
  "db_path": "C:\\Users\\soren\\temp\\cic-ingestion\\data\\cic.db",
  "folders": { "checked": 8, "missing": 0, "created": 0, "ok": true },
  "status": "ready"
}
```

**503 — Degraded:** `status` is `"degraded"` (missing folders).  
**404 — Not initialized:** `startup.json` does not exist. Run `npm run maintain`.

---

## Queue Endpoints

### `GET /api/queue/size`

Returns total count and per-status breakdown.

**Response:**
```json
{ "total": 12, "byStatus": { "pending": 8, "running": 1, "completed": 3 } }
```

---

### `GET /api/queue/snapshot`

Returns a snapshot of recent queue items (up to 50).

**Response:**
```json
[
  { "id": "abc123", "status": "pending", "type": "harvest", "created_at": "2026-05-03T09:00:00Z" }
]
```

---

### `GET /api/queue/peek`

Returns the next pending item without dequeueing it.

**Response:** Single queue item object, or `{ "item": null }` if empty.

---

### `POST /api/queue/enqueue`

Add a job to the queue.

**Body:**
```json
{ "type": "harvest", "payload": { "path": "..." } }
```

---

### `POST /api/queue/dequeue`

Claim the next pending item and set it to `running`.

**Response:** The claimed item object.

---

### `POST /api/queue/drain`

Process all pending items. Triggers the full sweep-index-corpus sequence.

**Response:**
```json
{ "drained": 8, "errors": 0 }
```

---

### `POST /api/queue/purge`

⚠ **Destructive.** Removes all queue items regardless of status.

**Response:**
```json
{ "purged": 12 }
```

---

## Sweeper Endpoints

### `GET /api/sweeper/report`

Returns the most recent sweeper run report.

**Response:**
```json
{
  "filesFound": 14,
  "filesMoved": 14,
  "errors": [],
  "timestamp": "2026-05-03T09:01:30.000Z",
  "status": "ok"
}
```

---

### `POST /api/sweeper/enumerate`

Scan inbox directories and list discovered files. Does not move anything.

**Response:**
```json
{ "found": 14, "files": ["Daily Intake/research-note.pdf", ...] }
```

---

### `POST /api/sweeper/classify`

Classify discovered files by category (documents, photos, notes, data, other). Does not move anything.

**Response:**
```json
{ "classified": 14, "byCategory": { "documents": 9, "photos": 3, "notes": 2 } }
```

---

### `POST /api/sweeper/pipeline`

Run the full sweeper pipeline: enumerate → classify → move → update queue.

**Response:**
```json
{ "filesFound": 14, "filesMoved": 14, "errors": [], "status": "ok" }
```

---

## System Endpoints

### `GET /api/system/metrics`

Returns aggregate run metrics.

**Response:**
```json
{
  "totalRuns": 42,
  "totalSuccess": 40,
  "totalFailure": 2,
  "lastRunAt": "2026-05-03T09:00:00.000Z"
}
```

---

### `GET /api/system/breaker`

Returns circuit breaker state.

**Response:**
```json
{
  "tripped": false,
  "reason": null,
  "lastErrorAt": null,
  "errorWindow": [],
  "windowMs": 300000,
  "threshold": 10,
  "cooldownMs": 300000
}
```

| Field | Notes |
|-------|-------|
| `tripped` | `true` = breaker open, pipeline halted |
| `threshold` | errors in window before trip |
| `windowMs` | sliding window size (ms) |
| `cooldownMs` | auto-reset delay after trip |

---

### `POST /api/system/breaker/reset`

Manually close the circuit breaker.

**Response:** `{ "ok": true }`

---

### `POST /api/system/breaker/trip`

Manually open (trip) the circuit breaker.

**Body:** `{ "reason": "manual override" }` (optional)

**Response:** `{ "ok": true }`

---

### `GET /api/system/logs`

Returns recent system log lines (last 200).

**Response:**
```json
[
  "[2026-05-03T09:00:01Z] [info] [harvester] Scan complete { found: 14 }",
  "[2026-05-03T09:00:02Z] [info] [sweeper] Moved 14 files"
]
```

---

### `GET /api/system/inspect`

Returns server metadata and current state.

**Response:**
```json
{
  "name": "Cast Iron Charlie MCP",
  "version": "0.2.0",
  "env": "development",
  "state": []
}
```

---

## Health Widget

Drop the widget badge into any HTML page:

```html
<!-- Mount point -->
<div id="cic-health-widget"
     data-base-url="http://localhost:3000"
     data-interval="15">
</div>

<!-- Script -->
<script src="dashboard/cic-health-widget.js"></script>
```

The badge auto-refreshes every `data-interval` seconds and fires a `cic:health` custom DOM event on state change:

```js
document.getElementById('cic-health-widget')
  .addEventListener('cic:health', function(e) {
    console.log(e.detail.state); // 'green' | 'yellow' | 'red'
  });
```

**State logic:**

| State | Condition |
|-------|-----------|
| 🟢 green | API ok + startup ready + breaker closed |
| 🟡 yellow | API ok but startup not ready or breaker unknown |
| 🔴 red | API unreachable or breaker tripped |
