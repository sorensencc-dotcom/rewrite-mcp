# CIC Memory Layer (Phases 23.2–23.5)

Durable, append-only event log with strict schema validation, atomic ACID writes, integrity checking, agent event harvesting, typed query API, and local filesystem archival.

## Overview

MemoryStore implements the **MLA Specification** (Memory Layer Architecture) — a deterministic, immutable event ledger for CIC's operational history.

### Features

✅ **Append-only writes** — No updates, no deletes (immutable log)  
✅ **Atomic ACID guarantees** — Process crash recovery via atomic rename + fsync  
✅ **Strict schema validation** — 6 event types, JSON Schema enforcement  
✅ **Integrity checking** — SHA-256 checksums on every event  
✅ **Corruption detection** — Quarantine corrupted events on read  
✅ **Query patterns** — Date range, type filtering, lazy loading  
✅ **Tiered retention** — Raw (90 days) → S3 archive → distilled summaries  

## Directory Structure

```
memory/
├── store/
│   ├── memory-store.ts              # Core append-only ledger
│   ├── memory-store.types.ts        # Event interfaces
│   └── memory-store.errors.ts       # Error types
├── validation/
│   ├── memory-validator.ts          # Schema validation
│   └── schemas/
│       ├── arps-delta.schema.json
│       ├── pipeline-run.schema.json
│       ├── agent-telemetry.schema.json
│       ├── governance-signal.schema.json
│       ├── apr-plan.schema.json
│       └── cro-run.schema.json
├── integrity/
│   └── memory-integrity.ts          # Checksums, corruption detection
├── harvester/                       # Phase 23.3 - Event harvesting
│   ├── memory-harvester.ts          # Collects events from agents
│   ├── memory-harvester.types.ts    # Harvester input types
│   └── HARVESTER.md                 # Harvester guide
├── index.ts                         # Exports
├── MemoryStore.test.ts              # Store tests
├── run-test.cjs                     # Compiled tests
└── README.md                        # This file
```

## Quick Start

### 1. Initialize MemoryStore

```typescript
import { MemoryStore } from "./memory";

const store = new MemoryStore("C:\\dev\\rewrite-mcp\\memory_store.json");
```

### 2. Append an Event

```typescript
const event = await store.append({
  timestamp: new Date().toISOString(),
  event_type: "PIPELINE_RUN",
  source_agent: "harvester",
  session_id: "session_20260607_001",
  correlation_id: "corr_abc123",
  payload: {
    pipeline_name: "ingestion",
    pipeline_id: "run_001",
    status: "success",
    start_time: "2026-06-07T14:00:00Z",
    end_time: "2026-06-07T14:30:00Z",
    duration_ms: 1800000,
    items_processed: 754,
    items_successful: 754,
    items_failed: 0,
    metrics: {
      throughput_items_per_second: 0.42,
      error_rate_percent: 0,
      resource_usage_mb: 512,
    },
  },
  retention_days: 90,
});

console.log(`Event appended: ${event.id}`);
console.log(`Checksum: ${event.checksum}`);
```

### 3. Flush to Disk

```typescript
// Automatic: when write buffer reaches 100 events
// Manual: force flush
await store.flush_sync();
```

### 4. Query Events

```typescript
// All PIPELINE_RUN events
const pipelineRuns = await store.query("PIPELINE_RUN");

// Events in date range
const range = await store.query(
  "AGENT_TELEMETRY",
  "2026-06-01T00:00:00Z",
  "2026-06-07T23:59:59Z"
);

// Last 7 days
const recent = await store.queryRecent(7);
```

### 5. Get Statistics

```typescript
const stats = await store.getStats();
console.log(`Total events: ${stats.total_events}`);
console.log(`By type:`, stats.by_type);
console.log(`Store size: ${stats.store_size_mb}MB`);
```

## Event Types

### 1. ARPS_DELTA
Roadmap and prompt evolution.

```typescript
{
  change_type: "phase_completion",
  phase_id: "23.1",
  old_value: "...",
  new_value: "...",
  git_commit: "a1b2c3d4",
  confidence: 1.0,
  affected_subsystems: ["Roadmap Tracking"]
}
```

### 2. PIPELINE_RUN
Ingestion, classification, execution results.

```typescript
{
  pipeline_name: "ingestion",
  status: "success",
  items_processed: 754,
  items_successful: 754,
  items_failed: 0,
  metrics: { ... }
}
```

### 3. AGENT_TELEMETRY
Agent health, performance, errors.

```typescript
{
  agent_name: "harvester",
  status: "healthy",
  task_success_rate: 0.99,
  performance: { ... }
}
```

### 4. GOVERNANCE_SIGNAL
Approval decisions, policy violations.

```typescript
{
  signal_type: "approval",
  entity_type: "skill",
  decision: "approved",
  reason: "3rd successful run"
}
```

### 5. APR_PLAN
Planning decisions, task decomposition.

```typescript
{
  plan_id: "plan_001",
  goal: "Implement Phase 23",
  plan_type: "feature_development",
  task_count: 7,
  task_graph: [ ... ]
}
```

### 6. CRO_RUN
Task execution traces, runtime results.

```typescript
{
  run_id: "run_001",
  plan_id: "plan_001",
  status: "completed",
  step_results: [ ... ]
}
```

## Validation

All events are validated against strict JSON schemas. Invalid events are **rejected** (not written to store).

```typescript
// Valid: will be appended
await store.append({ ... });

// Invalid: throws ValidationError, not written
try {
  await store.append({
    // Missing required fields
    event_type: "PIPELINE_RUN",
    // ...
  });
} catch (err) {
  console.error(err.message);
}
```

## Durability Guarantees

MemoryStore is **ACID-compliant**:

