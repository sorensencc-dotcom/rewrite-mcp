---
title: "SkillOpt Validator Specification"
version: "1.0.0"
date: "2026-05-30"
status: "operational"
audience: "CIC engineering team"
references:
  - "CLAUDE_ANTIGRAVITY_FEDERATION_PROTOCOL.md (v1.0.0)"
  - "CIC_SYSTEM.md (v3.1.0+)"
  - "CIC_MASTER_ROADMAP.md (v2.5.1+)"
---

# SkillOpt Validator Specification

**Version:** 1.0.0  
**Date:** 2026-05-30  
**Status:** Operational  
**Author:** Claude (Agent Authority Mode)

---

## Executive Summary

SkillOpt Validator is an autonomous quality assurance engine that validates extraction, enrichment, and compression skill outputs across the CIC ingestion pipeline. It scores skill performance against four dimensions (accuracy, consistency, efficiency, latency), detects drift, proposes mitigations, and feeds validated telemetry to the Federation Protocol messaging layer.

**Operator Authority:** Validator runs autonomously within SLA constraints and escalates anomalies to Claude for reasoning assistance. All escalations are explicit, auditable, and operator-final.

---

## Architectural Model

### Pipeline Integration

```
INGEST → [Skill Output] → VALIDATOR → [Telemetry + Score] → ENRICH → ...
                                        ↓
                                   Federation Protocol
                                   (Claude + Antigravity)
```

Validator operates **post-skill, pre-downstream** on all pipeline stages:
- **INGEST:** Document ingestion quality
- **ENRICH:** Extraction/enrichment output quality
- **COMPRESS:** Compression lossiness, token efficiency
- **ORCHESTRATE:** Coordination quality (post-launch)
- **SYNTHESIZE:** Narrative synthesis coherence (post-launch)

### Validator Architecture

```
Input
  ↓
[Assess] → Accuracy / Consistency / Efficiency / Latency
  ↓
[Score] → Aggregate score (0–100) + dimension breakdown
  ↓
[Drift Detect] → Compare to baseline + thresholds
  ↓
[Propose] → Claude reasoning request (if anomaly)
  ↓
[Emit Telemetry] → Federation Protocol message
```

---

## Scoring Model

### Dimensions

#### 1. **Accuracy** (0–100)
Measures whether skill output is correct/useful.

**For extractors (ImageAnalyzerV2, text extractors):**
- Compare extracted data against ground truth (manual samples, prior runs)
- Metric: F1 score on key fields (confidence ≥0.85 gates passage)
- Missing ground truth: Use consistency as proxy

**For enrichers:**
- Compare enriched output against reference data (knowledge bases, historical runs)
- Metric: Entity match rate, semantic similarity (cosine ≥0.75)

**For compressors:**
- Measure information retention: key concepts preserved, no hallucination
- Metric: ROUGE-L score (compress → decompress → compare to original; ≥0.80)

**Threshold:** Accuracy < 0.75 → Yellow flag; < 0.65 → Red flag (escalate)

---

#### 2. **Consistency** (0–100)
Measures whether skill produces deterministic, repeatable output.

**Definition:** Same input → same output (within floating-point epsilon)

**Implementation:**
- Rerun 10% of batch on extracted items
- Measure output divergence:
  - Extractors: Bit-for-bit identical (100) or field-level variance (<5% divergence per field)
  - Enrichers: Semantic equivalence (embedding cosine distance <0.05)
  - Compressors: Token count variance ≤2%

**Threshold:** Consistency < 0.85 → Yellow flag; < 0.70 → Red flag (escalate)

---

#### 3. **Efficiency** (0–100)
Measures token cost and compute time relative to baseline.

**Token Efficiency:**
- Baseline: Historical median tokens-per-item for skill
- Current: Observed tokens-per-item
- Score: `100 * (baseline / current)` clamped to [0, 150]
- Threshold: Efficiency < 80 (>25% token overage) → Yellow flag; < 60 (>67% overage) → Red flag

**Compute Efficiency:**
- Baseline: Historical median latency-per-item
- Current: Observed latency-per-item
- Score: `100 * (baseline / current)` clamped to [0, 150]
- Threshold: Latency > 2σ from baseline → Yellow flag; > 3σ → Red flag

**Aggregate:** `(token_eff + latency_eff) / 2`

---

#### 4. **Latency** (0–100)
Measures wall-clock time per item.

**Metric:** p50, p95, p99 latency (ms/item)

**Baseline:** Historical percentiles

**Score:**
- p50 within baseline: 100
- p50 +10%: 90
- p50 +25%: 70
- p50 +50%: 40
- p50 >50%: 0

