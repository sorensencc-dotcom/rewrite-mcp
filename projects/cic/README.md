# CIC/CRG/Ruflo Integration Layer

Unified context API for integrating code-review-graph (CRG), Cast Iron Charlie (CIC), and Ruflo multi-agent orchestration.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Context API Contract                      │
│          (projects/cic/context-api/CONTRACT.md)             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Context Service (HTTP)                      │
│         GET /context/:id                                     │
│         GET /context/:id/slices/:slice_id                   │
│         POST /context/query                                  │
│         GET /health                                          │
└─────────────────────────────────────────────────────────────┘
         ↙                          ↙
┌──────────────────────┐  ┌──────────────────────┐
│    CRG Adapter       │  │   Ruflo Orchestration│
│ (translates CRG      │  │  (multi-agent flows) │
│  to Context format)  │  │                      │
└──────────────────────┘  └──────────────────────┘
         ↓                          ↓
┌──────────────────────┐  ┌──────────────────────┐
│   CRG Backend        │  │  Agent Clients       │
│   (code-review-graph)│  │  (Claude, etc.)      │
└──────────────────────┘  └──────────────────────┘
```

---

## Directory Structure

```
projects/cic/
├── AGENTS.md                          Zone governance
├── README.md                          This file
├── context-api/
│   └── CONTRACT.md                    API specification
├── context-service/
│   ├── ContextService.ts              Core service logic
│   ├── ContextServer.ts               Express HTTP server
│   └── index.ts                       Entrypoint
├── crg-adapter/
│   └── CRGAdapter.ts                  CRG ↔ Context translation
├── ruflo-orchestration/
│   ├── FlowRegistry.ts                Flow template registry
│   └── FlowOrchestrator.ts            Flow executor
├── observability/
│   ├── TraceMiddleware.ts             Distributed tracing
│   └── MetricsMiddleware.ts           HTTP metrics
├── config/
│   └── ContextConfig.ts               Configuration schema + loader
└── tests/                             Test suite (coming)
```

---

## Core Components

### 1. Context API Contract

**File:** `context-api/CONTRACT.md`

Defines the unified data model and HTTP interface:

- **Context** — minimal, lazy-loaded code/narrative representation
- **ContextFile** — file reference with slices and relationships
- **ContextSlice** — semantic unit (function, class, section)

Key endpoints:
- `GET /context/:id` — retrieve context metadata (minimal)
- `GET /context/:id/slices/:slice_id` — load full slice content (lazy)
- `POST /context/query` — semantic search

### 2. Context Service

**Files:** `context-service/ContextService.ts`, `context-service/ContextServer.ts`

HTTP service implementing the contract:

- Coordinates requests to CRG and CIC backends
- Manages caching of contexts and slices
- Propagates trace IDs for distributed tracing
- Publishes metrics (duration, errors, cache hits)

Configuration via environment variables:
- `CONTEXT_API_PORT` (default: 8080)
- `CONTEXT_API_HOST` (default: 0.0.0.0)
- `CRG_BASE_URL` — CRG backend URL
- `CIC_BASE_URL` — CIC backend URL

### 3. CRG Adapter

**File:** `crg-adapter/CRGAdapter.ts`

Translates code-review-graph structures into Context API format:

- Converts CRG files → ContextFiles
- Converts functions/classes → ContextSlices
- Maps call graph → slice relationships
- Manages FQN (fully qualified name) resolution

### 4. Ruflo Orchestration

**Files:** `ruflo-orchestration/FlowRegistry.ts`, `ruflo-orchestration/FlowOrchestrator.ts`

Multi-agent flow execution engine:

- **FlowRegistry** — manages flow templates and execution state
- **FlowOrchestrator** — executes flows with agent coordination

Built-in flows:
- `flow-context-enrichment-v1` — enrich code context with narratives
- `flow-idea-classification-v1` — classify and score ideas

### 5. Observability

**Files:** `observability/TraceMiddleware.ts`, `observability/MetricsMiddleware.ts`

Tracing and metrics for distributed debugging:

- **TraceMiddleware** — logs request/response spans with trace IDs
- **MetricsMiddleware** — tracks request duration, error rates, cache hits

---

## Usage Examples

### 1. Start the Context Service

```bash
cd projects/cic
npm install
CONTEXT_API_PORT=8080 CRG_BASE_URL=http://localhost:8081 npm start
```

### 2. Retrieve a Context

```bash
curl -X GET http://localhost:8080/context/ctx-abc123 \
  -H "X-Trace-ID: trace-xyz789"
```

Response:
```json
{
  "context": {
    "id": "ctx-abc123",
    "type": "code",
    "code": {
      "repo": "rewrite-mcp",
      "commit": "abc123def456",
      "files": [...]
    },
    "trace_id": "trace-xyz789"
  }
}
```

### 3. Load a Slice (Lazy Loading)

```bash
curl -X GET http://localhost:8080/context/ctx-abc123/slices/Foo.bar:24-67 \
  -H "X-Trace-ID: trace-xyz789"
