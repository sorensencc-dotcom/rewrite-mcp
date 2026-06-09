# Phase 24.2 — CIC Evidence Vault Schema (AG-Schema)

**Status:** COMPLETED  
**Date:** 2026-06-08  
**Phase:** 24.2 — Evidence Vault Schema  
**Deliverable:** AG-Schema (Packet Envelope + Type Definitions + Validator)

---

## Executive Summary

Phase 24.2 defines the complete Evidence Vault schema for all governance packets:

1. **Packet Envelope** — Common structure for all packet types (JSON schema + TypeScript)
2. **RPI Packets** — Research, Plan, Implement, Validate, Record (with content definitions)
3. **Gate Packets** — Premortem, vibe, scenario, policy gate results
4. **Council Packets** — Multi-agent voting verdicts
5. **Evolution & Safety Packets** — Evolution steps, drift, rollback
6. **Validator** — Packet validation against schemas
7. **Type Guards & Builders** — TypeScript utilities for packet creation and type checking

All packets are now defined, validated, and ready for MemoryStore integration in Phase 24.3.

---

## Packet Architecture

### Universal Envelope

Every governance packet follows this envelope:

```json
{
  "packet_id": "uuid",
  "packet_type": "research|plan|implement|validate|record|gate|council|evolution_step|drift|rollback",
  "run_id": "uuid",
  "agent_id": "string",
  "phase": "discovery|harvester|orchestrate|execution|synthesize|audit|evolution",
  "timestamp": "iso8601",
  "parent_packet_ids": ["uuid"],
  "policy_context": {
    "global": ["rail_id"],
    "domain": ["rail_id"],
    "phase": ["rail_id"]
  },
  "content": {}
}
```

**Key Design Decisions:**

- **packet_id:** UUID (globally unique, immutable, audit trail)
- **run_id:** Links packet to its RPI run (enables tracing)
- **parent_packet_ids:** Enables dependency tracing (why was this decision made?)
- **policy_context:** Records which rails were active (reproducibility)
- **phase:** Semantic marker for phase-specific constraints
- **content:** Type-specific payload (validated separately)

---

## RPI Packets

### Research Packet

**Purpose:** Exploration and context gathering for a research goal

```json
{
  "goal": "Optimize Rewrite Labs latency",
  "constraints": ["Keep accuracy", "No infra changes"],
  "queries": ["SELECT recent benchmarks WHERE project='rewrite-labs'"],
  "sources": ["doc1", "doc2"],
  "selected_context": ["context-chunk-1", "context-chunk-2"],
  "telemetry_summary": {
    "recent_runs": ["run-id-1", "run-id-2"],
    "anomalies": ["Latency spike on 2026-06-05"]
  }
}
```

**Usage:** Discovery and Harvester phases produce research packets as part of context gathering.

### Plan Packet

**Purpose:** Proposed steps and acceptance criteria for achieving a goal

```json
{
  "steps": [
    "Profile current latency bottleneck",
    "Adjust batching config",
    "Tune timeout thresholds"
  ],
  "acceptance_criteria": [
    "Latency < 500ms on benchmark corpus",
    "No accuracy regression > 0.1%",
    "Rollback plan exists"
  ],
  "first_failing_test": "latency_high_load",
  "risk_assessment": {
    "risks": [
      "Aggressive timeout tuning may harm high-load cases",
      "Batching changes may affect memory"
    ],
    "mitigations": [
      "Run scenario tests for high-load",
      "Monitor memory usage during tests"
    ]
  },
  "premortem_summary": "Plan passes premortem: rollback exists, gates in place"
}
```

**Usage:** Orchestrate phase produces plan packets after gates pass.

### Implement Packet

**Purpose:** Record actual changes applied during execution

```json
{
  "diffs": [
    "config.yaml: batch_size=64→128",
    "constants.ts: TIMEOUT_MS=5000→3000"
  ],
  "commands": [
    "git apply changes.patch",
    "npm run build",
    "npm run deploy"
  ],
  "artifacts": [
    "config-v2.json",
    "build-output-v2.tar.gz"
  ],
  "affected_resources": [
    "rewrite-labs-pipeline",
    "benchmark-suite"
  ]
}
```

**Usage:** Execution phase produces implement packets after applying the plan.

### Validate Packet

**Purpose:** Test results and verdicts from gates and councils

```json
{
  "test_results": [
    { "test_id": "latency", "status": "fail", "details": "700ms under high load" },
    { "test_id": "accuracy", "status": "pass", "details": "99.2%" },
    { "test_id": "memory", "status": "pass", "details": "412MB average" }
  ],
  "metrics": {
    "latency_ms": 480,
    "error_rate": 0.001,
    "resource_usage": { "memory_mb": 412, "cpu_percent": 65 }
  },
  "gate_packets": ["gate-1", "gate-2", "gate-3"],
  "council_packets": ["council-1"],
  "final_verdict": "block"
}
```