**Threshold:** p95 > baseline p99 → Yellow flag; p50 > baseline p95 → Red flag

---

### Aggregate Score

```
aggregate = 0.30 * accuracy
          + 0.25 * consistency
          + 0.25 * efficiency
          + 0.20 * latency
```

**Thresholds:**
- **Green (≥80):** Skill performing nominally; no action
- **Yellow (60–79):** Skill degraded; monitor closely; Claude proposes mitigation
- **Red (<60):** Skill failed; automatic escalation to Claude + operator

---

## Drift Detection

### Drift Triggers

Drift is detected when:

1. **Score drops >5 percentage points** since last baseline (rolling window: 7 days)
2. **Any dimension scores <0.70** two consecutive batches
3. **Cost spike >10%** vs. baseline
4. **Latency spike >2σ** from moving average
5. **Consistency variance >15%** across repeating runs

### Baseline Management

- **Initial baseline:** First 100 items (manually verified)
- **Rolling baseline:** Update every 1,000 items if no drift detected
- **Drift baseline:** If drift detected, freeze baseline until mitigation confirmed

---

## Telemetry Message Format (Federation Protocol)

```json
{
  "message_type": "validator_telemetry",
  "timestamp": "2026-05-30T14:30:15Z",
  "federation_version": "1.0.0",
  "skill_id": "ImageAnalyzerV2@2.0.0",
  "pipeline_stage": "ENRICH",
  "batch_id": "batch_12345",
  "batch_size": 50,
  "scores": {
    "accuracy": 82,
    "consistency": 88,
    "efficiency": 75,
    "latency": 92,
    "aggregate": 81
  },
  "status": "green|yellow|red",
  "drift_detected": false,
  "dimensions_at_risk": [],
  "cost_summary": {
    "total_tokens": 45000,
    "baseline_tokens": 42000,
    "variance_percent": 7.1
  },
  "latency_summary": {
    "p50_ms": 145,
    "p95_ms": 310,
    "p99_ms": 450,
    "baseline_p50_ms": 140
  },
  "anomalies": [],
  "proposed_actions": [],
  "escalation_trigger": false,
  "escalation_reason": null
}
```

---

## Escalation Protocol

### Yellow Flag Escalation

**Trigger:** Any dimension scores 60–79, or drift detected without root cause.

**Action:**
1. Emit telemetry to Federation Protocol with `status: "yellow"`
2. Include `proposed_actions` array with Claude-generated suggestions:
   - "Rerun extractor on 20-item sample to verify consistency"
   - "Check input data for anomalies (e.g., corrupted files)"
   - "Compare token usage against recent commits"
   - "Profile latency hotspots"
3. Wait for Claude reasoning response (SLA: <5s)
4. Operator acknowledges or overrides mitigations

### Red Flag Escalation

**Trigger:** Any dimension scores <60, or two consecutive yellow flags.

**Action:**
1. Halt downstream processing for that skill
2. Emit telemetry with `status: "red"` and `escalation_trigger: true`
3. Include detailed anomaly logs
4. Claude generates reasoning + recovery plan
5. Operator approval required to resume (explicit sign-off)

**SLA:** Operator response within 15 minutes (if unattended, skill halts until manual review)

---

## Implementation Spec

### Technology Stack

- **Language:** ESM JavaScript (Node.js 20+)
- **Testing:** Vitest (unit, integration)
- **Metrics storage:** Qdrant (vector DB for baselines + embeddings)
- **Claude integration:** @anthropic-ai/sdk (reasoning requests)
- **Schema:** JSON (Federation Protocol compliance)

### Core Modules

#### 1. `AssessmentEngine.js`
Computes accuracy, consistency, efficiency, latency scores for a batch.

**Exports:**
```javascript
export async function assessBatch(skillOutput, groundTruth, baseline) {
  return {
    accuracy: number,      // 0–100
    consistency: number,   // 0–100
    efficiency: number,    // 0–100
    latency: number,       // 0–100
    details: {
      accuracy_metric: string,
      consistency_variance: number,
      efficiency_ratio: number,
      latency_percentiles: { p50, p95, p99 }
    }
  }
}
```

#### 2. `ScoringEngine.js`
Aggregates dimension scores; applies thresholds.

**Exports:**
```javascript
export function computeAggregateScore(dimensions) {
  // Returns { aggregate: 0–100, status: "green|yellow|red" }
}

export function detectDrift(current, baseline, history) {
  // Returns { driftDetected: boolean, triggers: string[] }
}
```

#### 3. `TelemetryEmitter.js`
Formats and sends telemetry to Federation Protocol endpoint.

**Exports:**
```javascript
export async function emitTelemetry(payload, federationClient) {
  // Validates against Federation Protocol schema
  // Sends to message queue or endpoint
  // Returns acknowledgment + message_id
}
```

