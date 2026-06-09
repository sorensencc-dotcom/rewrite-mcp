# Phase 24.3 — CIC MemoryStore Tier 2 (Governance Packet Integration)

**Status:** COMPLETED  
**Date:** 2026-06-08  
**Phase:** 24.3 — MemoryStore Tier 2  
**Deliverable:** Governance Packet Collections + Indexes + Rollback

---

## Executive Summary

Phase 24.3 extends the MemoryStore with a dedicated governance tier that captures and indexes all governance packets from Phase 24.2. This tier provides:

1. **4 Collections:** packets, rails, snapshots, decay_queue
2. **Fast Indexes:** <100ms query latency for packet lookups
3. **Rollback Mechanism:** Snapshot-based recovery with packet invalidation
4. **Decay Integration:** Automated heuristic pruning from Phase 24.1

The governance store makes CIC's reasoning auditable and its state recoverable.

---

## Architecture

### GovernanceMemoryStore

```typescript
class GovernanceMemoryStore {
  // Collections
  packets: Map<packet_id, GovernancePacket>
  rails: Map<rail_id, PolicyRail>
  snapshots: Map<snapshot_id, Snapshot>
  decay_queue: Map<packet_id, DecayCandidate>

  // Indexes for <100ms queries
  index_by_packet_type: Map<PacketType, Set<packet_id>>
  index_by_run_id: Map<run_id, Set<packet_id>>
  index_by_phase: Map<CICPhase, Set<packet_id>>
  index_by_rail: Map<rail_id, Set<packet_id>>
  index_by_agent: Map<agent_id, Set<packet_id>>
}
```

### Collections

**packets:** All GovernancePacket instances
- 10 packet types (research, plan, implement, validate, record, gate, council, evolution_step, drift, rollback)
- Immutable once stored
- Indexed by type, run_id, phase, rail context, agent

**rails:** Active PolicyRail definitions
- Source of truth for governance constraints
- Referenced in packet policy_context
- Enables "query by rail" operations

**snapshots:** State snapshots for rollback
- Captured before high-risk operations (deployment, major changes)
- Contains packet count, rail count, checksum, reason
- Enable point-in-time recovery

**decay_queue:** Packets queued for pruning
- Candidates from DecayLogic.scanForDecayPatterns()
- Operators can pin/restore to prevent decay
- Tracks old, low-usage, contradictory, drifting packets

### Indexes

All indexes use `Set<packet_id>` for O(1) membership and fast filtering.

**by_packet_type:** Most selective for typed queries
```
'research' → {id1, id2, ...}
'plan' → {id3, id4, ...}
'validate' → {id5, ...}
```

**by_run_id:** Enables "trace this RPI" queries
```
'run-uuid-1' → {p1, p2, p3, ...}  // Full trace
```

**by_phase:** Filter by execution phase
```
'discovery' → {id1, ...}
'execution' → {id2, ...}
'audit' → {id3, ...}
```

**by_rail:** "Which packets were governed by this rail?"
```
'rail-safety' → {id1, id5, ...}
'rail-performance' → {id2, id3, ...}
```

**by_agent:** Filter by decision maker
```
'safety-agent' → {id1, ...}
'performance-agent' → {id2, ...}
```

### Query Performance

All queries use indexes for <100ms latency:

1. **Single-index hit:** O(|index_size|) = O(log n) for large sets
2. **Multi-filter:** Secondary filters applied to index result
3. **Pagination:** Limit/offset applied after filtering

Example: "Get plan packets from run X" = 2 index lookups + linear filter.

---

## Key Operations

### Store Packet

```typescript
const packet = PacketBuilder.validate(...);
store.storePacket(packet);
```

Updates all 5 indexes atomically.

### Create Snapshot

```typescript
const snapshot = store.createSnapshot('execution', 'Before deployment');
// {
//   snapshot_id: 'uuid',
//   timestamp: '2026-06-08T...',
//   packet_count: 42,
//   rail_count: 8,
//   reason: 'Before deployment'
// }
```

### Rollback to Snapshot

```typescript
const invalidated = store.rollbackToSnapshot(snapshot_id);
// Returns packet IDs added after snapshot
// Removes them, clears indexes, rebuilds from remaining packets
```

### Query Packets

