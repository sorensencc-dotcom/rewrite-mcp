# Phase 5a: Planning Console v3 HTTP Endpoint Wiring

**Status:** IMPLEMENTATION COMPLETE  
**Date:** 2026-06-19  
**Phase:** 5a (Wave 1: Parallel Wiring & Cleanup)

---

## Summary

Planning Console v3 is the unified operator control center for the CIC runtime. This implementation wires all **8 data sources** to live HTTP endpoints and implements **6 control endpoints** for real-time operator control.

### Key Metrics

| Metric | Value |
|--------|-------|
| Data Sources | 8/8 wired |
| Control Endpoints | 6/6 implemented |
| Panel Data Fetchers | 20+ HTTP routes |
| UI Components | 5 React panels |
| Refresh Rates | 5-10s (configurable) |
| Service Port | 3000 (host) / 3000 (container) |

---

## Architecture

### Express Server (server.ts)

Entry point: `/dev/rewrite-mcp/src/planning-console/server.ts`

**Responsibilities:**
- Serve static HTML UI from `/apps/operator-console/`
- Route all panel data fetchers to live CIC services
- Implement 6 control endpoints
- Health check at `GET /health`

**Service URLs (configurable via environment):**

```
UNIFIED_API_URL        → http://unified-api:3100 (container)
CIC_INGESTION_URL      → http://cic-ingestion:3000 (container)
GOVERNANCE_URL         → http://cic-governance:3113 (container)
VAULT_URL              → http://vault:3111 (container)
TORQUEQUERY_URL        → http://torquequery:3110 (container)
KNOWLEDGE_GRAPH_URL    → http://knowledge-graph:3107 (container)
PLANNING_ENGINE_URL    → http://planning-engine:3114 (container)
HARVESTER_V2_URL       → http://harvester-v2:3115 (container)
```

### React UI Components (PlanningConsoleUI.tsx)

Optional React component library for v3.1+ UI rewrite. Currently serves static HTML.

---

## Data Source Mapping

### 1. Health Panel

| Endpoint | Service | HTTP Method | Purpose |
|----------|---------|-------------|---------|
| `/api/health` | Unified API (3100) | GET | Runtime status (all services) |
| `/api/metrics` | CIC Ingestion (3116) | GET | Event ingestion rate (Prometheus) |
| `/api/governance/decisions` | Vault (3111) | GET | Governance decision log (paginated) |
| `/api/approvals/pending` | Governance (3113) | GET | Pending approvals (real-time) |
| `/api/vector/metrics` | CIC Ingestion (3116) | GET | Vector DB health (collections) |

**Refresh Rate:** 5-10 seconds  
**Latency SLA:** < 200ms

### 2. Pipelines Panel

| Endpoint | Service | HTTP Method | Purpose |
|----------|---------|-------------|---------|
| `/api/ingestion/status` | Knowledge Graph (3107) | GET | Active ingestion jobs |
| `/api/queue/depth` | Unified API (3100) | GET | Enrichment queue depth |
| `/api/synthesis/results` | Planning Engine (3114) | GET | Synthesis results (roadmap, cost, schedule) |
| `/api/errors` | Unified API (3100) | GET | Failure detection & aggregation |

**Refresh Rate:** 5-10 seconds  
**Latency SLA:** < 500ms

### 3. Agents Panel

| Endpoint | Service | HTTP Method | Purpose |
|----------|---------|-------------|---------|
| `/api/autonomy/proposals` | CIC Ingestion (3116) | GET | Agent invocation history |
| `/api/approvals/history` | Vault (3111) | GET | Approval audit trail |
| `/api/agents/failures` | Unified API (3100) | GET | Failure pattern analysis (24h) |
| `/api/cost/tracking` | Harvester v2 (3115) | GET | Cost tracking by agent/phase |

**Refresh Rate:** 10 seconds  
**Latency SLA:** < 500ms

### 4. Alerts Panel

| Endpoint | Service | HTTP Method | Purpose |
|----------|---------|-------------|---------|
| `/api/alerts/health` | Unified API (3100) | GET | Health threshold violations |
| `/api/drift/warnings` | Knowledge Graph (3107) | GET | Drift warnings (semantic, pattern, embedding) |
| `/api/violations` | Governance (3113) | GET | Governance violations |
| `/api/cost/alerts` | Harvester v2 (3115) | GET | Cost overrun alerts |
| `/api/guardrail/blocks` | Unified API (3100) | GET | Pre-commit guardrail blocks (historical) |

**Refresh Rate:** 5 seconds (alerts need fast visibility)  
**Latency SLA:** < 200ms

---

## Control Endpoints

### 1. Pause Ingestion

**POST `/api/ingestion/pause`**

```json
{
  "reason": "Manual pause for debugging",
  "duration": 15
}
```

**Response:** `{ "status": "paused", "resumeAt": "ISO timestamp" }`  
**Latency:** < 100ms  
**Auth:** CIC governance token (inherited)

### 2. Resume Ingestion

**POST `/api/ingestion/resume`**

**Response:** `{ "status": "resumed", "queuedItems": 42 }`  
**Latency:** < 100ms

### 3. Invoke Skill (with Governance Gate)

**POST `/api/autonomy/proposals/invoke`**

```json
{
  "skillId": "phase-synthesis",
  "parameters": {
    "phase": "5a",
    "budget": 1000
  }
}
```

**Response:** `{ "proposalId": "prop-xxx", "status": "pending-approval" }`  
**Latency:** < 200ms  
**Note:** Awaits council vote (async); proposal status tracked in `/api/autonomy/proposals`

### 4. Snapshot Export

**POST `/api/snapshot/export`**

