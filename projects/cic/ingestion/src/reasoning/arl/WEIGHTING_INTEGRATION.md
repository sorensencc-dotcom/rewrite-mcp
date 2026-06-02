# Phase 7.11 — ARL Weighting Model

## Overview

Phase 7.11 introduces deterministic, operator-grade weighting logic that transforms stub ARL calculations into real reasoning evaluations.

### What Gets Weighted

1. **Composite Reasoning** — aggregate scores from 5 subsystems → single overall score
2. **Confidence Model** — weighted reasoning score → approval/review decision
3. **Drift Impact** — signal drifts across 4 dimensions → composite drift

### Why It Matters

- Composite reasoning was always 0 → now reflects actual subsystem performance
- Confidence was a stub → now drives APPROVED vs REVIEW_REQUIRED decisions
- Drift was unmeasured → now quantifies reasoning instability

---

## Architecture

```
┌─────────────────────────────────────┐
│   WeightingModel                    │
│   DEFAULT_WEIGHTS: ArlWeights       │
│   - coherence: 0.20                 │
│   - semantic: 0.25                  │
│   - temporal: 0.20                  │
│   - causal: 0.15                    │
│   - narrative: 0.20                 │
└────┬────────────────────────────────┘
     │
     ├─→ CompositeReasoningEngine
     │   (5 subsystem scores → overall)
     │
     ├─→ ConfidenceModel
     │   (weighted composite → approval threshold)
     │
     └─→ DriftImpactCalculator
         (signal drifts → composite drift)
```

---

## Weights Explained

| Subsystem | Weight | Rationale |
|-----------|--------|-----------|
| **coherence** | 0.20 | Structural stability (20%) |
| **semantic** | 0.25 | Meaning preservation (25%) — most important |
| **temporal** | 0.20 | Time consistency (20%) |
| **causal** | 0.15 | Causal chains (15%) — important but not dominant |
| **narrative** | 0.20 | Story coherence (20%) |

**Sum: 1.00 (normalized)**

Semantic + narrative carry more weight because they capture the "what" and "why" of reasoning. Temporal + coherence stabilize the measurement. Causal gets less weight because causal chains are often implicit in the other signals.

---

## Integration

### 1. Import the Engines

```typescript
import { calculateCompositeReasoning } from './engine/CompositeReasoningEngine';
import { calculateConfidence } from './engine/ConfidenceModel';
import { calculateDriftImpact } from './engine/DriftImpactCalculator';
```

### 2. Use in runArl

```typescript
export async function runArl(input: ArlInput): Promise<Verdict> {
  // Calculate weighted composite
  const composite = calculateCompositeReasoning(
    input.coherence,
    input.semantic,
    input.temporal,
    input.causal,
    input.narrative
  );

  // Calculate weighted confidence
  const confidence = calculateConfidence(composite);

  // Calculate weighted drift
  const drift = calculateDriftImpact(input.drift);

  // Format trace with weighted results
  const trace = formatReasoningTrace(
    input.coherence,
    input.semantic,
    input.temporal,
    input.causal,
    input.narrative,
    composite,
    confidence,
    drift
  );

  // Synthesize verdict with weighted confidence
  const synthesizer = new VerdictSynthesizer();
  const verdict = synthesizer.synthesize(
    confidence.reasoning,
    confidence.score,
    trace
  );

  return verdict;
}
```

### 3. Store Weighted Results

After `runArl()`, store the weighting model with the run:

```typescript
const weights = DEFAULT_WEIGHTS;
const stability = {
  timestamp: new Date().toISOString(),
  arl: {
    verdict,
    trace: verdict.reasoningTrace,
    weights,  // expose weights to operator dashboard
  },
};
```

---

## Output Example

### CompositeReasoning (Weighted)

```json
{
  "score": 0.8896,
  "details": "Weighted composite...",
  "coherence": 0.95,
  "semantic": 0.88,
  "temporal": 0.92,
  "causal": 0.85,
  "narrative": 0.90,
  "overall": 0.8896
}
```

Calculation:
```
overall = 0.95×0.20 + 0.88×0.25 + 0.92×0.20 + 0.85×0.15 + 0.90×0.20
        = 0.19 + 0.22 + 0.184 + 0.1275 + 0.18
        = 0.8896
```

### ConfidenceModel (Weighted)

```json
{
  "score": 0.8896,
  "weightedScore": 0.8896,
  "reasoning": "Weighted reasoning score of 0.89 exceeds approval threshold of 0.80",
  "threshold": 0.8
}
```

Verdict: **APPROVED** (score > 0.8)

### DriftVector (Weighted)

```json
{
  "semanticDrift": 0.05,
  "temporalDrift": 0.08,
  "narrativeDrift": 0.03,
  "causalDrift": 0.12,
  "compositeDrift": 0.07,
  "overall": 0.0710
}
```

Calculation:
```
overall = 0.05×0.25 + 0.08×0.20 + 0.03×0.20 + 0.12×0.15 + 0.07×0.20
        = 0.0125 + 0.016 + 0.006 + 0.018 + 0.014
        = 0.0565
```

---

## Adjusting Weights

To change weights (e.g., for a specialized use case):

### Option 1: Modify DEFAULT_WEIGHTS

```typescript
export const DEFAULT_WEIGHTS: ArlWeights = {
  coherence: 0.18,  // reduced
  semantic: 0.28,   // increased
  temporal: 0.20,
  causal: 0.14,
  narrative: 0.20,
};
```

### Option 2: Override at Runtime

```typescript
const customWeights = normalizeWeights({
  coherence: 1,
  semantic: 3,      // higher importance
  temporal: 1,
  causal: 1,
  narrative: 2,
});

// Pass to engines
```

---

## Testing

Run all weighting tests:

```bash
npm test -- tests/arl/WeightingModel.test.ts
npm test -- tests/arl/CompositeReasoningEngine.test.ts
npm test -- tests/arl/ConfidenceModel.test.ts
npm test -- tests/arl/DriftImpactCalculator.test.ts
```

---

## What's Now Live

✅ **Phase 7.11 Complete:**

- **WeightingModel.ts** — defines DEFAULT_WEIGHTS and validation
- **CompositeReasoningEngine.ts** — calculates weighted composite from 5 subsystems
- **ConfidenceModel.ts** — calculates weighted confidence and approval decision
- **DriftImpactCalculator.ts** — calculates weighted drift impact
- **4 Test Suites** — comprehensive coverage of all weighting logic
- **Stability Integration** — weights exposed in generated reports

---

## Next Steps

**Phase 7.12: Threshold Model**  
Dynamically adjust approval/review thresholds based on historical outcomes and risk posture.

**Phase 7.13: ARL Governance Hooks**  
Connect weighting/threshold decisions to operational policies (compliance, escalation, alerting).

**Phase 7.14: ARL Self-Diagnostics**  
Automatic weight adjustment based on verdict drift vs actual outcomes.

---

## Production Checklist

- [ ] Verify weights sum to 1.0
- [ ] Test edge cases (all 0, all 1, mixed)
- [ ] Store weights with every run (for auditability)
- [ ] Monitor drift impact stabilizer (0.2 fixed weight)
- [ ] Plan Phase 7.12 threshold calibration
