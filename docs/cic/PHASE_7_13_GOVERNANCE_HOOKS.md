# Phase 7.13 — Governance Hooks (BOB Integration)

**Status:** ✅ COMPLETE  
**Date:** 2026-06-05  
**Impact:** ARL verdicts (Phase 7.12) wired into BOB governance engine for deterministic escalation and operator override

## Summary

Phase 7.13 connects ARL threshold decisions to CIC's governance orchestration layer (BOB). Threshold model reject codes trigger deterministic governance rules that route expansions to appropriate handlers (memory integrity checks, narrative coherence review, operator review) with complete audit trails and operator override capabilities.

## Architecture

### 1. Governance Rules (Reject Code → Action)

**File:** `projects/cic/ingestion/src/reasoning/arl/governance/ArlGovernanceHooks.ts`

Five governance rules map ARL reject codes to governance actions:

```typescript
interface GovernanceRule {
  id: string;
  rejectCode: string;
  trigger: string;            // BOB condition expression
  action: 'reject' | 'quarantine' | 'escalate';
  handler: string;            // Which escalation handler
  priority: 'low' | 'medium' | 'high';
  conditions?: string[];      // Additional BOB conditions
}
```

**Rules:**

| Code | Error | Action | Handler | Priority |
|------|-------|--------|---------|----------|
| **E001** | Composite reasoning below threshold | QUARANTINE | operator_review | Medium |
| **E002** | Confidence below threshold | ESCALATE | operator_review | High |
| **E003** | Drift magnitude exceeds threshold | ESCALATE | memory_integrity_check | High |
| **E004** | Contradiction severity exceeds threshold | REJECT | narrative_coherence_review | High |
| **E005** | Multiple threshold failures | REJECT | operator_review | High |

### 2. Escalation Handlers

Three handlers execute escalation logic for different failure modes:

#### Handler 1: Memory Integrity Check
- **Triggered by:** Drift failures (E003)
- **Action:** Validates expansion against historical entity timelines and memory coherence
- **Output:** Escalation result with memory validation data
- **Integration:** Phase 7.15 (Memory Consistency Engine)

#### Handler 2: Narrative Coherence Review
- **Triggered by:** Contradiction failures (E004)
- **Action:** Analyzes narrative conflicts and proposes resolution paths
- **Output:** Escalation result with conflict analysis
- **Integration:** Phase 7.14 (ARL Self-Diagnostics)

#### Handler 3: Operator Manual Review
- **Triggered by:** Confidence failures (E002), composite reasoning failures (E001), multiple failures (E005)
- **Action:** Routes to operator dashboard for human judgment
- **Output:** Escalation pending operator decision (approve/reject/modify)
- **Integration:** Operator UI dashboard

### 3. Audit Trail

Every governance decision is logged with full context:

```typescript
interface AuditLogEntry {
  timestamp: Date;
  phaseId: '7.13';
  expansionId: string;
  decision: string;           // ACCEPT, QUARANTINE, REJECT
  rejectCode?: string;        // E001-E005
  escalationId?: string;      // Link to escalation handler
  operatorAction?: string;    // approved, rejected, modified
  notes?: string;             // Human-readable reason
}
```

**Audit log supports:**
- Filtering by reject code, expansion ID, timestamp
- Operator override tracking
- Statistical reporting (approval rate, escalation breakdown)

### 4. Operator Override Mechanism

Operators can approve/reject/modify escalated expansions:

```typescript
await hooks.handleOperatorOverride(
  expansionId: 'exp-123',
  escalationId: 'esc-xxx',
  decision: 'approved' | 'rejected' | 'modified',
  reasoning: 'expansion critical for Q2 goals'
);
```

**Policy:**
- Operators can override QUARANTINE decisions
- Operators can override REJECT decisions (with explicit justification)
- Operators cannot override ACCEPT decisions (no escalation needed)
- All overrides logged to audit trail with timestamp and reasoning

## Usage

### Processing a Governance Signal

```typescript
const hooks = new ArlGovernanceHooks();

// From Phase 7.12
const signal: GovernanceSignal = {
  phaseId: '7.12',
  decision: 'ESCALATE',
  reasons: ['Drift magnitude exceeds threshold'],
  narrativeRiskLevel: 'medium',
  operatorOverrideAllowed: true,
  rejectCode: REJECT_CODES.DRIFT_TOO_HIGH,
  driftVector: { /* ... */ },
  auditEntry: { /* ... */ },
};

// Wire into BOB governance
const escalation = await hooks.processSignal(signal);
// → Routes to memory_integrity_check handler
```

### Querying Audit Log

```typescript
// All decisions
const all = hooks.getAuditLog();

// Filter by rejection code
const driftFailures = hooks.getAuditLog({
  rejectCode: REJECT_CODES.DRIFT_TOO_HIGH,
});

// Statistics
const stats = hooks.getStats();
// → { totalDecisions, accepted, quarantined, rejected, operatorOverrides }
```

### Recording Operator Decision

```typescript
await hooks.handleOperatorOverride(
  expansionId,
  escalationId,
  'approved',
  'Expert review confirms expansion coherence despite detected drift'
);
```

## Integration Points

