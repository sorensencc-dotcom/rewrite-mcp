# Phase 7.12 — Threshold Model Implementation

**Status:** ✅ COMPLETE  
**Date:** 2026-06-05  
**Impact:** ARL becomes deterministic decision engine with operator-visible reject codes and BOB governance signals

## Summary

Phase 7.12 transforms ARL from a weighted reasoning system (Phase 7.11) into a hard-threshold decision engine. Expansions are evaluated against four deterministic thresholds, producing three decision states (ACCEPT/QUARANTINE/REJECT) with operator-visible reject codes for governance integration.

## Architecture

### 1. ThresholdModel (Core Decision Engine)

**File:** `projects/cic/ingestion/src/reasoning/arl/engine/ThresholdModel.ts`

Evaluates four reasoning signals against configurable thresholds:

```typescript
interface ThresholdResult {
  decision: 'ACCEPT' | 'REJECT' | 'QUARANTINE';
  passed: ThresholdCheck[];
  failed: ThresholdCheck[];
  rejectCode?: string;
}
```

**Thresholds:**
- **Composite Reasoning:** ≥ 0.75 (weighted aggregation from Phase 7.11)
- **Confidence:** ≥ 0.70 (belief in verdict)
- **Drift Magnitude:** ≤ 0.30 (semantic deviation)
- **Contradiction Severity:** ≤ 0.20 (narrative conflict)

**Decision Logic:**
- **ACCEPT:** All 4 checks pass
- **QUARANTINE:** 1 check fails (escalation required)
- **REJECT:** 2+ checks fail (blocked)

### 2. Reject Codes (Operator Visibility)

Deterministic error codes for governance and human review:

```typescript
REJECT_CODES = {
  E001_composite_reasoning_below_threshold,
  E002_confidence_below_threshold,
  E003_drift_magnitude_exceeds_threshold,
  E004_contradiction_severity_exceeds_threshold,
  E005_multiple_threshold_failures,
};
```

Enables:
- Automated BOB rule triggers by error code
- Operator dashboards showing specific failure reasons
- Audit trails tracking rejection patterns

### 3. GovernanceSignalGenerator (BOB Integration)

**File:** `projects/cic/ingestion/src/reasoning/arl/engine/GovernanceSignalGenerator.ts`

Converts ThresholdModel results into governance signals for BOB (CIC governance):

```typescript
interface GovernanceSignal {
  phaseId: '7.12';
  decision: 'ACCEPT' | 'REJECT' | 'QUARANTINE' | 'ESCALATE';
  reasons: string[];
  driftVector?: DriftMetrics;
  narrativeRiskLevel: 'low' | 'medium' | 'high';
  operatorOverrideAllowed: boolean;
  escalationPath?: string;
  auditEntry: { timestamp, phaseId, decision, reasonCount };
}
```

**Escalation Routing:**
- **Drift failures** → Memory Integrity Check (Phase 7.15)
- **Contradiction failures** → Narrative Coherence Review (Phase 7.14)
- **Ambiguous cases** → Operator Manual Review

### 4. VerdictSynthesizer Integration

**File:** `projects/cic/ingestion/src/reasoning/arl/engine/VerdictSynthesizer.ts`

Updated to use ThresholdModel when full metrics available:

```typescript
verdict = thresholdModel.evaluate({
  compositeReasoning,   // From Phase 7.11
  confidence,           // From reasoning subsystems
  driftMagnitude,       // From drift calculator
  contradictionSeverity // From conflict detector
});
```

Supports fallback to confidence-only mode for legacy code paths.

## Usage

### Basic Evaluation

```typescript
const model = new ThresholdModel();

const result = model.evaluate({
  compositeReasoning: 0.85,
  confidence: 0.82,
  driftMagnitude: 0.15,
  contradictionSeverity: 0.10,
});

console.log(result.decision);     // 'ACCEPT'
console.log(result.rejectCode);   // undefined
```

### Governance Signal Generation

```typescript
const generator = new GovernanceSignalGenerator();

const signal = generator.generate(
  thresholdResult,
  expansionId,
  driftVector  // optional
);

// Use signal for:
// - BOB rule triggers
// - Operator dashboards
// - Audit logging
```

### Custom Thresholds

```typescript
const strictModel = new ThresholdModel({
  compositeReasoningMin: 0.9,
  confidenceMin: 0.95,
  driftMaxMagnitude: 0.2,
  contradictionSeverityMax: 0.15,
});
```

## Test Coverage

**File:** `projects/cic/ingestion/tests/reasoning/arl/engine/ThresholdModel.test.ts`