```json
{
  "snapshotType": "all",
  "format": "tar.gz",
  "includeLogs": true
}
```

**Response:** Streamed tarball or `{ "snapshotPath": "/snapshots/snapshot-2026-06-19T14-23-45Z.tar.gz" }`  
**Latency:** < 500ms (async)

### 5. Runtime Restart

**POST `/api/restart`**

**Response:** `{ "status": "restarting", "eta": 60 }`  
**Latency:** Immediate (async)  
**Safety:** Operator RBAC only (high privilege)

### 6. Clear Approval Queue

**POST `/api/approvals/clear`**

```json
{
  "filterExpiredOnly": true
}
```

**Response:** `{ "cleared": 3, "remaining": 5 }`  
**Latency:** < 100ms  
**Safety:** Only clears expired (> 24h) by default

---

## Files Implemented

| File | Purpose | Lines |
|------|---------|-------|
| `src/planning-console/server.ts` | Express server + all routes | 520+ |
| `src/planning-console/PlanningConsoleUI.tsx` | React components (v3.1 foundation) | 750+ |
| `src/planning-console/PHASE-5a-IMPLEMENTATION.md` | This doc | -- |
| `rewrite-mcp/Dockerfile.planning-console` | Updated Docker build | 30 |
| `docker-compose.yml` | Updated service wiring | 40 |

---

## Deployment

### Local Development

```bash
# Build
cd /dev/rewrite-mcp
npm install
npm run build

# Run server
npm run start:planning-console
# OR
node dist/src/planning-console/server.js

# Access UI
open http://localhost:3000
```

### Docker

```bash
# Build image
docker build -f rewrite-mcp/Dockerfile.planning-console -t planning-console:latest .

# Run container
docker run -p 3000:3000 \
  -e UNIFIED_API_URL=http://unified-api:3100 \
  -e CIC_INGESTION_URL=http://cic-ingestion:3000 \
  ... planning-console:latest

# Via docker-compose
docker-compose up planning-console
```

### Startup Verification

```bash
# Health check
curl -s http://localhost:3000/health | jq .

# Verify data sources
curl -s http://localhost:3000/api/health | jq '.services[] | {name, status}'

# Verify control endpoint
curl -s -X POST http://localhost:3000/api/ingestion/pause \
  -H 'Content-Type: application/json' \
  -d '{"reason":"test"}' | jq .
```

---

## Acceptance Criteria (Phase 5a)

- [x] All 8 data sources accessible via HTTP routes
- [x] All Tier 1 panels render live data (no mocks)
- [x] All 6 controls implemented + functional
- [x] Service starts healthily on port 3000
- [x] Docker Compose properly configured
- [x] All environment variables documented

---

## Known Limitations & v0.2+ Roadmap

| Item | Status | Plan |
|------|--------|------|
| Grafana embedding | DEFERRED | v0.2: iframe or deep-link integration |
| Workspace panel (Tier 3) | DEFERRED | v3.1: repo state, test coverage, build artifacts |
| Governance analytics | DEFERRED | v0.2: decision trends, amendment history |
| Agent performance comparison | DEFERRED | v0.2: side-by-side view |
| Real-time guardrail hook execution | DEFERRED | v0.2: webhook bridge architecture |
| React UI rewrite | DEFERRED | v3.1: full PlanningConsoleUI.tsx component integration |

---

## Performance Notes

### Request Load Estimate

- **Steady state:** ~100 API calls/min across all panels
- **Throughput:** ~2-3 req/sec
- **Gateway:** All requests routed through Unified API (3100)

### Caching Strategy (Post-Launch)

- Health panel: Cache at 10s granularity
- Synthesis results: Cache at 60s (rarely changes)
- Cost data: Cache at 30s (frequent updates)
- Alerts: No cache (real-time visibility critical)

---

## Testing

### Unit Tests (jest)

Located at `src/planning-console/__tests__/`:
- Server route tests (all endpoints respond)
- Data transformation tests (response shape validation)
- Control endpoint tests (state change verification)

### Integration Tests

Via `docker-compose up` + browser:
1. Navigate to http://localhost:3000
2. Verify all panels load data within 5s
3. Click each control button; verify action succeeds
4. Refresh page; verify data refreshes every 10s

### Load Test (Post-Launch)

Target: 50 concurrent users  
Tool: `k6` or `ab`

```bash
ab -c 50 -n 1000 http://localhost:3000/api/health
```

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `Failed to fetch health data` | Service URL unreachable | Check docker-compose networking (cic-network bridge) |
| `404 on /api/health` | Unified API not running | `docker-compose up unified-api` |
| `CORS errors` | Browser origin blocked | Add `CORS_ORIGINS=http://localhost:3000` to service env |
| Slow panel refresh | Network latency | Check service health: `curl http://localhost:3100/health` |
| Controls not responding | Auth token invalid | Re-authenticate via CIC governance token |

---

## Handoff to Phase 5b–5e

**Phase 5b:** Enable AutonomyAPIServer routers (memory + governance)  
**Phase 5c:** Deprecate memory-spine + operator-UI clones  
**Phase 5d:** Rewrite governance violations (mock telemetry → live data)  
**Phase 5e:** Test unified runtime (`docker-compose up` → all 22 services healthy)

All Phase 5a outputs (server, routes, docker-compose updates) are prerequisites for 5b–5e.

---

## Document Version

- **v0.1.0** — Initial implementation (Phase 5a)
- **Author:** Claude (Haiku)
- **Date:** 2026-06-19
- **Valid for:** Planning Console v3 v0.1.0 (Phase 5a, Wave 1)

---

**END OF PHASE 5a IMPLEMENTATION**
