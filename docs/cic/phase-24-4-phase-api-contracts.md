# Phase 24.4 — CIC Phase API Contracts

**Status:** COMPLETED  
**Date:** 2026-06-08  
**Phase:** 24.4 — Phase API Contracts  
**Deliverable:** RunContext + 7 Phase Contracts + Gate/Council Invocation

---

## Executive Summary

Phase 24.4 defines the contract between phases and the governance system. Each phase:

1. **Tracks execution via RunContext** — carries run_id, packets, phase transitions
2. **Emits packets** — research, plan, implement, validate, record
3. **Invokes gates** — premortem, vibe, scenario, policy
4. **Invokes councils** — safety_council determines final verdict
5. **Transitions to next phase** — with audit trail of transitions

The result: **every decision is traceable through phase boundaries**.

---

## RunContext: Packet Carrier

RunContext is a mutable container that carries packets through phase execution:

```typescript
class RunContext {
  run_id: string                    // UUID, unique per RPI execution
  agent_id: string                  // Who is running this?
  current_phase: CICPhase           // discovery → harvester → ... → evolution
  
  packets: GovernancePacket[]       // All packets produced
  phase_transitions: Transition[]   // Audit trail of phase changes
  policy_context: PolicyContext     // Active rails for current phase
}
```

### Key Methods

```typescript
// Packet lifecycle
addPacket(packet)                          // Store packet in run
getPackets(): GovernancePacket[]           // All packets
getPacketsByType(type): GovernancePacket[] // Filter by type
getLatestPacketOfType(type)                // Most recent of type

// Phase navigation
transitionToPhase(next)                    // Move to next phase
getPhase(): CICPhase                       // Current phase
getPhaseTransitions()                      // Audit trail

// Policy context
getPolicyContext()                         // Active rails
updatePolicyContext(rails)                 // Apply new rails

// Summaries
getSummary()                               // Full run status
getResearchPacket() / getPlanPacket() / etc. // Convenient accessors
```

---

## Phase Contracts: 7 Implementation Patterns

Each phase implements a `PhaseContract` that specifies:
- Input: what packets/context it receives
- Process: what gates/councils it invokes
- Output: what packets it produces
- Transitions: when it moves to the next phase

### 1. Discovery Phase

**Input:** Goal, constraints (from user/system)  
**Process:** Explore problem space, query corpus  
**Output:** `research_packet` (goal, constraints, sources, context)  
**Gates:** None  

```typescript
DiscoveryPhaseContract.emitResearchPacket(context, {
  goal: 'Optimize latency',
  constraints: ['No infra changes'],
  sources: ['benchmark-docs']
});
```

### 2. Harvester Phase

**Input:** `research_packet` from discovery  
**Process:** Enrich with telemetry, external data  
**Output:** Updated `research_packet` with telemetry_summary  
**Gates:** None  

### 3. Orchestrate Phase

**Input:** `research_packet` from harvester  
**Process:** Plan execution, invoke safety gates  
**Output:** `plan_packet` with steps, acceptance criteria, risk assessment  
**Gates:** 
- **Premortem Gate** — Check rollback exists, reversibility, policy compliance
- **Vibe Gate** — Detect aggressive/risky operations

```typescript
OrchestratePhaseContract.emitPlanPacket(context, {
  steps: ['Profile', 'Adjust config', 'Test'],
  acceptance_criteria: ['Latency < 500ms'],
  risk_assessment: {...}
});

const premoterm = await OrchestratePhaseContract.invokePremortemGate(context, rails);
const vibe = await OrchestratePhaseContract.invokeVibeGate(context);
```

### 4. Execution Phase

**Input:** `plan_packet` from orchestrate  
**Process:** Apply changes to target system  
**Output:** `implement_packet` (diffs, commands, artifacts)  
**Gates:** None  

```typescript
ExecutionPhaseContract.emitImplementPacket(context, {
  diffs: ['config.yaml: batch_size=64→128'],
  commands: ['npm run deploy'],
  artifacts: ['config-v2.json']
});
```

### 5. Synthesize Phase

**Input:** `implement_packet` from execution  
**Process:** Run tests, measure metrics  
**Output:** `validate_packet` with test results (pre-gates)  
**Gates:** None (gates run in Audit)  

```typescript
SynthesizePhaseContract.emitValidatePacket(context, {
  test_results: [
    { test_id: 'latency', status: 'pass', details: '480ms' }
  ],
  metrics: { latency_ms: 480 }
});
```

### 6. Audit Phase

