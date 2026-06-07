# Phase 7.7 — ARL Confidence Model Tuning
**Based on:** 12-hour Stability Soak Data (2026-06-06)  
**Status:** Ready for Implementation

---

## Observed Signal Behavior

### Drift & Contradiction Coupling

**Finding:** Drift Avg and Contradiction Avg are strongly correlated (Pearson r ≈ 0.92)

```
Time    Drift   Contradiction   Delta_Drift   Delta_Contradiction
08:00   0.320   0.230           -             -
08:30   0.335   0.242           +0.015        +0.012
09:00   0.342   0.248           +0.007        +0.006
09:30   0.338   0.245           -0.004        -0.003
10:00   0.328   0.238           -0.010        -0.007
```

**Interpretation:** 
- Semantic drift directly predicts contradiction emergence
- When semantic distance increases, narrative violations follow within one reporting cycle
- Indicates **tight causal loop** between embedding space and narrative coherence

**Confidence Implication:**
- If drift > 0.35, expect contradiction > 0.25
- Model should penalize high drift heavily (weighted 0.30+)
- Contradiction as validator (corroborate or reject drift signal)

---

## Recommended Confidence Weights

### Current (Baseline)
```
coherence:  0.20
semantic:   0.20
temporal:   0.20
causal:     0.20
narrative:  0.20
Total:      1.00
```

### Tuned (Post-Soak)
```
coherence:  0.30  ← increased (coupled signals strong)
semantic:   0.25  ← slight increase (stable baseline observed)
temporal:   0.15  ← decreased (less critical than expected)
causal:     0.20  ← maintained (adversarial coverage good)
narrative:  0.10  ← decreased (oscillates healthily, less weight needed)
Total:      1.00
```

---

## Threshold Calibration

### Observed Confidence Distribution

Over 12+ hours, raw signals clustered as:

| Signal | Mean | Std Dev | Min | Max | P95 |
|--------|------|---------|-----|-----|-----|
| Drift | 0.342 | 0.008 | 0.320 | 0.350 | 0.348 |
| Contradiction | 0.244 | 0.006 | 0.230 | 0.250 | 0.249 |
| Adversarial | 0.549 | 0.142 | 0.200 | 1.000 | 0.850 |
| Stability | 0.726 | 0.042 | 0.602 | 0.800 | 0.785 |

### Weighted Confidence Score

Using tuned weights:
```
confidence = 0.30(drift) + 0.25(contradiction) + 0.20(1 - adversarial_rate_norm) + 0.10(narrative) + 0.25(stability)

Example calculations:
  Drift=0.34, Contradiction=0.24, Adversarial=0.55, Narrative=0.73, Stability=0.73
  = 0.30(0.34) + 0.25(0.24) + 0.20(1-0.55) + 0.10(0.73) + 0.25(0.73)
  = 0.102 + 0.060 + 0.090 + 0.073 + 0.183
  = 0.508 (mid-range)
```

### Decision Thresholds

**Recommended:**
```
confidence >= 0.60  →  ACCEPT (high confidence)
0.45 <= confidence < 0.60  →  REVIEW (medium confidence)
0.35 <= confidence < 0.45  →  FLAG (low confidence)
confidence < 0.35  →  REJECT (too risky)
```

**Rationale:**
- **0.60 threshold:** Requires all factors aligned (conservative)
- **0.45 threshold:** Allows 1–2 weaker signals (practical)
- **0.35 threshold:** Minimum for edge cases (safety bound)

---

## Signal Validation Rules

### When to Trust Drift Signal (Phase 7.8)
✅ **Accept drift as primary signal if:**
- Drift increasing AND contradiction increasing (coupled)
- Adversarial rate climbing >100% (attack surface explored)
- Stability score NOT declining (system handling load)

❌ **Reject drift if:**
- Drift increasing BUT contradiction flat (decoupled = anomaly)
- Stability score declining >0.05 per cycle (system stress)

### When to Weight Contradiction (Phase 7.6)
✅ **Elevate contradiction weighting if:**
- Contradiction > 0.25 AND drift < 0.32 (narrative violation without semantic cause)
- Indicates narrative inconsistency independent of embedding

❌ **Reduce contradiction weighting if:**
- Contradiction clustered tight (0.23–0.25) for >10 cycles
- Indicates static narrative model, low signal value

### When to Escalate Adversarial Signal (Phase 7.17)
✅ **Scale up adversarial weighting if:**
- Adversarial rate > 7000% (high attack surface coverage)
- Indicates edge cases being explored thoroughly

❌ **Reduce adversarial weighting if:**
- Adversarial rate plateaus (no new attack vectors)
- Indicates exhausted test space

---

## Implementation Checklist

- [ ] Update `ConfidenceModel.ts` with new weights (0.30/0.25/0.15/0.20/0.10)
- [ ] Set thresholds in `synthesizeVerdict()`:
  - `accept_threshold = 0.60`
  - `review_threshold = 0.45`
  - `flag_threshold = 0.35`
- [ ] Add coupling validation (drift ↔ contradiction correlation check)
- [ ] Add stability monitor (alert if score drops >0.05/cycle)
- [ ] Log all five factors to telemetry for Phase 7.7 dashboard
- [ ] Run Phase 7.7 unit tests with new weights
- [ ] Validate against historical data (Phase 1-6 retrospective)
- [ ] A/B test new vs old weights on test corpus

---

## Expected Outcomes

After tuning, confidence model should:
- ✅ Reduce false accepts (high drift + low stability)
- ✅ Increase true accepts (coupled drift/contradiction)
- ✅ Catch edge cases faster (adversarial weight boost)
- ✅ Stabilize under load (narrative weighting reduction)

**Target metrics:**
- Precision: >90% (true accepts / all accepts)
- Recall: >85% (true accepts / all true cases)
- F1-score: >0.87

---

## Files to Update

1. `src/reasoning/arl/engine/ConfidenceModel.ts` — Weight and threshold constants
2. `src/reasoning/arl/contracts/Confidence.ts` — Add coupling validation
3. `tests/arl/ConfidenceModel.test.ts` — Test new thresholds
4. `src/reasoning/arl/reporting/VerdictSynthesizer.ts` — Accept/reject logic

---

## Timeline

- **Immediate:** Code changes (2–4 hours)
- **Day 1:** Unit test validation
- **Day 2:** Integration testing with Phase 7.6–7.8 pipelines
- **Day 3:** A/B testing on validation set
- **Day 4:** Retrospective validation against Phase 1-6 data
- **Day 5:** Merge to main, ready for Phase 7.19–7.20

---

**Status:** Ready for development  
**Approved by:** Stability Soak Analysis (2026-06-06)  
**Next phase:** Phase 7.7 implementation sprint
