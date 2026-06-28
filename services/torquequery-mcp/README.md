# TorqueQuery MCP Server

MCP (Model Context Protocol) server that wraps the CIC Substrate Service. Exposes chunk storage, hybrid search, and context packing operations as MCP tools for AI agent orchestration.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ AI Agent (Claude via MCP)                                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ MCP Protocol (JSON-RPC over stdio)
                         │
┌────────────────────────▼────────────────────────────────────────┐
│ TorqueQuery MCP Server (torquequery-mcp)                        │
│  - store_chunk                                                   │
│  - search_chunks (hybrid: BM25 + Vector + RRF)                  │
│  - get_task_context (token-aware packing)                       │
│  - list_chunks, get_chunk, update_chunk, delete_chunk           │
│  - get_stats                                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP (JSON)
                         │
┌────────────────────────▼────────────────────────────────────────┐
│ CIC Substrate Service (c:\dev\services\cic-substrate)           │
│  - Express.js HTTP API                                           │
│  - PostgreSQL + pgvector backend                                 │
│  - Governance enforcement                                        │
│  - Ingestion pipeline (Capture → Normalize → Classify → Enrich) │
│  - Hybrid search (BM25 + IVFFLAT vectors + RRF fusion)          │
└─────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
cd c:\dev\rewrite-mcp\services\torquequery-mcp
npm install
npm run build
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### With Custom Substrate URL
```bash
SUBSTRATE_URL=http://substrate-service:3000 npm start
```

## Testing

### Run all tests
```bash
npm test
```

### Run with coverage
```bash
npm run test:coverage
```

### Watch mode
```bash
npm run test:watch
```

## Test Coverage

The integration test suite (`src/integration.test.ts`) validates **every rule** in the substrate service:

### GOVERNANCE RULES (8 test suites, 30+ tests)
- **Type Validation**: SYSTEM, STATE, LIVING, SCRATCH types enforced
- **Namespace & Provenance**: Required fields validated
- **TTL Enforcement**: SYSTEM/LIVING → null, STATE → 30d default, SCRATCH → 7d default
- **Importance Clamping**: Values clamped to [0.0, 1.0]
- **Body Size Limits**: Max 100KB enforced

### INGESTION PIPELINE (2 test suites, 8+ tests)
- **Normalization**: Type uppercase, title/body trimmed
- **Classification**: Type uppercase conversion
- **Enrichment**: Auto-tag "error" chunks, preserve existing tags
- **Persistence**: Versioning, ID generation, embedding storage

### HYBRID RETRIEVAL (3 test suites, 6+ tests)
- **Text Search**: BM25 ranking
- **Vector Search**: Cosine similarity with 1536-dim embeddings
- **RRF Fusion**: Reciprocal Rank Fusion scoring (1 / (60 + rank))
- **Result Ordering**: Descending fused score

### CONTEXT PACKING (4 test suites, 6+ tests)
- **Token Budget**: Greedy packing within max_context_tokens
- **Type Preference**: Respects preferred_types order or defaults (SYSTEM > LIVING > STATE > SCRATCH)
- **Default Ordering**: Applies default type preferences
- **Budget Constraints**: Stops adding chunks when budget exceeded

### CRUD OPERATIONS (5 test suites, 5+ tests)
- **Create**: Store chunks with governance validation
- **Read**: Retrieve by ID, list by namespace
- **Update**: Modify with re-validation and version increment
- **Delete**: Soft-delete with is-alive filtering
- **Stats**: Service-wide statistics by type/namespace

## MCP Tools Reference

### `store_chunk`
Store a new chunk with automatic governance validation.

**Input:**
```json
{
  "namespace": "project/context",
  "type": "LIVING",
  "title": "Architecture Overview",
  "body": "The system uses microservices...",
  "tags": ["architecture", "design"],
  "importance": 0.9,
  "provenance": {
    "source": "design-doc.md",
    "author": "alice@example.com"
  },
  "embedding": [0.0123, -0.0045, ...] // 1536-dim vector, optional
}
```

**Response:**
```json
{
  "id": "uuid-here",
  "namespace": "project/context",
  "type": "LIVING",
  "title": "Architecture Overview",
  "body": "The system uses microservices...",
  "tags": ["architecture", "design"],
  "importance": 0.9,
  "ttl_days": null,
  "version": 1,
  "created_at": "2026-06-24T...",
  "updated_at": "2026-06-24T...",
  "has_embedding": true
}
```