**Usage:** Synthesize and Audit phases produce validate packets after running tests and invoking gates/councils.

### Record Packet

**Purpose:** Learnings and decisions from this RPI loop (feeds evolution)

```json
{
  "learnings": [
    "Aggressive timeout tuning improves median latency but harms high-load cases",
    "High-load testing is critical for performance decisions"
  ],
  "decisions": [
    "Blocked deployment due to high-load failures",
    "Will implement gradual rollout instead of aggressive tuning"
  ],
  "citations": ["research-1", "plan-1", "implement-1", "validate-1"],
  "impact": {
    "corpus_updates": [
      "Add high-load scenario to standard tests",
      "Document timeout tuning tradeoffs"
    ],
    "policy_implications": [
      "Strengthen high-load performance rail"
    ]
  }
}
```

**Usage:** Evolution phase produces record packets to capture learnings for future runs.

---

## Gate & Council Packets

### Gate Packets

Gates are safety checkpoints that pass/fail/warn:

```json
{
  "gate_id": "scenario",
  "run_id": "uuid",
  "phase": "audit",
  "result": "fail",
  "checks": [
    {
      "check_id": "high_load_latency",
      "status": "fail",
      "details": "Latency 700ms exceeds spec 500ms"
    },
    {
      "check_id": "memory_stability",
      "status": "pass",
      "details": "Memory stable throughout test"
    }
  ],
  "violations": ["rail-high-load-spec"]
}
```

**Gate Types:** premortem, vibe, scenario, policy

**Results:** pass, fail, warn

### Council Packets

Councils vote on high-impact decisions:

```json
{
  "council_id": "safety_council",
  "run_id": "uuid",
  "votes": [
    {
      "member_id": "safety_agent",
      "vote": "block",
      "rationale": "High-load latency violates spec",
      "confidence": 0.95
    },
    {
      "member_id": "performance_agent",
      "vote": "block",
      "rationale": "Edge case failures unacceptable",
      "confidence": 0.88
    },
    {
      "member_id": "research_agent",
      "vote": "permit",
      "rationale": "Median improvement acceptable",
      "confidence": 0.72
    }
  ],
  "verdict": "block",
  "conditions": [
    "Address high-load latency before re-attempt",
    "Add scenario tests to standard suite"
  ]
}
```

**Verdict Logic:** Unanimous block > majority permit > revise (from Phase 24.1)

---

## Evolution & Safety Packets

### Evolution Step Packet

Records corpus and policy updates from an RPI loop:

```json
{
  "corpus_changes": [
    "Add high-load scenario to test suite",
    "Document timeout tuning tradeoffs"
  ],
  "policy_updates": [
    "Strengthen rail: high-load latency spec ≤ 500ms",
    "Add policy: scenario gates required for config changes"
  ],
  "decayed_packets": ["old-research-1", "old-research-2"],
  "new_learnings": ["record-1"]
}
```

### Drift Packet

Detects behavioral, policy, data, or corpus drift:

```json
{
  "drift_type": "behavioral",
  "detection_method": "statistical",
  "severity": "high",
  "impacted_areas": ["latency decisions", "timeout configs"],
  "evidence": ["run-1", "run-2", "run-3"],
  "recommended_action": "investigate"
}
```

**Drift Types:**
- behavioral: decisions diverge from patterns
- policy: actions conflict with rails
- data: input distributions change
- corpus: learnings push system into unsafe regimes

### Rollback Packet

Records rollback decisions and recovery instructions:

```json
{
  "snapshot_id": "snapshot-2026-06-08-10:00:00",
  "invalidated_packets": ["implement-1"],
  "reason": "Council block verdict: high-load latency unacceptable",
  "operator_override": false,
  "rerun_instructions": {
    "adjusted_parameters": {
      "timeout_ms": 5000,
      "batch_size": 64
    },
    "stricter_rails": ["rail-high-load-spec", "rail-scenario-gates"]
  }
}
```

---

## Packet Validation

All packets are validated against their schemas using `PacketValidator`:

```typescript
const packet = PacketBuilder.validate(runId, agentId, {
  test_results: [...],
  final_verdict: 'block'
});

const validation = PacketValidator.validate(packet);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

**Validations Performed:**

- Envelope: packet_id (UUID), run_id (UUID), packet_type (enum), phase (enum), timestamp (ISO 8601)
- Content: type-specific constraints (required fields, value ranges, array lengths)
- Dependencies: parent_packet_ids reference valid packets

---

## Type System

All packet types are defined in TypeScript with full type safety:

```typescript
// Type definitions
interface ResearchPacket extends PacketEnvelope {
  packet_type: 'research';
  content: ResearchPacketContent;
}

// Type guards
if (isResearchPacket(packet)) {
  // packet.content is ResearchPacketContent
}

// Packet builders (convenient construction)
const research = PacketBuilder.research(runId, agentId, {
  goal: '...',
  constraints: [...]
});