### Upstream: Phase 7.12 (Threshold Model)
- Consumes `GovernanceSignal` with reject codes
- Routes signals to appropriate handlers based on error code

### Downstream: Phase 7.14 (ARL Self-Diagnostics)
- Validates governance rule quality
- Detects if escalation handlers are over/under-triggering
- Suggests rule tuning

### Downstream: Phase 7.15 (Memory Consistency Engine)
- Receives escalations from drift failures
- Validates memory alignment before approval
- Can approve or reject based on memory coherence

### Lateral: BOB Governance Engine
- Executes escalation handlers
- Provides operator UI for manual review
- Maintains escalation state and resolution
- Routes to Phase 7.14 and 7.15 as needed

## Scalability & Performance

**Decision Processing:** O(1)
- Rule lookup by reject code: HashMap access
- Handler selection: HashMap access
- No external calls in hot path

**Audit Logging:** O(n) query, O(1) append
- Audit log is append-only
- Filtering operates on in-memory list (suitable for 10K+ entries/day)
- For production: archive old logs to external store

**Statistics:** O(n) computation
- Recompute on-demand from audit log
- For production: maintain running counters

## Example Scenarios

### Scenario 1: Expansion Accepted (E000)

```
Input: compositeReasoning=0.92, confidence=0.88, drift=0.08, contradiction=0.05
↓
Threshold check: ALL PASS
↓
Decision: ACCEPT
↓
Escalation: NONE
↓
Audit: { decision: 'ACCEPT', notes: 'All thresholds passed' }
↓
Result: Expansion approved immediately
```

### Scenario 2: Expansion Quarantined Due to Drift (E003)

```
Input: compositeReasoning=0.82, confidence=0.78, drift=0.35, contradiction=0.10
↓
Threshold check: DRIFT FAILS
↓
Decision: ESCALATE
↓
Rule E003 triggered: memory_integrity_check
↓
Handler: Validates entity timelines, checks for memory violations
↓
Escalation Status: PENDING
↓
Operator Review: Can approve if memory consistency verified
↓
Audit: { decision: 'ESCALATE', rejectCode: 'E003', escalationId: 'esc-xxx' }
↓
Result: Expansion waiting for memory check completion
```

### Scenario 3: Expansion Rejected Due to Contradiction (E004)

```
Input: compositeReasoning=0.45, confidence=0.55, drift=0.45, contradiction=0.60
↓
Threshold check: CONTRADICTION FAILS (+ others)
↓
Decision: REJECT (E005_multiple_failures)
↓
Rule E005 triggered: operator_review
↓
Handler: Routes to operator dashboard with full context
↓
Operator Decision: Can override with explicit reasoning
↓
Audit: { decision: 'REJECT', operatorAction: 'approved', notes: '...' }
↓
Result: Expansion blocked unless operator overrides
```

### Scenario 4: Operator Override Flow

```
Initial: Expansion escalated to operator_review (E002_confidence_too_low)
↓
Escalation ID: esc-20260605-0001
Operator reviews:
  - Confidence: 0.68 (just below 0.70 threshold)
  - Reasoning: All other metrics strong (0.88+)
  - Decision: APPROVE (confidence margin acceptable)
↓
Override recorded:
  - escalationId: esc-20260605-0001
  - decision: 'approved'
  - reasoning: 'Confidence margin within operator tolerance; other signals strong'
↓
Audit log:
  - { decision: 'ESCALATE', operatorAction: 'approved', ... }
↓
Result: Expansion approved with audit trail showing override
```

## Governance Policy

**Auto-Approval (No Escalation):**
- All 4 thresholds pass → ACCEPT (95% of expansions expected)

**Escalation (Operator/Handler Review):**
- 1 threshold fails → ESCALATE (4% of expansions expected)
- Operator can approve (with reasoning) or reject

**Blocking (Hard Reject):**
- 2+ thresholds fail → REJECT (1% of expansions expected)
- Operator can still override with explicit justification

**Audit Trail:**
- Every decision logged with timestamp, reason, reject code
- Every operator action logged with reasoning
- All escalations tracked from initiation to resolution

## Future Phases

- **Phase 7.14:** Self-Diagnostics validates governance rule quality
- **Phase 7.15:** Memory Consistency Engine implements memory_integrity_check handler
- **Phase 7.18:** Operator Feedback adjusts governance rules based on override patterns
- **Phase 7.20:** Stability Plane v2 visualizes escalation patterns and operator load

## Testing

**File:** `projects/cic/ingestion/tests/reasoning/arl/governance/ArlGovernanceHooks.test.ts`

30+ test cases covering:
- ✅ All five governance rules (E001-E005) and handler routing
- ✅ ACCEPT decision handling (no escalation)
- ✅ ESCALATE/QUARANTINE/REJECT decision routing
- ✅ Audit log filtering and statistics
- ✅ Operator override handling (approve/reject/modify)
- ✅ Error handling for unknown reject codes
- ✅ Real-world scenarios (80/10/10 approval breakdown)

---

**Implementation complete.** Phase 7.13 wires ARL governance into BOB. CIC can now make deterministic decisions with explainable governance signals, automatic escalation routing, and operator override capabilities. Ready for Phase 7.14 Self-Diagnostics.
