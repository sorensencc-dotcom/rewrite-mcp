# Phase 7.14 — ARL Self-Diagnostics

**Status:** ✅ COMPLETE  
**Date:** 2026-06-05  
**Impact:** ARL monitors itself — detects subsystem degradation, drift instability, weighting drift, and threshold miscalibration

## Summary

Phase 7.14 adds comprehensive self-monitoring to ARL. The system tracks health of all 5 reasoning subsystems, analyzes drift stability (including meta-drift), validates weighting consistency, and evaluates threshold calibration. A **Reasoning Integrity Score** (0-1) aggregates all diagnostics, enabling CIC to detect when ARL itself needs recalibration.

## Architecture

### 1. Subsystem Health Checks

**File:** `projects/cic/ingestion/src/reasoning/arl/diagnostics/ArlSelfDiagnostics.ts`

Monitors health of each ARL subsystem (coherence, semantic, temporal, causal, narrative):

```typescript
interface SubsystemHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'critical';
  score: number; // 0-1 composite
  lastCheck: Date;
  issues?: string[];
}
```

**Health checks:**
- **Low average score** (<0.65) → degraded
- **High variance** (std dev >0.25) → inconsistent, degraded
- **Deteriorating trend** (recent < older - 0.05) → negative drift, degraded

**Status mapping:**
- `healthy`: All checks pass (score 1.0)
- `degraded`: One or more issues (score 0.5-0.9)
- `critical`: Multiple issues or very low score (score <0.5)

### 2. Drift Analysis

Monitors drift magnitude stability and meta-drift (is drift itself changing?):

```typescript
interface DriftAnalysis {
  currentDrift: number;           // Mean of last 20 measurements
  driftOfDrift: number;           // Std dev of drift values
  driftTrend: 'stable' | 'increasing' | 'decreasing';
  seasonality: boolean;           // Periodic pattern?
  anomalies: Array<Anomaly>;     // Values > 2σ from mean
}
```

**Trend detection:**
- Compare first 50% vs. second 50% of drift values
- `increasing`: Second half mean > first half mean + 0.05
- `decreasing`: Second half mean < first half mean - 0.05
- `stable`: Otherwise

**Anomaly detection:**
- Values > 2 standard deviations from drift mean
- Example: Drift spikes during expansion operations

**Seasonality detection:**
- Autocorrelation at 24-interval (if 100+ samples)
- Correlation > 0.6 indicates periodic pattern
- Example: Higher drift during certain operation types

### 3. Weighting Validation

Ensures learned weights haven't drifted from expected values:

```typescript
interface WeightingValidation {
  status: 'valid' | 'drifted' | 'invalid';
  expectedWeights: ArlWeights;
  actualWeights: ArlWeights;
  deviations: Record<string, number>;
  maxDeviation: number;
  threshold: number; // 0.05 (5% allowed deviation)
}
```

**Status:**
- `valid`: Max deviation < 0.05
- `drifted`: Max deviation 0.05-0.10
- `invalid`: Max deviation > 0.10 (requires recalibration)

### 4. Threshold Calibration

Analyzes if thresholds are well-tuned by tracking operator overrides:

```typescript
interface ThresholdQuality {
  threshold: number;
  appropriateness: 'too_low' | 'optimal' | 'too_high';
  evidence: string;
  overrideRate: number; // % of escalations overridden
  falsePositiveRate: number;
}
```

**Calibration logic:**
- **Override rate > 50%**: Threshold too strict (too_low) → many false positives
- **Override rate 10-50%**: Optimal range
- **Override rate < 10%**: Threshold too lenient (too_high) → missing real issues

### 5. Reasoning Integrity Score

Composite score aggregating all diagnostics:

```typescript
interface ReasoningIntegrityScore {
  overall: number;                 // 0-1 composite
  subsystemHealth: number;         // 0-1
  driftStability: number;          // 0-1
  weightingConsistency: number;    // 0-1
  contradictionDetection: number;  // 0-1
  timestamp: Date;
  issues: string[];
  recommendations: string[];
}
```

**Weights:**
- Subsystem health: 30%
- Drift stability: 25%
- Weighting consistency: 25%
- Contradiction detection: 20%

**Thresholds:**
- **EXCELLENT** (≥0.90): All systems nominal
- **GOOD** (0.75-0.89): Minor issues, no action needed
- **FAIR** (0.60-0.74): Notable issues, review recommended
- **POOR** (<0.60): Critical issues, immediate review required

## Usage

### Run Diagnostics

```typescript
const diagnostics = new ArlSelfDiagnostics();

// Record metrics as ARL operates
diagnostics.recordSubsystemScore('coherence', 0.85);
diagnostics.recordDrift(0.15);
diagnostics.recordThresholdDecision('E003_drift_too_high', true, false);

// Run comprehensive diagnostic
const report = diagnostics.runDiagnostics();

console.log(report.reasoningIntegrity.overall);  // 0.87
console.log(report.summary);                      // "✅ EXCELLENT..."
console.log(report.reasoningIntegrity.issues);   // []
```

### Interpret Results

**Subsystem health degradation:**
```typescript
const report = diagnostics.runDiagnostics();
report.subsystemHealthChecks.forEach((subsystem) => {
  if (subsystem.status === 'degraded' || subsystem.status === 'critical') {
    console.log(`⚠️ ${subsystem.name}: ${subsystem.issues}`);
  }
});
```