**Input:** `validate_packet` from synthesize  
**Process:** Run scenario tests, invoke councils  
**Output:** Updated `validate_packet` with `final_verdict` (permit|block|revise)  
**Gates:**
- **Scenario Gate** — Test against edge cases, extreme load
- **Policy Gate** — Check policy compliance, rails violations

**Council:**
- **Safety Council** — Multi-agent vote on deployment

```typescript
const scenario = await AuditPhaseContract.invokeScenarioGate(context);
const policy = await AuditPhaseContract.invokePolicyGate(context, rails);
const verdict = await AuditPhaseContract.invokeSafetyCouncil(context);
// verdict: { verdict: 'block'|'permit'|'revise', votes: [...] }
```

### 7. Evolution Phase

**Input:** `validate_packet` with council verdict  
**Process:** Record learnings, evolve policy, execute rollback if BLOCK  
**Output:** `record_packet` (learnings, decisions, citations)  
**Gates:** None  

```typescript
EvolutionPhaseContract.emitRecordPacket(context, {
  learnings: ['Aggressive timeout tuning harms high-load cases'],
  decisions: ['Blocked deployment; revert config']
});
```

---

## Gate & Council Invocation

### Gate Pattern

```typescript
interface GateOutput {
  gate_id: string;                    // 'premortem' | 'vibe' | 'scenario' | 'policy'
  result: 'pass' | 'fail' | 'warn';
  checks: {
    check_id: string;
    status: 'pass' | 'fail' | 'warn';
    details?: string;
  }[];
  violations?: string[];              // Rail IDs violated
}
```

**Result semantics:**
- `pass` — Gate allows phase to proceed
- `warn` — Phase proceeds but conditions met; escalate if borderline results
- `fail` — Gate blocks phase; decision required

### Council Pattern

```typescript
interface CouncilVerdictOutput {
  council_id: string;                 // 'safety_council'
  verdict: 'permit' | 'block' | 'revise';
  votes: {
    member_id: string;
    vote: 'permit' | 'block' | 'revise';
    rationale: string;
    confidence?: number;              // 0-1
  }[];
  conditions?: string[];              // Actions if blocked
}
```

**Verdict computation (from Phase 24.1):**
- If **any** vote = `block` → verdict = `block`
- Else if **majority** vote = `permit` → verdict = `permit`
- Else → verdict = `revise`

---

## Full Phase Flow Example

### Scenario: Optimize Rewrite Labs Latency

```
┌─────────────────────────────────────────────────────────────┐
│ DISCOVERY → research_packet P1                              │
│ goal: "Optimize latency"                                    │
│ constraints: ["Keep accuracy", "No infra changes"]          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ HARVESTER → enriched research_packet P1                     │
│ telemetry_summary: [recent_runs, anomalies]                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ ORCHESTRATE → plan_packet P2 + gates G1, G2                │
│ steps: ["Profile", "Adjust batching", "Tune timeouts"]     │
│ ─────────────────────────────────────────────────────────── │
│ G1 (premortem): pass ✓ (rollback exists)                    │
│ G2 (vibe): warn ⚠ (aggressive timeout tuning)               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ EXECUTION → implement_packet P3                             │
│ diffs: ["config.yaml: batch_size=64→128"]                  │
│ commands: ["npm run deploy"]                                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ SYNTHESIZE → validate_packet P4 (pre-gates)                │
│ test_results: [                                             │
│   {test_id: "latency", status: "fail", details: "700ms"}  │
│   {test_id: "accuracy", status: "pass"}                   │
│ ]                                                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ AUDIT → gates G3, G4 + council C1 + verdict               │
│ ─────────────────────────────────────────────────────────── │
│ G3 (scenario): fail ✗ (high-load latency 700ms)            │
│ G4 (policy): fail ✗ (violates high-load spec)              │
│ C1 (safety_council): block                                  │
│   safety-agent: block (high-load fails)                     │
│   performance-agent: block (metric violation)               │
│ ─────────────────────────────────────────────────────────── │
│ P4.final_verdict = "block"                                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ EVOLUTION → record_packet P5 + rollback R1                 │
│ learnings: ["Aggressive tuning harms high-load"]           │
│ decisions: ["Blocked deployment; revert config"]           │
│ ─────────────────────────────────────────────────────────── │
│ R1 (rollback): snapshot-id, invalidated=[P3]               │
└─────────────────────────────────────────────────────────────┘
```

**Trace:** P1 → P2 → G1/G2 → P3 → P4 → G3/G4 → C1 → P5 → R1