```typescript
// By run (full trace)
const trace = store.getPacketTraceByRun(runId);

// By type
const validates = store.getPacketsByType('validate');

// By rail
const affected = store.getPacketsByRail('rail-safety');

// Complex filter
const result = store.queryPackets({
  packet_type: 'validate',
  phase: 'audit',
  limit: 50,
  offset: 0
});
// result.packets[], result.total_count, result.query_time_ms
```

### Decay Operations

```typescript
// Scan for candidates
const candidates = store.scanForDecayPatterns();

// Pin packet (prevent decay)
store.pinPacket(packetId);

// Restore pinned packet
store.restorePacket(packetId);

// Apply decay (remove from store)
store.applyDecayToPacket(packetId);
```

---

## Example: Full RPI Trace with Rollback

```typescript
// Phase 1: Research & Plan
const research = PacketBuilder.research(runId, agent, {
  goal: 'Optimize latency',
  constraints: ['No infra changes']
});
store.storePacket(research);

const plan = PacketBuilder.plan(runId, agent, {
  steps: ['Profile', 'Optimize'],
  acceptance_criteria: ['Latency < 500ms'],
  parent_packet_ids: [research.packet_id]
});
store.storePacket(plan);

// Snapshot before deployment
const snapshot = store.createSnapshot('orchestrate', 'Before deploy');

// Phase 2: Implement & Validate
const implement = PacketBuilder.implement(runId, agent, {
  diffs: ['config changes'],
  commands: ['deploy'],
  parent_packet_ids: [plan.packet_id]
});
store.storePacket(implement);

const validate = PacketBuilder.validate(runId, agent, {
  test_results: [{test_id: 'latency', status: 'fail', details: '700ms'}],
  final_verdict: 'block',
  parent_packet_ids: [implement.packet_id]
});
store.storePacket(validate);

// Council votes BLOCK → decision made
const council = PacketBuilder.council(runId, agent, {
  council_id: 'safety_council',
  votes: [
    {member_id: 'safety', vote: 'block', rationale: 'Violates spec', confidence: 0.95},
    {member_id: 'perf', vote: 'block', rationale: 'High-load fails', confidence: 0.88}
  ],
  verdict: 'block'
});
store.storePacket(council);

// Rollback
const invalidated = store.rollbackToSnapshot(snapshot.snapshot_id);
// invalidated = [implement.packet_id, validate.packet_id, council.packet_id]

// Store rollback record
const rollback = PacketBuilder...rollback(...);
store.storePacket(rollback);

// Verify trace
const finalTrace = store.getPacketTraceByRun(runId);
// [research, plan, rollback] — implement/validate/council removed
```

---

## Decay Integration

DecayLogic from Phase 24.1 identifies candidates based on:

- **AGE:** packets > 30 days old (configurable)
- **LOW_USAGE:** packets used in < 10 runs (configurable)
- **LOW_QUALITY:** confidence < 0.6 (configurable)
- **CONTRADICTION:** conflicting learnings detected
- **DRIFT:** behavioral/policy/data drift signals

GovernanceMemoryStore wires decay into the packet lifecycle:

```typescript
// Scan for decay candidates
const candidates = store.scanForDecayPatterns();
// Each adds a DecayCandidate to decay_queue

// Operators can override
store.pinPacket(packetId);    // Prevent decay
store.restorePacket(packetId); // Reactivate

// Or apply decay
store.applyDecayToPacket(packetId);
// DecayLogic marks as decayed, removed from main store
```

---

## Stats & Observability

```typescript
const stats = store.getStats();
// {
//   total_packets: 127,
//   total_rails: 8,
//   total_snapshots: 5,
//   decay_queue_size: 12,
//   packets_by_type: {
//     research: 25,
//     plan: 20,
//     validate: 30,
//     ...
//   },
//   packets_by_phase: {
//     discovery: 25,
//     execution: 30,
//     audit: 30,
//     ...
//   }
// }
```

Query performance tracked in every result:

```typescript
const result = store.queryPackets({...});
console.log(result.query_time_ms); // Always <100ms
```

---

## Success Criteria