**Drift trend analysis:**
```typescript
if (report.driftAnalysis.driftTrend === 'increasing') {
  console.log('🔴 Drift is increasing — investigate source');
}

if (report.driftAnalysis.seasonality) {
  console.log('📊 Seasonal pattern detected — may be normal');
}
```

**Threshold calibration:**
```typescript
const composite = report.thresholdCalibration.compositeReasoningMin;
if (composite.appropriateness === 'too_low') {
  console.log('⚠️ Composite reasoning threshold too strict');
  console.log(`   Override rate: ${(composite.overrideRate * 100).toFixed(1)}%`);
}
```

### Act on Issues

```typescript
const integrity = report.reasoningIntegrity;

if (integrity.overall < 0.6) {
  // CRITICAL: Escalate to operator immediately
  console.log('🚨 CRITICAL ARL ISSUES:');
  integrity.issues.forEach((issue) => console.log(`  - ${issue}`));
  integrity.recommendations.forEach((rec) => console.log(`  → ${rec}`));
  
  // Potentially pause expansion operations
  // Trigger maintenance protocols
} else if (integrity.overall < 0.75) {
  // WARNING: Schedule review, monitor closely
  console.log('⚠️ ARL ISSUES DETECTED:');
  integrity.recommendations.forEach((rec) => console.log(`  → ${rec}`));
}
```

## Example Scenarios

### Scenario 1: Healthy ARL

```
Subsystem Health:
  ✓ coherence: HEALTHY (0.92)
  ✓ semantic: HEALTHY (0.89)
  ✓ temporal: HEALTHY (0.91)
  ✓ causal: HEALTHY (0.88)
  ✓ narrative: HEALTHY (0.90)

Drift Analysis:
  Current: 0.15 (stable)
  Trend: stable
  Seasonality: no
  Anomalies: 0

Weighting: VALID (max deviation: 0.02)

Threshold Calibration:
  ✓ Composite: optimal (30% override rate)
  ✓ Confidence: optimal (28% override rate)
  ✓ Drift: optimal (25% override rate)
  ✓ Contradiction: optimal (32% override rate)

Reasoning Integrity: 0.92 (EXCELLENT)
→ "All systems nominal"
```

### Scenario 2: Increasing Drift

```
Drift Analysis:
  Current: 0.22 → was 0.15
  Trend: INCREASING
  Anomalies: 2 detected

Reasoning Integrity: 0.73 (FAIR)
Issues:
  - Drift magnitude is increasing
  - 2 drift anomalies detected
Recommendations:
  - Investigate source of increasing drift
  - Check for new data patterns or expansion types
```

### Scenario 3: Subsystem Degradation

```
Subsystem Health:
  ✓ coherence: HEALTHY (0.91)
  ⚠️ semantic: DEGRADED (0.58)
     Issue: Low average score (0.58)
     Issue: High variance (0.28)
  ✓ temporal: HEALTHY (0.87)
  ⚠️ causal: DEGRADED (0.52)
     Issue: Deteriorating trend

Reasoning Integrity: 0.68 (FAIR)
Recommendations:
  - Review semantic subsystem for semantic drift
  - Investigate causal subsystem deterioration
```

### Scenario 4: Threshold Miscalibration

```
Threshold Calibration:
  ⚠️ Composite: TOO_LOW (override rate: 68%)
     → Too many false escalations
     → Recommendation: Increase threshold to 0.80
  ✓ Confidence: OPTIMAL (35% override rate)
  ✓ Drift: OPTIMAL (28% override rate)
  ✓ Contradiction: OPTIMAL (31% override rate)

Reasoning Integrity: 0.76 (GOOD)
Recommendation:
  - Consider relaxing Composite Reasoning threshold
```

## Integration Points

### Upstream: Phases 7.11-7.13
- Consumes subsystem scores from Phase 7.11
- Monitors threshold decisions from Phase 7.13
- Detects if governance rules are over/under-escalating

### Downstream: Phase 7.18 (Operator Feedback)
- Receives operator override feedback
- Uses override patterns to calibrate thresholds

### Downstream: Phase 7.20 (Stability Plane v2)
- Reasoning Integrity Score visualized in operator dashboard
- Subsystem health trends charted over time
- Drift and threshold calibration metrics displayed

## Scalability

**Memory usage:** O(n) where n = number of recorded measurements
- Subsystem scores: 1000 per subsystem
- Drift history: 500 measurements
- Threshold tracking: ~10 reject codes

**Computation:** O(n) only during runDiagnostics()
- Subsystem health: O(1000)
- Drift analysis: O(500)
- Weighting: O(5)
- Threshold calibration: O(10)

**For production scaling:**
- Archive old measurements to external store (S3, database)
- Compute rolling statistics on sliding window
- Run diagnostics on configurable schedule (hourly, daily, weekly)

## Testing

**File:** `projects/cic/ingestion/tests/reasoning/arl/diagnostics/ArlSelfDiagnostics.test.ts`

50+ test cases covering:
- ✅ Subsystem health checks (low scores, high variance, degrading trends)
- ✅ Drift analysis (increasing/decreasing trends, anomalies, seasonality)
- ✅ Weighting validation
- ✅ Threshold calibration (too strict, too lenient, optimal)
- ✅ Reasoning Integrity Score (excellent/good/fair/poor)
- ✅ Real-world scenarios (healthy production, gradual degradation)

---

**Implementation complete.** Phase 7.14 enables ARL to monitor itself. CIC can now detect subsystem degradation, drift instability, weighting drift, and threshold miscalibration. Ready for Phase 7.18 (Operator Feedback) and Phase 7.20 (Stability Plane visualization).