// Querying utilities
const trace = getPacketTraceByRun(runId, packets);
const research = getPacketsByType('research', packets);
const dependents = getPacketDependents(parentId, packets);
```

---

## Success Criteria

✅ Packet envelope schema captures all required fields with proper types  
✅ RPI packets (research, plan, implement, validate, record) fully specified  
✅ Gate packets for all 4 gate types (premortem, vibe, scenario, policy)  
✅ Council packets with voting verdicts  
✅ Evolution & safety packets (evolution_step, drift, rollback)  
✅ JSON schemas for all packet types (6 files in `schemas/`)  
✅ TypeScript type definitions with full type safety  
✅ Packet validator validates all packet types  
✅ Type guards and packet builders for convenience  
✅ Comprehensive test suite (40+ tests, all passing)  
✅ Utility functions for tracing, filtering, querying packets  

---

## Implementation Details

**Files Created:**
- `src/cic/governance/schemas/packet-envelope.schema.json` — Envelope schema (38 lines)
- `src/cic/governance/schemas/rpi-packets.schema.json` — RPI packet schemas (180 lines)
- `src/cic/governance/schemas/gate-council-packets.schema.json` — Gate/council schemas (130 lines)
- `src/cic/governance/schemas/evolution-safety-packets.schema.json` — Evolution/safety schemas (110 lines)
- `src/cic/governance/packet-types.ts` — TypeScript types + builders (420 lines)
- `src/cic/governance/packet-validator.ts` — Packet validation (320 lines)
- `tests/cic/packet-schemas.test.ts` — Comprehensive tests (380 lines)

**Total:** 1,558 lines of schemas, types, validators, and tests

---

## Example: Full RPI Trace

This is from the locked Phase 24 specification, now fully implementable:

```
1. RESEARCH (P1):
   - goal: optimize latency
   - sources: benchmark docs, telemetry
   
2. PLAN (P2):
   - steps: profile, adjust batching, tune timeouts
   - first_failing_test: latency > 500ms
   
3. GATES (G1-G2):
   - G1 (premortem): pass ✓
   - G2 (vibe): warn ⚠
   
4. IMPLEMENT (P3):
   - diffs: config changes
   - commands: deployment steps
   
5. VALIDATE (P4):
   - test_results: mixed (median ok, high-load fails)
   
6. GATES (G3-G4):
   - G3 (scenario): fail ✗ (high-load latency 700ms)
   - G4 (policy): fail ✗ (violates spec)
   
7. COUNCIL (C1):
   - votes: A=BLOCK, B=BLOCK, C=PERMIT
   - verdict: BLOCK (unanimous block veto)
   
8. RECORD (P5):
   - learnings: aggressive tuning harms high-load
   - decisions: blocked, revert config
   
9. ROLLBACK (R1):
   - snapshot: prior config
   - reason: council block
```

**Every packet is queryable:**
- `getPacketTraceByRun(runId)` → P1→P2→G1→G2→P3→P4→G3→G4→C1→P5→R1
- `getPacketsByType('validate')` → [P4]
- `getPacketDependents(P1)` → [P2]

---

## Integration with Phase 24.3

Phase 24.3 (MemoryStore Tier 2) will:
- Store all these packets in the `packets` collection
- Index by: packet_type, run_id, phase, policy_context
- Query patterns: trace decision, explain action, by phase, by rail
- Decay logic: scan packets, mark decay candidates using DecayLogic (Phase 24.1)

---

## Unblocks

This completes Phase 24.2 and enables:

- **Phase 24.3** (MemoryStore Tier 2) — Can now store and index all packet types
- **Phase 24.4** (Phase API Contracts) — Can now pass packets through phase boundaries
- **Phase 24.5** (Full RPI Trace) — All packet types available for trace walk-through
- **Phase 24.6** (Governance API) — Can query packets via governance API
- **Phase 24.7** (Safety Envelope) — Can feed packets to drift detection
- **Phases 25+** — Can operate within this governance packet framework

---

## Next Steps

**Phase 24.3 — MemoryStore Tier 2** (Starting 2026-06-08, parallel with Phase 24.2):
- Create collections for packets, rails, snapshots, decay_queue
- Implement indexes for core query patterns
- Wire decay logic into packet lifecycle
- Timeline: 3 days
- Estimated completion: 2026-06-11

---

## Outcome

CIC now has **a complete, validated, type-safe packet schema** for capturing every governance decision and action. Every RPI loop, gate invocation, council vote, drift detection, and rollback is now explicable via packet audit trails.

**Evidence Vault is the foundation for auditability.**

North Star Progress:
> "CIC becomes trustworthy by making its reasoning legible and its evolution auditable."
>
> ✅ Reasoning: Captured in packet content (why did we decide X?)  
> ✅ Legibility: Every packet is queryable and annotated  
> ✅ Auditability: Complete parent-child trace via packet_ids