### `search_chunks`
Execute hybrid search across chunks (text + vector).

**Input:**
```json
{
  "namespace": "project/context",
  "query": "microservices architecture",
  "embedding": [0.0123, -0.0045, ...], // optional
  "max_results": 10
}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "namespace": "project/context",
    "type": "LIVING",
    "title": "...",
    "body": "...",
    "bm25_score": 1.25,
    "vector_score": 0.85,
    "fused_score": 0.92
  }
]
```

### `get_task_context`
Retrieve optimized context for a task, packed within token budget.

**Input:**
```json
{
  "namespace": "project/context",
  "task": "Refactor the ingestion pipeline",
  "embedding": [...], // optional
  "max_context_tokens": 4000,
  "preferred_types": ["SYSTEM", "LIVING", "STATE"]
}
```

**Response:**
```json
{
  "chunks": [
    { "id": "...", "type": "SYSTEM", "title": "...", "body": "..." },
    { "id": "...", "type": "LIVING", "title": "...", "body": "..." }
  ],
  "token_count": 1847
}
```

### Other Tools
- `get_chunk(id)` - Retrieve by ID
- `list_chunks(namespace, limit, offset)` - List with pagination
- `update_chunk(id, {...})` - Update with re-validation
- `delete_chunk(id)` - Soft-delete
- `get_stats()` - Service statistics

## Governance Rules

All rules are **enforced at the substrate layer** and validated before persistence:

### Type System
| Type | TTL | Use Case |
|------|-----|----------|
| `SYSTEM` | ∞ | Architecture decisions, immutable rules, organizational knowledge |
| `LIVING` | ∞ | Evolving docs, design patterns, learning materials |
| `STATE` | 30 days | Snapshots of transient state, deployment status |
| `SCRATCH` | 7 days | Temporary notes, WIP analysis, exploratory work |

### Constraints
- **Namespace**: Required, no null/empty
- **Provenance**: Required with `source` field
- **Importance**: Clamped to [0.0, 1.0], defaults to 0.5
- **Body**: Max 100KB
- **Tags**: Auto-enriched (e.g., "error" tag auto-added if body contains "error")

## Ingestion Pipeline

Every chunk flows through:
1. **Capture** - Input validation & extraction
2. **Normalize** - Title/body trimming, field standardization
3. **Classify** - Type uppercase conversion
4. **Enrich** - Tag inference (error detection, semantic tagging)
5. **Persist** - Storage with versioning & embedding indexing

## Hybrid Retrieval

Search fuses three signals:
- **BM25** - Full-text ranking (title weight A, body weight B)
- **Vector** - Cosine similarity on 1536-dim embeddings
- **RRF** - Reciprocal Rank Fusion: `1/(60+rank)` per signal

Results sorted by fused score descending.

## Context Packing

Greedy algorithm packs chunks respecting:
1. **Token budget** - Est. tokens = chars / 4
2. **Type preference** - SYSTEM > LIVING > STATE > SCRATCH (or custom)
3. **Relevance** - Fused search score

Stops when next chunk would exceed budget.

## Deployment

### Docker
```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .
RUN npm ci --only=production
RUN npm run build

ENV SUBSTRATE_URL=http://cic-substrate:3000
CMD ["npm", "start"]
```

### Kubernetes
```yaml
apiVersion: v1
kind: Service
metadata:
  name: torquequery-mcp
spec:
  selector:
    app: torquequery-mcp
  ports:
    - protocol: TCP
      port: 5000
      targetPort: 5000

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: torquequery-mcp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: torquequery-mcp
  template:
    metadata:
      labels:
        app: torquequery-mcp
    spec:
      containers:
        - name: mcp
          image: cic-registry/torquequery-mcp:1.0.0
          env:
            - name: SUBSTRATE_URL
              value: "http://cic-substrate:3000"
          livenessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 10
            periodSeconds: 30
```

## Related Services

- **CIC Substrate Service** (`c:\dev\services\cic-substrate`) - HTTP API layer
- **CIC Ingestion Service** - Event streaming & agent orchestration
- **Operator Console** - Dashboard & monitoring

## References

- [MCP Specification](https://modelcontextprotocol.io/)
- [PostgreSQL pgvector](https://github.com/pgvector/pgvector)
- [Reciprocal Rank Fusion](https://en.wikipedia.org/wiki/Reciprocal_rank_fusion)
