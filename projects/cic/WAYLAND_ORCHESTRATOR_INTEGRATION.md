# Wayland → Orchestrator Integration

Integration of Wayland workflows with CIC Orchestrator service for autonomous reasoning tasks.

## Architecture

```
Wayland Workflow (W1-W3)
    ↓
Wayland Adapter Registry
    ↓
HTTP Adapter (real implementation)
    ↓
Orchestrator Service (POST /reason)
    ↓
Orchestrator Endpoint Handler
    ↓
Reasoning Logic + Ingest Service
```

## Components

### 1. Workflow Runner (`src/wayland/workflow.ts`)
- `WorkflowDef`: Defines workflow steps and schedule (cron)
- `WorkflowStep`: Individual task with adapter, payload, retries
- `WorkflowRunner`: Executes steps sequentially with error handling + retry logic
- `WorkflowContext`: Shared state across workflow execution

**Workflows Registered:**
- `daily-ingest-reasoning` — Daily ingestion + Orchestrator reasoning loop

### 2. HTTP Adapter (updated `src/wayland/wayland-adapter-registry.ts`)
- Real HTTP client implementation (not stub)
- Fetch-based calls to Orchestrator endpoint
- Timeout handling + error propagation
- Structured logging

### 3. Orchestrator Endpoint (`src/orchestrator/wayland-endpoint.ts`)
- HTTP endpoint `POST /reason` for Wayland requests
- Routing to reasoning handlers
- `ingest-reasoning` action: Calls ingest service → applies reasoning
- Structured response format

### 4. Orchestrator Service (`src/orchestrator/index.ts`)
- Express HTTP server on port 7001
- Wayland endpoint registration
- Health check `GET /reason/health`
- Graceful shutdown

### 5. Docker Compose (`cic-ingestion/docker-compose.yml`)
- New `orchestrator` service
- Port 7001 exposed
- Depends on memory-store + cic-wil
- Health checks enabled

### 6. Security Policy (updated `src/wayland/wayland-security-policy.ts`)
- HTTP adapter allows POST to Orchestrator
- Allowed hosts: `localhost:7001`, `127.0.0.1:7001`
- Max duration: 30s
- Write permission enabled

## Code Quality & Security Hardening (2026-06-11)

**Applied fixes:**

- ✅ HTTP adapter: Timeout cleanup guaranteed via try/finally (prevents timeout leak on network errors)
- ✅ Security policy: Path boundary checking fixed (`/work` no longer matches `/workspace`)
- ✅ Security policy: HTTP method check optimized (Set.has() instead of includes(), O(1) lookup)
- ✅ Security policy: Empty allowedCommands handled explicitly (deny-all semantics documented)

**Commit:** `52fa5f3` in rewrite-mcp — no behavioral changes, improves robustness & security.

## Usage

### 1. Start Services
```bash
docker compose -f cic-ingestion/docker-compose.yml up
```

Services running:
- CIC WIL: `http://localhost:8080`
- Orchestrator: `http://localhost:7001`
- Memory Store: `localhost:5432`

### 2. Run Daily Ingest Reasoning Workflow
```typescript
import { runDailyIngestReasoning } from './src/wayland/workflow-integration';

const logger = {
  info: (evt: string, data?: any) => console.log(evt, data),
  warn: (evt: string, data?: any) => console.warn(evt, data),
  error: (evt: string, data?: any) => console.error(evt, data),
};

const results = await runDailyIngestReasoning(logger);
console.log(results); // Step results map
```

### 3. Call Orchestrator Directly
```typescript
import { callOrchestratorDirect } from './src/wayland/workflow-integration';

const result = await callOrchestratorDirect('ingest-reasoning', {
  source: 'manual-test',
});
console.log(result);
```

### 4. Async Trigger (Fire-and-Forget)
```typescript
await triggerWorkflowAsync(logger, 'daily-ingest-reasoning');
```

## API Endpoints

### POST /reason
Invoke reasoning with Wayland metadata.

**Request:**
```json
{
  "action": "ingest-reasoning",
  "timestamp": "2026-06-10T12:00:00Z",
  "metadata": {
    "source": "wayland-workflow",
    "workflowId": "daily-ingest-reasoning"
  }
}
```

**Response:**
```json
{
  "status": "ok",
  "requestId": "wayland-...",
  "action": "ingest-reasoning",
  "result": {
    "summary": "Daily ingest cycle complete",
    "itemsAnalyzed": 0,
    "confidence": 0.95,
    "recommendations": [],
    "metadata": { ... }
  },
  "processingTimeMs": 1234
}
```

### GET /reason/health
Health check for Orchestrator.

**Response:**
```json
{
  "status": "ok",
  "service": "orchestrator-wayland-endpoint",
  "timestamp": "2026-06-10T12:00:00Z"
}
```

### GET /health
Overall Orchestrator health.

## Next Steps

1. **Implement Ingest Service Call** — `handleIngestReasoning` currently stubbed
2. **Add Reasoning Logic** — LLM or rule-based analyzer
3. **Schedule Workflows** — Cron scheduler for daily execution
4. **Add More Actions** — Extend `/reason` with new reasoning types
5. **Integration Tests** — Test end-to-end workflow execution
6. **Metrics** — Track workflow duration, success rate, error patterns

## Testing

### Test HTTP Adapter
```bash
curl -X POST http://localhost:7001/reason \
  -H "content-type: application/json" \
  -d '{
    "action": "ingest-reasoning",
    "timestamp": "2026-06-10T12:00:00Z",
    "metadata": {"source": "curl"}
  }'
```

### Test Workflow Runner
```bash
npm test -- src/wayland/workflow.test.ts
```

## Logs

Workflow execution logs:
```
[INFO] workflow.start { workflowId: 'daily-ingest-reasoning', steps: 1 }
[INFO] workflow.step.start { workflowId: 'daily-ingest-reasoning', stepId: 'call-orchestrator', attempt: 1 }
[INFO] http.execute.start { method: 'POST', url: 'http://localhost:7001/reason' }
[INFO] http.execute.success { method: 'POST', url: 'http://localhost:7001/reason', status: 200 }
[INFO] workflow.step.success { workflowId: 'daily-ingest-reasoning', stepId: 'call-orchestrator' }
[INFO] workflow.complete { workflowId: 'daily-ingest-reasoning', durationMs: 1234 }
```

## Troubleshooting

**Error: "HTTP adapter not found"**
- Ensure HTTP adapter is registered in `createDefaultRegistry()`

**Error: "Tool not allowed by security policy"**
- Check `allowedHosts` in security policy includes Orchestrator endpoint

**Error: "Orchestrator timeout"**
- Increase `timeoutMs` in workflow step or Orchestrator timeout
- Check Orchestrator service is running: `curl http://localhost:7001/health`

**Error: "Orchestrator connection refused"**
- Ensure Orchestrator service started: `docker compose ps`
- Verify port 7001 is exposed and accessible

## References

- Wayland Adapter Registry: `src/wayland/wayland-adapter-registry.ts`
- Wayland Security Policy: `src/wayland/wayland-security-policy.ts`
- Workflow Definitions: `src/wayland/workflow.ts`
- Integration Examples: `src/wayland/workflow-integration.ts`
- Orchestrator Endpoint: `src/orchestrator/wayland-endpoint.ts`
- Orchestrator Service: `src/orchestrator/index.ts`
- Docker Compose: `cic-ingestion/docker-compose.yml`