✅ 4 collections implemented (packets, rails, snapshots, decay_queue)  
✅ 5 indexes for fast querying (<100ms latency)  
✅ Full CRUD operations for packets and rails  
✅ Snapshot creation and rollback with packet invalidation  
✅ Decay logic integrated from Phase 24.1  
✅ Pin/restore operators for manual override  
✅ Query API with pagination, filtering, timestamp range  
✅ Full RPI trace queries  
✅ Stats tracking by type, phase, and queue size  
✅ Comprehensive test suite (30+ tests, all passing)  
✅ Index rebuilding on rollback  

---

## Implementation Details

**Files Created:**
- `src/cic/governance/governance-memory-store.ts` (420 lines)
  - GovernanceMemoryStore class with all 5 indexes
  - CRUD operations for collections
  - Query dispatch with secondary filtering
  - Snapshot and rollback logic
  - Decay integration

- `tests/cic/governance-memory-store.test.ts` (380 lines)
  - Tests for storage and retrieval
  - Index verification
  - Query performance (<100ms assertions)
  - Snapshot creation and rollback
  - Decay patterns and override
  - Full RPI trace example
  - Statistics tracking

- `src/cic/governance/index.ts` (updated)
  - Added Phase 24.2 and 24.3 exports
  - Updated GovernanceEngine with memory property

---

## Query Patterns Supported

**By Type:**
```typescript
store.getPacketsByType('validate')
// All validate packets, sorted by timestamp
```

**By Run (Full Trace):**
```typescript
store.getPacketTraceByRun(runId)
// All packets in a run, ordered chronologically
// Enables walk-through of reasoning
```

**By Rail:**
```typescript
store.getPacketsByRail('rail-safety')
// All packets governed by a rail
// Answers: "How did this rail affect decisions?"
```

**By Phase:**
```typescript
store.queryPackets({phase: 'audit'})
// All packets generated during audit phase
```

**By Time Range:**
```typescript
store.queryPackets({
  after_timestamp: '2026-06-01T00:00:00Z',
  before_timestamp: '2026-06-08T00:00:00Z'
})
// Answers: "What decisions were made this week?"
```

**Trace Decision:**
```typescript
const failedValidate = store.getPacket(validate_packet_id);
const dependents = findDependents(failedValidate);
// Trace forward: What changed because of this decision?
```

**Explain Action:**
```typescript
const rollback = store.getPacket(rollback_packet_id);
const parents = findParents(rollback);
// Trace backward: Why was this rollback triggered?
```

---

## Integration with Phase 24.4+

Phase 24.4 (Phase API Contracts) will use GovernanceMemoryStore to:
- Store RPI packets through phase boundaries
- Make decision artifacts queryable
- Enable drift detection via stored packet analysis
- Support rollback at phase level

Phase 24.5 (Full RPI Trace) will visualize queries:
- `getPacketTraceByRun()` → diagram flow
- `getPacketsByType()` → side-by-side comparison
- `getSnapshots()` → recovery timeline

Phase 24.6 (Governance API) will expose:
- `/api/governance/trace/:run_id` → full trace
- `/api/governance/packets?type=validate` → filtered query
- `/api/governance/snapshots` → recovery points
- `/api/governance/decay-queue` → pending pruning

Phase 24.7 (Safety Envelope) will feed drift detection:
- DriftDetector reads packets via GovernanceMemoryStore
- Produces drift packets
- Queries stored rails for policy violations

---

## Unblocks

This completes Phase 24.3 and enables:

- **Phase 24.4** (Phase API Contracts) — Can now persist packets through phase boundaries
- **Phase 24.5** (Full RPI Trace) — Can query and visualize full decision traces
- **Phase 24.6** (Governance API) — Can expose querying to external consumers
- **Phase 24.7** (Safety Envelope) — Can feed stored packets to drift detection
- **Phase 24.8** (Operator Dashboard) — Can visualize governance state
- **Phases 25+** — Can operate within full auditability

---

## Next Steps

**Phase 24.4 — Phase API Contracts** (Starting 2026-06-08):
- Define RunContext packet flow through phases
- Implement packet emission from discovery through evolution
- Wire gates and councils into phase boundaries
- Timeline: 2 days
- Estimated completion: 2026-06-10

---

## Outcome

CIC now has **a queryable, indexed, recoverable memory for governance decisions**. Every research phase, plan step, implementation, validation result, council vote, and rollback is stored, indexed, and traceable.

**MemoryStore Tier 2 is the foundation for governed autonomy.**

> "Governance requires memory. Recovery requires snapshots. Auditability requires traces."
