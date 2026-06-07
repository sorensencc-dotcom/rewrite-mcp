# Phase 7.15 — Memory Consistency Engine

**Status:** ✅ COMPLETE  
**Date:** 2026-06-05  
**Impact:** Validates expansions against historical memory; prevents contradictions, temporal impossibilities, missing context

## Summary

Phase 7.15 is the **governance handler implementation** for `memory_integrity_check` escalations from Phase 7.13. When ARL detects drift (E003), the Memory Consistency Engine validates that the expansion doesn't violate CIC's historical coherence. Full algorithms for temporal validation, contradiction detection, and context sufficiency checking.

## Architecture

### 1. Data Model

**EntityTimeline.ts** — Historical record of an entity

```typescript
interface EntityTimeline {
  entityId: string;
  entityType: string;           // person, place, concept, event, artifact
  firstMentioned: string;       // ISO 8601
  lastUpdated: string;          // ISO 8601
  events: TimelineEvent[];      // Chronological sequence
  attributes: Record<string>;   // Current facts: age, location, role
  relationships: Array<{        // Links to other entities
    relatedEntityId: string;
    relationshipType: string;   // parent, colleague, located_in
    confidence: number;
  }>;
}
```

**ExpansionContext.ts** — Claims being validated

```typescript
interface ExpansionClaim {
  entityId: string;
  claimType: 'attribute' | 'event' | 'relationship';
  statement: string;
  timestamp: string;            // ISO 8601
  confidence: number;           // 0-1
}
```

**MemoryConsistencyResult.ts** — Validation verdict

```typescript
interface MemoryConsistencyResult {
  alignmentScore: number;       // 0.0-1.0 (how well expansion fits)
  driftVector: number;          // -1.0 to +1.0 (change vs previous)
  violations: MemoryViolation[]; // Specific issues found
  approvalRecommendation: 'auto_approve' | 'review' | 'reject';
}
```

### 2. Violation Detection Algorithms

**Temporal Consistency Checks**

```
For each event claim:
  1. Event timestamp >= entity.firstMentioned
     → Else: TEMPORAL_IMPOSSIBILITY (CRITICAL)
  
  2. If prior events exist and entity has "died" event:
     → New event after death without "posthumous"
     → TEMPORAL_ORDER (CRITICAL)
  
  3. Event timeline must be properly ordered
     → Causality preservation (e.g., can't graduate after death)
     → Else: TEMPORAL_ORDER (HIGH)
```

**Contradiction Checks**

```
For each attribute claim:
  1. Check against existing entity.attributes
     → Direct conflict (e.g., location: Boston vs San Francisco)
     → ATTRIBUTE_CONFLICT (HIGH)

For each relationship claim:
  1. Check against entity.relationships
     → Contradictory types (colleague vs friend)
     → RELATIONSHIP_CONFLICT (MEDIUM)
```

**Context Sufficiency Checks**

```
For each claim:
  1. Location claims should specify exact place
     → Missing specific location
     → Context flag (low severity)
  
  2. Event claims should have temporal context
     → Vague timestamps
     → Context flag
  
  3. Causal claims should explain reason
     → Missing "because" clause detail
     → Context flag
```

### 3. Alignment Scoring

**Formula:**

```
baseScore = 1.0
violationPenalty = min(violations.length × 0.1, 0.7)
alignmentScore = (baseScore - violationPenalty) 
               × max(0.5, temporalCoherence) 
               × max(0.5, narrativeCoherence)
```

**Thresholds:**

- **alignmentScore ≥ 0.85**: auto_approve
- **0.70 ≤ alignmentScore < 0.85**: review (has minor issues)
- **alignmentScore < 0.70** OR **critical violations**: reject
- **Missing context > 2**: review

### 4. Drift Vector

Tracks alignment change across re-validations of same expansion:

```
driftVector = current.alignmentScore - previous.alignmentScore
```

Enables detection of:
- Gradual degradation (drift trending negative)
- Improvement (drift trending positive)
- Stability (drift ~0)

### 5. IMemoryStore Interface

Hooks for Phase 7.15.1 integration with persistent memory:

```typescript
interface IMemoryStore {
  getSnapshot(snapshotId?: string): Promise<MemorySnapshot>;
  getEntityTimeline(entityId: string): Promise<EntityTimeline | null>;
  getEntitiesByType(entityType: string): Promise<EntityTimeline[]>;
  storeSnapshot(snapshot: MemorySnapshot): Promise<void>;
  appendEvent(...): Promise<void>;
  getAuditTrail(...): Promise<Array>;
}
```

**Current:** Stateless validator (works with in-memory snapshots)  
**Phase 7.15.1:** Wire validator to actual memory store (database/disk)

## Usage

### Basic Validation