**All queryable via RunContext:**
```typescript
context.getPacketTraceByRun(runId)  // [P1, P2, P3, P4, P5, R1]
context.getPacketsByType('validate') // [P4]
context.getPacketsByType('gate')    // [G1, G2, G3, G4]
```

---

## Success Criteria

✅ RunContext carries packets through all 7 phases  
✅ Each phase has a contract (input/output/gates)  
✅ Packet parent_packet_ids form complete DAG  
✅ All 4 gate types callable (premortem, vibe, scenario, policy)  
✅ Council voting integrated (unanimous block, majority permit)  
✅ Phase transitions audited  
✅ Full RPI trace implementable (research → ... → evolution)  
✅ 20 comprehensive tests, 100% passing  

---

## Implementation Details

**Files Created:**
- `src/cic/governance/run-context.ts` (270 lines)
  - RunContext class with packet tracking
  - Phase transition audit trail
  - Policy context management
  - Convenient accessors for RPI packets

- `src/cic/governance/phase-contracts.ts` (460 lines)
  - 7 phase contracts (Discovery, Harvester, Orchestrate, Execution, Synthesize, Audit, Evolution)
  - Gate invocation methods
  - Council invocation with verdict computation
  - Packet emission helpers

- `tests/cic/phase-contracts.test.ts` (430 lines)
  - 20 comprehensive tests covering:
    - RunContext lifecycle
    - All 7 phase contracts
    - Gate invocations
    - Council voting
    - Full RPI flow

- `src/cic/governance/index.ts` (updated)
  - Added Phase 24.4 exports

**Total Phase 24.4:** 1,160 lines (730 code + 430 tests)

---

## Integration Points

### With Phase 24.1 (Governance Model)
- Policy rails evaluated in gates
- Council voting logic (unanimous block, majority permit)
- Decay logic can be invoked during audit

### With Phase 24.2 (Evidence Vault Schema)
- All packets emitted conform to schemas
- Parent_packet_ids form traceability chain

### With Phase 24.3 (MemoryStore Tier 2)
- RunContext packets added to GovernanceMemoryStore
- Queries retrieve full phase flow
- Snapshots created before high-risk phases

### With Phase 24.5 (Full RPI Trace)
- Example traces can now be walked end-to-end
- Visualization shows gate/council decisions
- Rollback points visible

### With Phase 24.6 (Governance API)
- `/api/governance/trace/:run_id` returns RunContext packets
- `/api/governance/phases/:phase_id` returns phase contract results

### With Phase 24.7 (Safety Envelope)
- Drift detection reads packets from RunContext
- Rollback triggered by council block verdicts

---

## Query Patterns Now Possible

**"Show me the full RPI trace"**
```typescript
const trace = context.getPackets();
// [research, plan, implement, validate, record, ...]
```

**"What was the council verdict?"**
```typescript
const councils = context.getPacketsByType('council');
councils[0].content.verdict // 'block' | 'permit' | 'revise'
```

**"Why was this blocked?"**
```typescript
const record = context.getRecordPacket();
record.content.decisions // ["Blocked: high-load latency violation"]
```

**"What changed in the config?"**
```typescript
const implement = context.getImplementPacket();
implement.content.diffs // ["config.yaml: batch_size=64→128"]
```

**"Which rails were violated?"**
```typescript
const policy_gate = context.getPacketsByType('gate')
  .find(p => p.content.gate_id === 'policy');
policy_gate.content.violations // ["rail-high-load-spec", ...]
```

---

## Unblocks

This completes Phase 24.4 and enables:

- **Phase 24.5** (Full RPI Trace) — All phases now emit packets; trace is walkable
- **Phase 24.6** (Governance API) — Can expose RunContext queries via REST
- **Phase 24.7** (Safety Envelope) — Can implement drift detection on packet streams
- **Phases 25+** — Can operate within full governance framework

---

## Next Steps

**Phase 24.5 — Full RPI Trace** (parallel execution):
- Implement concrete example trace (Rewrite Labs latency optimization)
- Visualize phase flow with gates/councils
- Document decision explanations
- Timeline: 1 day
- Estimated completion: 2026-06-09

---

## Outcome

CIC now has **phase-aware governance** where every phase emits packets, invokes gates, and respects councils. The RunContext is the "thread" that ties all phases together.

**Phase API Contracts are the skeleton of autonomous orchestration.**

> "Autonomy requires explicit phase transitions. Trustworthiness requires gates at every boundary."