40+ test cases covering:
- ✅ Happy path (all thresholds pass)
- ✅ Single failures (QUARANTINE logic)
- ✅ Multiple failures (REJECT logic)
- ✅ Boundary conditions (exact threshold values)
- ✅ Custom thresholds
- ✅ Real-world scenarios (high-quality, marginal, drift-heavy expansions)

**File:** `projects/cic/ingestion/tests/reasoning/arl/engine/GovernanceSignalGenerator.test.ts`

15+ test cases covering:
- ✅ ACCEPT decision → low risk, no escalation
- ✅ QUARANTINE decision → medium risk, escalation routed
- ✅ REJECT decision → high risk, operator override allowed
- ✅ Drift vector integration
- ✅ Audit trail generation
- ✅ Operator override policy enforcement
- ✅ Real-world escalation scenarios

## Integration Points

### Phase 7.11 (Weighting Model)
- Consumes `compositeReasoning` score from weighted aggregation
- Consumes `confidence` from weighted confidence scoring

### Phase 7.13 (Governance Hooks)
- Emits GovernanceSignal to BOB
- BOB rule engine consumes reject codes
- BOB escalation handlers route to Phase 7.14/7.15

### Phase 7.14 (ARL Self-Diagnostics)
- Threshold model health checks
- Weighting sanity validation

### Phase 7.15 (Memory Consistency)
- Receives escalations from drift failures
- Validates memory alignment before acceptance

## Example Scenarios

### Scenario 1: High-Quality Expansion (ACCEPT)

```typescript
{
  compositeReasoning: 0.92,  // Excellent reasoning
  confidence: 0.88,          // High confidence
  driftMagnitude: 0.08,      // Minimal drift
  contradictionSeverity: 0.05 // No conflicts
}
→ Decision: ACCEPT
→ No escalation needed
```

### Scenario 2: Marginal Expansion (QUARANTINE)

```typescript
{
  compositeReasoning: 0.76,  // Just above min
  confidence: 0.68,          // Just below min
  driftMagnitude: 0.25,
  contradictionSeverity: 0.15
}
→ Decision: QUARANTINE (confidence failure)
→ Escalation: Operator Manual Review
→ Risk Level: Medium
```

### Scenario 3: Problematic Expansion (REJECT)

```typescript
{
  compositeReasoning: 0.45,  // Far below min
  confidence: 0.55,          // Far below min
  driftMagnitude: 0.50,      // Exceeds max
  contradictionSeverity: 0.60 // Far exceeds max
}
→ Decision: REJECT (multiple failures)
→ Reason: E005_multiple_threshold_failures
→ Risk Level: High
→ Operator override allowed
```

## Tuning Guide

Adjust thresholds based on:

- **Composite Reasoning Min:** Increase for more conservative acceptance (0.8+) or decrease for exploratory mode (0.65)
- **Confidence Min:** Increase to reduce false positives in reasoning (0.85+)
- **Drift Max Magnitude:** Decrease to protect narrative consistency (0.2) or increase to allow exploratory drift (0.4)
- **Contradiction Max:** Keep low (0.15) for strict coherence enforcement

**Recommended:** Use defaults (0.75, 0.70, 0.30, 0.20) for production CIC operations.

## Dependencies

- Phase 7.11: Weighting Model (provides `compositeReasoning`, `confidence`)
- Phase 7.14: Self-Diagnostics (validates threshold model)
- Phase 7.13: Governance Hooks (consumes signals)
- BOB: Rule engine (executes escalations)

## Performance

- **Threshold evaluation:** O(1) — four static comparisons
- **Governance signal generation:** O(n) where n = failure count (typically ≤ 4)
- **No external dependencies:** All logic is deterministic, no ML calls

## Future Phases

- **Phase 7.14:** Self-Diagnostics validates threshold model accuracy
- **Phase 7.13:** Governance Hooks wire thresholds into BOB decision engine
- **Phase 7.18:** Operator Feedback adjusts thresholds based on overrides
- **Phase 7.20:** Stability Plane v2 visualizes threshold violations and drift

## Verification

To verify Phase 7.12 implementation:

```bash
cd projects/cic/ingestion
npm test -- --testNamePattern="Threshold|Governance"
```

Expected: 55+ tests passing (40 ThresholdModel + 15 GovernanceSignalGenerator)

---

**Implementation complete.** Phase 7.12 turns ARL from weighted reasoning into a deterministic decision engine with operator-visible governance signals. Ready for Phase 7.13 BOB integration.