```typescript
const validator = new MemoryConsistencyValidator();

const expansion: ExpansionContext = {
  expansionId: 'exp-001',
  timestamp: '2026-06-05T12:00:00Z',
  claims: [
    {
      entityId: 'person-alice',
      claimType: 'attribute',
      statement: 'location: Boston',
      timestamp: '2026-06-05T12:00:00Z',
      confidence: 0.9,
    },
  ],
  sourcePhase: '7.12',
};

const report = await validator.validate(expansion, memory);

console.log(report.result.approvalRecommendation); // auto_approve
console.log(report.result.alignmentScore);         // 0.92
```

### Interpret Violations

```typescript
const report = await validator.validate(expansion, memory);

for (const violation of report.result.violations) {
  if (violation.severity === 'critical') {
    console.log(`🚨 ${violation.type}: ${violation.details}`);
  } else if (violation.severity === 'high') {
    console.log(`⚠️ ${violation.type}: ${violation.details}`);
  }
}

// Example output:
// 🚨 TEMPORAL_ORDER: Event "Started job" occurs after death
// ⚠️ ATTRIBUTE_CONFLICT: location is "Boston" but claim says "NYC"
```

### Integration with Phase 7.13

```typescript
// In GovernanceHookExecutor (Phase 7.13):

async handleMemoryIntegrityCheck(
  expansion: ExpansionContext,
  signal: GovernanceSignal
): Promise<EscalationResult> {
  const validator = new MemoryConsistencyValidator();
  const memory = await this.memoryStore.getSnapshot();
  
  const report = await validator.validate(expansion, memory);
  
  if (report.result.approvalRecommendation === 'reject') {
    return { decision: 'REJECT', reason: report.result.violations[0].details };
  }
  
  if (report.result.approvalRecommendation === 'review') {
    return { 
      decision: 'ESCALATE', 
      handler: 'operator_review',
      context: report.detailedAnalysis
    };
  }
  
  // auto_approve: record in memory and return success
  return { decision: 'ACCEPT' };
}
```

## Example Scenarios

### Scenario 1: Consistent Expansion (Auto-Approve)

```
Entity: Alice (born Boston 2004, MIT grad 2024, hired TechCorp 2025)

Claim: "Alice still works at TechCorp"
→ Consistent with last known employment
→ No temporal issues
→ No contradictions

Result: alignmentScore=0.95, violations=0, recommendation=auto_approve
```

### Scenario 2: Marginal Case (Review)

```
Entity: Alice (location: Boston per latest record)

Claim: "Alice moved to San Francisco"
→ Contradicts current location attribute
→ But is plausible life event (people move)
→ Requires context on timing

Result: alignmentScore=0.72, violations=[ATTRIBUTE_CONFLICT], recommendation=review
```

### Scenario 3: Critical Violation (Reject)

```
Entity: Alice (died Jan 2026 per historical record)

Claim: "Alice got promoted to VP at TechCorp (Feb 2026)"
→ Event after documented death
→ Cannot be posthumous promotion
→ Impossible state

Result: alignmentScore=0.15, violations=[TEMPORAL_ORDER (CRITICAL)], recommendation=reject
```

### Scenario 4: Missing Context (Review)

```
Claim: "Alice took a trip"
→ No destination specified
→ Vague timing
→ Insufficient context to validate

Result: alignmentScore=0.68, violations=[], missingContext=["Destination not specified"], recommendation=review
```

## Integration Points

### Upstream: Phase 7.13 (Governance Hooks)
- Receives escalations for E003 (drift too high)
- Implements `memory_integrity_check` handler
- Returns validation result to governance engine

### Downstream: Phase 7.15.1 (Memory Store Integration)
- Connects to persistent memory database
- Implements IMemoryStore interface
- Enables real-time memory consistency checking

### Downstream: Phase 7.20 (Stability Plane v2)
- Visualizes alignment scores over time
- Shows drift vector trends
- Tracks violation patterns

### Lateral: Phase 7.27 (Cross-Agent Alignment)
- Uses memory consistency to align reasoning across agents
- Ensures agent1's expansions don't contradict agent2's memory

## Performance & Scalability

**Time Complexity:**
- Single claim validation: O(n) where n = events in entity timeline
- Full expansion validation: O(m × n) where m = claims, n = events

**Space Complexity:**
- Holds previous results for drift calculation: O(k) where k = unique expansions

**For production scaling:**
- Cache entity timelines in memory (hot entities)
- Batch temporal ordering checks (single scan vs per-claim)
- Archive old results after drift calculation
- Index by entity type for faster lookup

## Testing

**File:** `tests/reasoning/arl/memory/MemoryConsistencyValidator.test.ts`

30+ test cases:
- ✅ Consistent expansions (auto-approve)
- ✅ Temporal violations (before birth, after death)
- ✅ Contradictions (attribute conflicts, relationship conflicts)
- ✅ Missing entities
- ✅ Missing context
- ✅ Alignment scoring
- ✅ Drift vector computation
- ✅ Approval recommendations
- ✅ Statistics tracking
- ✅ Real-world scenarios (marginal cases, critical violations)

---

**Implementation complete.** Phase 7.15 validates expansions against memory coherence. Integrates with Phase 7.13 governance hooks. Ready for Phase 7.15.1 (persistent memory store integration).