```

### 4. Semantic Search

```bash
curl -X POST http://localhost:8080/context/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "idea capture and deduplication logic",
    "context_id": "ctx-abc123",
    "limit": 10
  }'
```

### 5. Execute a Flow

```bash
curl -X POST http://localhost:8080/flow/execute \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "flow-context-enrichment-v1",
    "input": {
      "context_id": "ctx-abc123"
    }
  }'
```

---

## Integration Points

### With CRG (code-review-graph)

- **Data Source:** CRG provides code structure snapshots (files, functions, calls)
- **Adapter:** CRGAdapter translates CRG structures to Context format
- **Lazy Loading:** ContextServer requests full slice content from CRG on-demand

### With CIC (Cast Iron Charlie)

- **Data Source:** CIC provides narrative/archival metadata
- **Adapter:** Similar translation layer (to be implemented)
- **Narrative Linking:** Flows can query narrative contexts and cross-link to code

### With Ruflo (Multi-Agent Orchestration)

- **Execution:** FlowOrchestrator runs multi-agent flows
- **Agents:** Code analyzers, narrative linkers, synthesizers, etc.
- **State Management:** FlowRegistry tracks template registrations and execution state

---

## Configuration

**File:** `config/ContextConfig.ts`

Load via environment variables or `loadConfig()`:

```typescript
import { loadConfig, validateConfig } from "./config/ContextConfig";

const config = loadConfig();
const errors = validateConfig(config);
if (errors.length > 0) {
  console.error("Config invalid:", errors);
  process.exit(1);
}
```

Key configuration groups:

- **Server:** port, host, apiVersion
- **Backends:** CRG and CIC URLs and timeouts
- **Cache:** TTL, max size, enabled
- **Ruflo:** max concurrency, default timeout
- **Observability:** tracing, metrics, health checks
- **Logging:** level, format

---

## Testing

(Coming soon)

Smoke tests to validate:
- Context service startup and health checks
- CRG adapter translation correctness
- Flow execution and orchestration
- End-to-end integration with CRG and CIC

---

## Development Roadmap

### Phase 1 (Current)
- ✅ Context API contract
- ✅ Context service skeleton
- ✅ CRG adapter skeleton
- ✅ Ruflo flow registry and orchestrator
- ✅ Configuration and entrypoints

### Phase 2
- [ ] Implement CRG backend connectivity
- [ ] Implement CIC backend connectivity
- [ ] Agent client implementations (code-analyzer, narrative-linker, etc.)
- [ ] Template interpolation in flows
- [ ] Condition evaluation in flows

### Phase 3
- [ ] Cache implementations (Redis, in-memory)
- [ ] Batch query support
- [ ] Streaming endpoints
- [ ] Advanced observability (Prometheus, OpenTelemetry)

### Phase 4
- [ ] Distributed execution (horizontal scaling)
- [ ] Flow versioning and promotion
- [ ] Dynamic flow registration via git
- [ ] Performance optimization and benchmarking

---

## Operator Console v2

**Location:** `projects/cic-operator-console/`

Production-grade observability and control dashboard for CIC:

| Page | Purpose |
| --- | --- |
| **Dashboard** | Service health + request metrics |
| **Flow Explorer** | Execute flows, view execution timeline + spans |
| **Agent Performance** | Latency histogram + success rate by agent |
| **Context Inspector** | Load and inspect code contexts (lazy-load slices) |
| **CRG Health** | Backend status + cache metrics |
| **Metrics** | Raw Prometheus-style metrics |
| **Settings** | Flow registry, agent registry, configuration |

### Quick Start

```bash
cd projects/cic-operator-console
npm install
npm run dev
# Visit http://localhost:5173
```

### Deployment

**Docker:**

```bash
docker build -t cic-operator-console:1.0.0 .
docker run -p 5173:5173 -e VITE_CIC_API_URL=http://cic-service:8080 cic-operator-console:1.0.0
```

**Kubernetes:**

```bash
kubectl apply -f kubernetes.yaml
kubectl port-forward svc/cic-operator-console 80:5173
```

See `projects/cic-operator-console/README.md` for full documentation.

---

## Zone Governance

See `AGENTS.md` for detailed zone ownership and cross-subsystem rules.

**Summary:**

- **context-api/** — Contract-first; changes require architectural review
- **context-service/** — Claude primary; test stubs via Copilot
- **crg-adapter/** — Coordinate with CRG maintainers
- **ruflo-orchestration/** — Claude primary; template generation via Copilot
- **observability/** — Always-on contract surface

---

## References

- [CIC System Architecture](../../docs/cic/CIC_SYSTEM.md)
- [CIC Master Roadmap](../../docs/cic/CIC_MASTER_ROADMAP.md)
- Context API Contract: `context-api/CONTRACT.md`
- Zone Governance: `AGENTS.md`