#### 4. `EscalationManager.js`
Handles yellow/red flag escalations; coordinates Claude reasoning requests.

**Exports:**
```javascript
export async function escalateToClausde(
  telemetry,
  skillId,
  anomalyDetails,
  claudeClient
) {
  // Formats reasoning request
  // Calls Claude with Federation Protocol context
  // Returns { proposed_actions, reasoning, confidence }
}
```

#### 5. `BaselineManager.js`
Maintains rolling baselines; detects drift from historical data.

**Exports:**
```javascript
export async function loadBaseline(skillId, qdrantClient) {
  // Returns { accuracy_baseline, efficiency_baseline, ... }
}

export async function updateBaseline(skillId, scores, qdrantClient) {
  // Stores new baseline if no drift; freezes if drift detected
}
```

### Integration Points

1. **Ingestion Pipeline:** Validator runs post-extraction, pre-enrichment
   - Input: Raw extracted data + skill metadata
   - Output: Telemetry + score + passthrough data (no blocking)

2. **Federation Protocol:** Emits to message layer
   - Telemetry is consumed by Claude + Antigravity agents
   - Escalations trigger Claude reasoning requests

3. **SkillRegistry:** References skill metadata (version, baseline thresholds)
   - On skill update, Validator resets baseline (requires manual verification)

4. **Governance Agents:**
   - **TokenEconomyAgent:** Consumes efficiency scores; flags token overages
   - **SecuritySentinelAgent:** Monitors accuracy (adversarial drift detection)
   - **AuditAgent:** Aggregates telemetry for compliance (audit.confidence ≥0.92)

---

## Error Handling

### Validator Failures (Non-Blocking)

If Validator crashes or times out:
1. Log error with full context (batch_id, skill_id, error trace)
2. Emit fallback telemetry: `status: "unknown"`, `error: true`, `escalation_trigger: true`
3. Continue downstream processing (data passes through unvalidated)
4. Operator is notified of validation gap

### Ground Truth Unavailable

If no ground truth for accuracy assessment:
1. Score accuracy as `null` (dimension dropped from aggregate)
2. Reweight aggregate: `(consistency + efficiency + latency) / 3`
3. Flag in telemetry: `accuracy_assessment: "unavailable"`
4. Log request for manual ground truth curation

### Baseline Exhaustion

If not enough historical data for baseline (e.g., first run of new skill):
1. Use industry defaults or skill author's declared baselines
2. Collect 100+ samples before declaring drift
3. Mark validator confidence as `"provisional"` until baseline mature

---

## SLAs

| Activity | SLA | Owner |
|----------|-----|-------|
| Assessment (per batch) | <500ms | Validator Engine |
| Drift detection | <100ms | ScoringEngine |
| Telemetry emit | <200ms | TelemetryEmitter |
| Claude reasoning response | <5s | Claude (Federation Protocol) |
| Operator escalation response | <15min | Operator (red flags only) |
| Memory sync (shared baseline) | Every 30s | BaselineManager |

---

## Deployment & Verification

### Pre-Launch Checklist

- [ ] AssessmentEngine: All dimension scorers pass vitest (100% coverage)
- [ ] ScoringEngine: Aggregate logic tested with known inputs
- [ ] TelemetryEmitter: Validates against Federation Protocol schema
- [ ] EscalationManager: Claude integration tested with mocked responses
- [ ] BaselineManager: Qdrant connectivity verified; schema initialized
- [ ] E2E: Full batch (50 items) flows from Validator → Federation Protocol → telemetry storage
- [ ] Documentation: All exports documented; error codes enumerated
- [ ] Performance: Validator adds <1s latency per batch of 50 items

### Post-Launch Validation (First 500 items)

1. Monitor telemetry for anomaly patterns
2. Manually verify 5 red-flag escalations for false-positive rate
3. Confirm Claude reasoning requests are formatted correctly
4. Validate baseline convergence (coefficient of variation <10%)
5. Audit token cost vs. projected efficiency scores

---

## Future Extensions (Post-v1.0)

- **SkillOpt Optimizer:** Automatically retune skill parameters based on Validator scores
- **Playbook Evolution:** Use Validator telemetry to reorder pipeline stages for optimal throughput
- **Multi-Skill Coordination:** Detect downstream cascading failures (e.g., enricher quality drops due to extractor drift)
- **Anomaly Explanation:** Claude-powered root-cause analysis for Red flags

---

## Document Control

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 1.0.0 | 2026-05-30 | Operational | Initial release; ready for implementation |

**Lock:** This specification is locked for reference. Changes require version bump + operator approval.
