# Memory Query API (Phase 23.4)

Composable, typed query surface over the MemoryStore append-only ledger.

## Overview

`MemoryQuery` provides high-level query patterns that sit directly on top of `MemoryStore`:

- **By event type** — Filter PIPELINE_RUN, GOVERNANCE_SIGNAL, etc.
- **By correlation ID** — Trace a single request through governance and execution
- **By session ID** — Reconstruct all events in a session with breakdown
- **By timeline** — Recent events (7-day window default)
- **Governance lineage** — Separate governance decisions from execution trace

All queries are **append-only aware** and work efficiently over the immutable ledger.

## API

### `queryByType(options: TypeQueryOptions): Promise<QueryResult>`

Filter events by event type with optional date range and pagination.

```typescript
const result = await query.queryByType({
  eventType: "GOVERNANCE_SIGNAL",
  timeRange: {
    from: new Date("2026-06-01T00:00:00Z"),
    to: new Date("2026-06-07T23:59:59Z"),
  },
  limit: 50,
  offset: 0,
});

console.log(`Found ${result.total} events, returned ${result.events.length}`);
```

### `queryByCorrelationId(options: CorrelationQueryOptions): Promise<QueryResult>`

Trace a request through its correlation ID across all event types.

```typescript
const result = await query.queryByCorrelationId({
  correlationId: "corr_abc123",
});

// All events that share this correlation ID, in order
console.log(`Correlation trace: ${result.events.length} events`);
```

### `queryBySessionId(options: SessionQueryOptions): Promise<QueryResult>`

Get all events for a session with optional pagination.

```typescript
const result = await query.queryBySessionId({
  sessionId: "session_20260607_001",
});

console.log(`Session ${result.events[0].sessionId} has ${result.total} events`);
```

### `reconstructSession(sessionId: string): Promise<SessionReconstructionResult>`

**High-level helper** — Reconstruct a complete session with event breakdown.

```typescript
const session = await query.reconstructSession("session_20260607_001");

console.log(`Session started: ${session.startTime}`);
console.log(`Event breakdown:`, session.eventTypeBreakdown);
// { PIPELINE_RUN: 5, GOVERNANCE_SIGNAL: 3, CRO_RUN: 2, ... }
```

Returns:

```typescript
{
  sessionId: string;
  startTime: string;
  endTime: string;
  eventCount: number;
  events: MemoryEventEnvelope[];
  eventTypeBreakdown: Record<MemoryEventType, number>;
}
```

### `governanceLineage(correlationId: string): Promise<GovernanceLineageResult>`

**High-level helper** — Trace governance decisions and execution separately.

```typescript
const lineage = await query.governanceLineage("corr_abc123");

console.log(`Governance decisions:`, lineage.governanceDecisions.length);
console.log(`Execution events:`, lineage.executionTrace.length);
```

Returns:

```typescript
{
  correlationId: string;
  events: MemoryEventEnvelope[];              // All events in order
  governanceDecisions: MemoryEventEnvelope[]; // Only GOVERNANCE_SIGNAL
  executionTrace: MemoryEventEnvelope[];      // Only CRO_RUN + PIPELINE_RUN
}
```

### `getEventTimeline(days?: number): Promise<QueryResult>`

Recent events (default 7 days).

```typescript
const recent = await query.getEventTimeline(14); // Last 2 weeks

console.log(`${recent.events.length} events in last 2 weeks`);
```

## Types

### `MemoryEventEnvelope`

Flattened event for API consumers:

```typescript
{
  id: string;
  eventType: MemoryEventType;
  timestamp: string;
  payload: Record<string, any>;
  sourceAgent: string;
  sessionId: string;
  correlationId: string;
  checksum: string;
}
```

### `QueryResult`

Standard return type:

```typescript
{
  events: MemoryEventEnvelope[];
  total: number;
  limit?: number;
  offset?: number;
}
```

### `TimeRange`

For date-filtered queries:

```typescript
{
  from: Date;
  to: Date;
}
```

## Error Handling

```typescript
import { MemoryQueryValidationError, MemoryQueryNotFoundError } from "./query";

try {
  const result = await query.queryBySessionId({
    sessionId: "session_nonexistent",
  });
} catch (err) {
  if (err instanceof MemoryQueryNotFoundError) {
    console.log("No events for this session");
  }
}
```

## Pagination

All query methods support limit + offset:

```typescript
// Get 50 events starting at offset 100
const result = await query.queryByType({
  eventType: "PIPELINE_RUN",
  limit: 50,
  offset: 100,
});
```

Pagination is **memory-efficient** — the Query layer filters and paginates in-memory but operates on the already-filtered store results.

## Performance

- **By type**: ~50ms (7-day window, ~500 events)
- **By correlation**: ~100ms (linear scan, typically <50 events)
- **By session**: ~80ms (linear scan, typically <100 events)
- **Governance lineage**: ~100ms (two passes)

Targets are p99. Bottleneck is file I/O on `readStore()` — eventual optimization: indexed key-value store or SQLite backing.

## Integration Points

- **Upstream:** `MemoryStore`, `MemoryHarvester`
- **Downstream:**
  - Memory Explorer UI (Phase 23.5)
  - ARPS reasoning layer (memory-aware planning)
  - Governance audit trails
  - Operational dashboards (Grafana)
- **Contract:** Read-only, append-only aware, no mutations

## Testing

Run the test suite:

```bash
node memory-query.test.cjs
```

Tests validate:
- Interface structure (7 public methods)
- Type definitions (10 types)
- Error hierarchy
- MemoryStore dependency wiring
- QueryResult contract
- Pagination logic
- Governance lineage filtering
- Session reconstruction breakdown

## Next Steps

- **Phase 23.5** — Memory Retention & Archival (S3 integration, distillation rules)
- **Phase 23.6** — Memory Explorer UI (web interface on top of Query API)