- **Atomicity:** Write buffer is atomic (all-or-nothing)
- **Consistency:** Schema validation before append
- **Isolation:** File lock prevents concurrent writes
- **Durability:** fsync ensures data written to disk

### Crash Recovery

If the process crashes:

1. Write buffer is lost (not yet flushed)
2. Events in store are safe (atomic rename)
3. No corruption (checksums validate on read)

Example:

```typescript
// Session 1: Write events
const store1 = new MemoryStore();
await store1.append(event1);
await store1.append(event2);
await store1.flush_sync();  // <-- Process crashes here

// Session 2: Restart
const store2 = new MemoryStore();
const stats = await store2.getStats();
// Both events survived (if flush completed atomically)
```

## Integrity & Corruption

Every event includes a SHA-256 checksum. On read, checksums are validated:

```typescript
// Valid event
{
  id: "...",
  checksum: "sha256:abc123...",
  // ...
}

// Corrupted event (mismatch)
// → WARNING logged
// → Event excluded from results
// → Store continues normally
```

## Retention Policy

| Event Type | Raw | Archive | Distilled |
|-----------|-----|---------|-----------|
| ARPS_DELTA | 90d | S3 (1yr) | ✅ Permanent |
| PIPELINE_RUN | 90d | S3 (1yr) | ✅ Monthly aggregates |
| AGENT_TELEMETRY | 90d | S3 (6mo) | ✅ Health trends |
| GOVERNANCE_SIGNAL | 365d | S3 (permanent) | ❌ Never distill |
| APR_PLAN | 365d | S3 (permanent) | ✅ Learning signals |
| CRO_RUN | 90d | S3 (1yr) | ✅ Execution history |

## Testing

Run the test suite:

```bash
npx ts-node MemoryStore.test.ts
```

Tests cover:

- ✅ Valid event append
- ✅ Invalid event rejection
- ✅ Durability (crash recovery)
- ✅ Query patterns
- ✅ Checksum validation

## Performance Targets

- Event append: <10ms (p99)
- Event query: <100ms (p99)
- Full store read: <5 seconds (for 7-day window)

## Harvester (Phase 23.3)

Collects events from CIC agents and emits them to MemoryStore with automatic periodic flushing.

```typescript
import { MemoryHarvester } from "./memory";

const harvester = new MemoryHarvester({
  sourceAgent: "harvester",
  autoFlushIntervalMs: 30000,
});

await harvester.registerPipelineEvent("ingestion", {
  pipeline_name: "ingestion",
  pipeline_id: "run_001",
  status: "success",
  // ... pipeline data
});

await harvester.registerTelemetryEvent({
  agent_name: "harvester",
  // ... agent telemetry
});

await harvester.flush();
harvester.destroy();
```

See [HARVESTER.md](harvester/HARVESTER.md) for full integration guide.

## Query API (Phase 23.4)

Typed, composable queries over the append-only ledger.

```typescript
import { MemoryStore, MemoryQuery } from "./memory";

const store = new MemoryStore();
const query = new MemoryQuery(store);

// Query by event type
const governanceEvents = await query.queryByType({
  eventType: "GOVERNANCE_SIGNAL",
  timeRange: {
    from: new Date("2026-06-01T00:00:00Z"),
    to: new Date("2026-06-07T23:59:59Z"),
  },
});

// Trace a request through correlation ID
const trace = await query.queryByCorrelationId({
  correlationId: "corr_abc123",
});

// Reconstruct session with breakdown
const session = await query.reconstructSession("session_20260607_001");
console.log(session.eventTypeBreakdown); // { PIPELINE_RUN: 5, GOVERNANCE_SIGNAL: 3, ... }

// Get governance decisions and execution separately
const lineage = await query.governanceLineage("corr_abc123");
console.log(lineage.governanceDecisions);
console.log(lineage.executionTrace);
```

See [MEMORY_QUERY.md](query/MEMORY_QUERY.md) for full API reference.

## Retention & Archival (Phase 23.5)

Local filesystem archival with event distillation.

```typescript
import { MemoryRetention } from "./memory";

const retention = new MemoryRetention(store, {
  archiveThresholdDays: 90,
  distillBeforeArchive: true,
  compressionEnabled: true,
});

// Archive events older than 90 days
const metadata = await retention.archiveOlderThan(90);
console.log(`Archived ${metadata.event_count} events`);

// Start daily auto-archive
retention.startAutoArchive();

// Monitor retention
const stats = await retention.getRetentionStats();
console.log(`Hot: ${stats.hot_events}, Cold: ${stats.archived_events}`);
console.log(`Hot storage: ${stats.hot_size_mb}MB, Cold: ${stats.cold_size_mb}MB`);
```

**Features:**
- ✅ GZIP compression (.jsonl.gz format)
- ✅ Event distillation (70–95% reduction on old events)
- ✅ Archive index with metadata
- ✅ Restore archives if needed
- ✅ Auto-archive scheduler (daily default)
- ✅ Audit trail preserved (GOVERNANCE_SIGNAL never distilled)

**Distillation by type:**
- PIPELINE_RUN: keep_first_last (95%+ reduction)
- AGENT_TELEMETRY: daily_summary (90%+ reduction)
- GOVERNANCE_SIGNAL: keep_all (audit trail)
- APR_PLAN: group_summary (80%+ reduction)
- CRO_RUN: group_summary (80%+ reduction)
- ARPS_DELTA: keep_all (history)

See [MEMORY_RETENTION.md](retention/MEMORY_RETENTION.md) for full guide.

## Next Steps

- **Phase 23.6** — Memory Explorer UI

## References

- MLA Specification: `docs/cic/MLA_SPECIFICATION.md`
- Phase 23.2 Plan: `docs/cic/PHASE_23.2_MEMORYSTORE_IMPLEMENTATION_PLAN.md`
