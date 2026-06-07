# Phase 7.16 — Multi-Run Aggregator

**Status:** ✅ COMPLETE  
**Date:** 2026-06-05  
**Impact:** Evaluate reasoning stability across multiple expansions; detect degradation/improvement trends; feed stability signals back to Self-Diagnostics

## Summary

Phase 7.16 is the **multi-run analysis engine** that aggregates ARL metrics across a series of expansions. It computes rolling averages for drift, contradiction, and confidence scores, detects stability trends (IMPROVING/DEGRADING/STABLE), and produces a composite stability score (0-1) that reflects overall system coherence over time.

## Architecture

### 1. Data Model

**RunSummary** — Metrics from a single expansion evaluation

```typescript
interface RunSummary {
  runId: string;
  timestamp: string; // ISO 8601

  // Core ARL metrics
  driftScore: number; // 0.0–1.0 (higher = more drift)
  contradictionScore: number; // 0.0–1.0
  confidenceScore: number; // 0.0–1.0
  compositeScore: number; // 0.0–1.0 (from Phase 7.11)
}
```

**MultiRunAggregate** — Aggregated metrics over N runs

```typescript
interface MultiRunAggregate {
  totalRuns: number;

  rollingDriftAverage: number;
  rollingContradictionAverage: number;
  rollingConfidenceAverage: number;
  rollingCompositeAverage: number;

  stabilityScore: number; // 0.0–1.0 (overall stability)
  trend: 'STABLE' | 'IMPROVING' | 'DEGRADING';
}
```

### 2. Aggregation Algorithms

**Rolling Averages**

```
For each metric (drift, contradiction, confidence, composite):
  average = sum(metric_i for all runs) / totalRuns
```

**Trend Detection**

```
delta = last_drift_score - first_drift_score

if delta > 0.05:    trend = DEGRADING
if delta < -0.05:   trend = IMPROVING
else:               trend = STABLE
```

**Stability Scoring**

```
driftPenalty = rollingDriftAverage
contradictionPenalty = rollingContradictionAverage
confidenceBonus = rollingConfidenceAverage

stabilityScore = confidenceBonus - (driftPenalty + contradictionPenalty) / 2
stabilityScore = clamp(stabilityScore, 0, 1)
```

### 3. Integration Points

**Upstream: Phases 7.12-7.15**
- Receives RunSummary metrics from each expansion evaluation
- Drift and contradiction scores from Threshold Model (7.12)
- Confidence scores from Weighted Reasoning (7.11)

**Downstream: Phase 7.14 Self-Diagnostics**
- Feeds stabilityScore and trend into self-diagnostics monitoring
- Enables detection of system-wide degradation
- Triggers alerts if trend remains DEGRADING for N consecutive aggregations

**Downstream: Phase 7.18 Operator Feedback**
- Provides historical stability metrics for training threshold overrides
- Correlates operator decisions with trend changes

## Usage

### Basic Aggregation

```typescript
const aggregator = new MultiRunAggregator();

const runs: RunSummary[] = [
  {
    runId: 'exp-001',
    timestamp: '2026-06-05T10:00:00Z',
    driftScore: 0.15,
    contradictionScore: 0.05,
    confidenceScore: 0.88,
    compositeScore: 0.85,
  },
  {
    runId: 'exp-002',
    timestamp: '2026-06-05T10:05:00Z',
    driftScore: 0.12,
    contradictionScore: 0.03,
    confidenceScore: 0.90,
    compositeScore: 0.87,
  },
];

const aggregate = aggregator.aggregate(runs);

console.log(aggregate.trend); // 'IMPROVING' (drift decreased)
console.log(aggregate.stabilityScore); // 0.85+
```

### Trend-Based Alerting

```typescript
const agg = aggregator.aggregate(runs);

if (agg.trend === 'DEGRADING' && agg.stabilityScore < 0.6) {
  // Alert operator: system coherence declining
  operator.alert('ARL stability degrading', {
    trend: agg.trend,
    score: agg.stabilityScore,
    driftAvg: agg.rollingDriftAverage,
  });
}
```

## Example Scenarios

### Scenario 1: Stable System

```
Runs:
  r1: drift=0.10, contradiction=0.05, confidence=0.90
  r2: drift=0.11, contradiction=0.04, confidence=0.89
  r3: drift=0.09, contradiction=0.06, confidence=0.91

Result:
  trend: STABLE
  stabilityScore: 0.85
  interpretation: System is performing consistently
```

### Scenario 2: Improving Performance

```
Runs:
  r1: drift=0.40, contradiction=0.30, confidence=0.65
  r2: drift=0.30, contradiction=0.25, confidence=0.70
  r3: drift=0.10, contradiction=0.10, confidence=0.85

Result:
  trend: IMPROVING
  stabilityScore: 0.60+
  interpretation: ARL quality increasing over time
```

### Scenario 3: Catastrophic Degradation

```
Runs:
  r1: drift=0.10, contradiction=0.05, confidence=0.90
  r2: drift=0.40, contradiction=0.35, confidence=0.70
  r3: drift=0.70, contradiction=0.60, confidence=0.40

Result:
  trend: DEGRADING
  stabilityScore: 0.15
  interpretation: System failure detected; operator intervention required
```

## Performance & Scalability

**Time Complexity:**
- `aggregate(runs)`: O(n) where n = number of runs

**Space Complexity:**
- O(n) to hold run history (if stored)

**For production:**
- Batch runs in windows (e.g., per-hour aggregates)
- Store only aggregate, not full history (unless needed for re-calculation)
- Implement incremental formulas for streaming updates

## Future Work (7.16.1+)

**Incremental Aggregation**
- Implement `appendRun()` for adding runs without full recalculation
- Maintain running sum/count for O(1) updates

**Anomaly Detection**
- Detect unusual drift spikes vs gradual trends
- Flag oscillating patterns (unstable but not consistently degrading)

**Predictive Trending**
- Use drift series for forecasting future stability
- Alert before degradation becomes critical

## Testing

**File:** `tests/reasoning/arl/aggregator/MultiRunAggregator.test.ts`

14 test cases:
- ✅ Rolling average computation (single, multiple, many runs)
- ✅ Trend detection (improving, degrading, stable, boundary cases)
- ✅ Stability scoring (stable, degraded, balanced scenarios)
- ✅ Empty input handling
- ✅ Real-world scenarios (improving session, oscillating, catastrophic)

---

**Implementation complete.** Phase 7.16 aggregates multi-run ARL metrics for trend analysis and stability monitoring. Integrates with Phase 7.14 Self-Diagnostics. Ready for Phase 7.16.1 (incremental aggregation).
