# SkillOpt Validator — Deployment & Usage Guide

**Version:** 1.0.0  
**Date:** 2026-05-30  
**Status:** Production-ready

---

## Overview

SkillOpt Validator is an autonomous quality assurance engine for the CIC ingestion pipeline. It evaluates extraction, enrichment, and compression skill outputs across four dimensions (accuracy, consistency, efficiency, latency), detects performance drift, escalates anomalies to Claude for root-cause diagnosis, and feeds structured telemetry to the Federation Protocol.

**Key Features:**
- Four-dimensional scoring (accuracy, consistency, efficiency, latency)
- Autonomous drift detection with 5 independent triggers
- Yellow/red flag escalation with Claude reasoning integration
- Rolling baseline management with Qdrant vector DB persistence
- Federation Protocol-compliant telemetry emission
- Zero silent failures; complete error handling & logging

---

## Architecture

```
INGEST → [Skill Output] → VALIDATOR → [Telemetry] → ENRICH → ... → SYNTHESIZE → AUDIT
                          ↓
                    Governance Agents
                    (Token, Security, Audit)
```

### Module Structure

| Module | Responsibility | Key Exports |
|--------|-----------------|-------------|
| **AssessmentEngine.js** | Compute 4D scores from skill output | `assessBatch()`, `computeConsistency()` |
| **ScoringEngine.js** | Aggregate scores, detect drift, determine escalation | `computeAggregateScore()`, `detectDrift()` |
| **TelemetryEmitter.js** | Build & emit Federation Protocol messages | `buildTelemetry()`, `emitTelemetry()` |
| **EscalationManager.js** | Escalate to Claude, format notifications | `escalateToClause()`, `determineEscalationAction()` |
| **BaselineManager.js** | Load, update, persist baselines; compute percentiles | `loadBaseline()`, `updateBaseline()` |
| **index.js** | Central exports + orchestrator | `validateSkillOutput()` |

---

## Installation

### Prerequisites
- Node.js 20+
- `@anthropic-ai/sdk` (Claude API client)
- `uuid` package
- Qdrant vector DB (for baseline persistence)
- Vitest (for testing)

### Setup

```bash
cd src/validators

# Install dependencies
npm install

# Run tests
npm run test

# Verify all tests pass
npm run test:coverage
```

---

## Quick Start

### 1. Initialize Baseline

Before validation begins, load or create a baseline for your skill:

```javascript
import { loadBaseline } from './validators/index.js';
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333'
});

// Load (or create if new)
const baseline = await loadBaseline('ImageAnalyzerV2@2.0.0', qdrantClient);
console.log(`Baseline status: ${baseline.status} (${baseline.sampleCount} samples)`);
```

### 2. Validate a Batch

```javascript
import { validateSkillOutput } from './validators/index.js';
import Anthropic from '@anthropic-ai/sdk';

const skillOutput = {
  fields: { title: 'Document', author: 'John Doe', date: '2026-05-30' },
  confidence: { title: 0.95, author: 0.87, date: 0.92 },
  tokens_used: 1500,
  latency_ms: 145
};

const groundTruth = {
  fields: { title: 'Document', author: 'Jane Doe', date: '2026-05-30' }
};

const result = await validateSkillOutput({
  skillOutput,
  groundTruth,
  baseline,
  batchId: 'batch_12345',
  batchSize: 50,
  skillId: 'ImageAnalyzerV2@2.0.0',
  pipelineStage: 'ENRICH',
  options: {
    assessmentOptions: { skillType: 'extractor', batchSize: 50 },
    skipEscalation: false
  },
  emitterClient: createEmitterClient('http', {
    endpoint: process.env.FEDERATION_ENDPOINT || 'http://localhost:3000/telemetry'
  }),
  qdrantClient,
  claudeClient: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
});

// Returns:
// {
//   success: true,
//   assessment: { accuracy, consistency, efficiency, latency, details },
//   scoring: { aggregate, status, weighted_breakdown },
//   drift: { driftDetected, triggers, severity },
//   telemetry: { Federation Protocol message },
//   emission: { message_id, acknowledged },
//   escalation: { proposed_actions, confidence, reasoning } (if needed),
//   baseline_update: { updated, newBaseline, sampleCount }
// }
```

### 3. Handle Escalations

When `status` is yellow or red, escalation happens automatically:

```javascript
const result = await validateSkillOutput(config);

if (result.escalation) {
  console.log('Escalation triggered:');
  console.log(`  Root cause: ${result.escalation.reasoning}`);
  console.log(`  Confidence: ${result.escalation.confidence}%`);
  console.log(`  Proposed actions: ${result.escalation.proposed_actions.join(', ')}`);
}
```

---

## Scoring Model

### Four Dimensions

**Accuracy** (30% weight)
- **Extractor:** F1 score on field-level extraction (gates on confidence ≥ 0.85)
- **Enricher:** Semantic similarity (embedding distance)
- **Compressor:** ROUGE-L approximation; penalizes aggressive compression (>50% loss) to 40, detects hallucination (novel words >20%)
- **Null ground truth:** Accuracy scored as null; other dimensions reweighted

**Consistency** (25% weight)
- Variance of repeated runs on same input
- Field-level embedding distance variance
- Token count variance across repeats

**Efficiency** (25% weight)
- Token ratio: `(baseline_tokens - current_tokens) / baseline_tokens * 100`
- 0 = baseline, 100 = optimal, negative = degraded

**Latency** (20% weight)
- p50 latency percentile
- Compared to baseline p50
- Penalizes degradation >20% from baseline

### Thresholds & Status

| Status | Score | Action |
|--------|-------|--------|
| **Green** | ≥80 | Continue normally |
| **Yellow** | 60–79 | Trigger Claude reasoning; continue if confidence ≥75%, else pause |
| **Red** | <60 | Halt skill; require operator approval (SLA: 15 min) |

---

## Drift Detection

Validator detects drift via 5 independent triggers:

1. **Score drop >5pp** from baseline
2. **Single dimension <70** for 2 consecutive batches
3. **Cost spike >10%** (tokens vs. baseline)
4. **Latency >2σ** above baseline
5. **Consistency variance >15%** within batch

When drift is detected:
- Baseline is **frozen** (update blocked until manual investigation)
- Telemetry includes `drift_detected: true` + trigger list
- Escalation triggered (yellow or red depending on score)

---

## Baseline Management

### Lifecycle

1. **Provisional** (0–99 samples)
   - Uses industry defaults or skill author baselines
   - Baseline updates proceed normally
   - Recommendations: "Collect 100+ samples before relying on rolling baseline"

2. **Mature** (100+ samples, no drift)
   - Baseline stable; rolling average active
   - Full drift detection sensitivity enabled
   - Can be frozen if drift detected

3. **Frozen** (drift detected)
   - No baseline updates until drift resolved
   - Manual investigation required
   - Contact on-call engineer

### Baseline Reset

When a skill is updated:

```javascript
import { resetBaseline } from './validators/index.js';

await resetBaseline('ImageAnalyzerV2@2.0.1', qdrantClient);
// Baseline resets to provisional (0 samples)
// Must re-collect 100+ samples before mature again
```

### Export Baseline for Audit

```javascript
import { exportBaseline } from './validators/index.js';

const export = await exportBaseline('ImageAnalyzerV2@2.0.0', qdrantClient);
// {
//   baseline: { accuracy, consistency, efficiency, latency, aggregate },
//   latency_percentiles: { p50_ms, p95_ms, p99_ms },
//   maturity: 'mature' | 'provisional',
//   sample_count: 125,
//   recommendations: [...]
// }
```

---

## Escalation Protocol

### Yellow Flag (60–79 score)
- **SLA:** 5 minutes
- **Action:** Claude reasoning requested
- **Logic:**
  - If confidence ≥75%: **CONTINUE** (skill runs; actions logged)
  - If 50%–74% confidence: **PAUSE** (require operator validation)
  - If <50% confidence: **HALT** (require operator approval)

### Red Flag (<60 score)
- **SLA:** 15 minutes
- **Action:** Skill **halted immediately**
- **Logic:** Always requires operator approval
- **Escalation flow:**
  1. Skill paused
  2. Telemetry sent
  3. Claude reasoning requested
  4. Operator notified with root-cause hypothesis + proposed actions
  5. Operator approves resumption or adjusts skill parameters

### Claude Reasoning

Escalation request includes:
- Dimension scores (accuracy, consistency, efficiency, latency)
- Drift triggers
- Cost impact (token variance %)
- Latency impact (p50, p95 variance)
- Anomalies detected

Claude returns (JSON):
```json
{
  "root_cause_hypothesis": "string",
  "evidence": ["string"],
  "actions": [
    {
      "action": "string",
      "rationale": "string",
      "estimated_improvement_percent": number
    }
  ],
  "confidence": 0-100
}
```

### Operator Notification

```
🚨 SkillOpt Validator Escalation

Skill: ImageAnalyzerV2@2.0.0
Stage: ENRICH
Batch: batch_12345 (50 items)

Score: 55/100
- Accuracy: 42
- Consistency: 65
- Efficiency: 50
- Latency: 72

Root Cause (Claude):
Aggressive batch compression combined with low ground-truth confidence threshold.

Confidence: 85%

Proposed Actions:
1. Increase confidence gate to 0.92
2. Reduce compression ratio to <40%
3. Re-baseline after 50 clean samples

System Action: HALT
Reason: Red flag escalation detected; skill halted until operator approval

Operator approval required by: 2026-05-30T15:45:00Z

---
Escalation ID: esc_abc123
Timestamp: 2026-05-30T15:30:00Z
```

---

## Telemetry Format (Federation Protocol v1.0.0)

```json
{
  "message_type": "validator_telemetry",
  "timestamp": "2026-05-30T15:30:00Z",
  "federation_version": "1.0.0",
  "message_id": "uuid",
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
  "status": "green",
  "drift_detected": false,
  "dimensions_at_risk": [],
  "cost_summary": {
    "total_tokens": 75000,
    "baseline_tokens": 70000,
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

## Testing

### Run All Tests

```bash
npm run test
```

### Run Specific Suite

```bash
npm run test -- AssessmentEngine
npm run test -- ScoringEngine
npm run test -- TelemetryEmitter
npm run test -- EscalationManager
```

### Coverage Report

```bash
npm run test:coverage
```

### Test Suites Included

| Suite | Coverage |
|-------|----------|
| AssessmentEngine | Dimension scorers, null handling, edge cases |
| ScoringEngine | Aggregation, drift detection, escalation logic |
| TelemetryEmitter | Message building, validation, schema compliance |
| EscalationManager | Request formatting, Claude integration, action determination |
| Integration | Full pipeline: assess → score → emit → escalate |
| Edge Cases | Zero baselines, missing details, invalid telemetry |

---

## Emission Backends

### HTTP/REST

```javascript
const client = createEmitterClient('http', {
  endpoint: 'https://federation-api.example.com/telemetry',
  headers: {
    'Authorization': `Bearer ${process.env.FEDERATION_TOKEN}`,
    'X-CIC-Version': '3.1.0'
  }
});
```

### Message Queue (RabbitMQ/SQS)

```javascript
const client = createEmitterClient('queue', {
  queue: rabbitmqQueue,
  connection: rabbitmqConnection
});
```

### File (Development/Fallback)

```javascript
const client = createEmitterClient('file', {
  filePath: './telemetry-logs/validator-output.jsonl'
});
```

---

## Environment Variables

```bash
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-...

# Qdrant
QDRANT_URL=http://localhost:6333

# Federation Protocol
FEDERATION_ENDPOINT=http://localhost:3000/telemetry
FEDERATION_TOKEN=token_...

# Logging
LOG_LEVEL=info
```

---

## Error Handling

All modules follow **zero silent failures** principle:

- Validation errors throw before pipeline proceeds
- Emission failures log but don't block pipeline (telemetry NAK)
- Claude reasoning failures return safe defaults + notification
- Baseline update failures return detailed reason; pipeline continues with frozen baseline

### Logs

```
[ValidatorPipeline] Validation failed: <error> { batchId, skillId }
[AssessmentEngine] Inconsistent ground truth: <error>
[ScoringEngine] Drift detected: <trigger> { skillId, triggers[] }
[TelemetryEmitter] Emission failed: <error> { message_id, skill_id }
[EscalationManager] Claude reasoning failed: <error> { escalation_id, skill_id }
[BaselineManager] Update baseline failed: <error> { skillId }
```

---

## Integration Checklist

- [ ] Qdrant vector DB running on `$QDRANT_URL`
- [ ] Claude API key set in `$ANTHROPIC_API_KEY`
- [ ] Federation Protocol endpoint reachable at `$FEDERATION_ENDPOINT`
- [ ] All vitest tests pass (`npm run test`)
- [ ] E2E batch flow validated (50 items, manual ground truth verification)
- [ ] Red-flag escalation false-positive rate <5% (5 manual tests)
- [ ] Operator notification template reviewed and approved
- [ ] Baseline initialized for all active skills
- [ ] Emission backend configured (HTTP, queue, or file)
- [ ] Logging aggregation (CloudWatch, ELK, Datadog) connected

---

## Monitoring & Alerts

### Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Green batches | >95% | <90% |
| Yellow escalations | <3% | >5% |
| Red escalations | <1% | >2% |
| Baseline maturity | >80% | <50% |
| Drift false-positive rate | <5% | >10% |
| Claude response time (p95) | <3s | >5s |
| Telemetry emission latency | <100ms | >500ms |

### Key Dashboards

1. **Real-time Pipeline Health:** Green/Yellow/Red distribution, escalation counts
2. **Skill Performance:** Aggregate scores by skill, trend analysis
3. **Baseline Maturity:** Status (mature/provisional/frozen), sample counts, drift events
4. **Escalation Analysis:** Root causes, resolution times, operator approval SLA compliance
5. **Federation Protocol:** Telemetry delivery, message latency, backend health

---

## Migration / Rollout

### Phase 1: Onboarding (Week 1–2)
- Deploy validator modules
- Baseline ImageAnalyzerV2 + 1 other skill (100 samples each)
- Run in **shadow mode** (scoring only, no blocking escalations)
- Validate telemetry format & Federation Protocol compliance

### Phase 2: Yellow Flags (Week 3–4)
- Enable yellow-flag escalations (60–79 score)
- Claude reasoning production-ready
- Operator on-call for approvals
- SLA monitoring: 5 min response time

### Phase 3: Red Flags (Week 5+)
- Enable red-flag escalations (<60 score)
- Skill halt logic active
- SLA monitoring: 15 min response time
- Full incident response integration

---

## Support & Troubleshooting

### "Baseline in provisional state"
**Cause:** Fewer than 100 samples collected  
**Fix:** Continue validating; baseline matures after 100 clean samples

### "Baseline frozen due to drift"
**Cause:** Drift trigger detected (score drop, cost spike, etc.)  
**Fix:** Investigate root cause, update skill if needed, reset baseline when ready

### "Claude reasoning timeout"
**Cause:** API latency >3s  
**Fix:** Check ANTHROPIC_API_KEY, retry; fallback to safe defaults

### "Telemetry emission NAK"
**Cause:** Federation Protocol endpoint unreachable  
**Fix:** Check $FEDERATION_ENDPOINT, verify auth token, check logs

---

## References

- **Federation Protocol:** `C:\dev\rewrite-mcp\projects\cic\docs\Federation_Protocol_v1.0.0.md`
- **CIC System Spec:** `C:\dev\rewrite-mcp\projects\cic\docs\CIC_SYSTEM.md`
- **Meta BOB Spec:** `C:\dev\rewrite-mcp\projects\cic\docs\META_BOB_V_FINAL_FORM.md`
- **Test Suite:** `src/validators/validators.test.js`

---

**Status:** ✅ Production-ready (v1.0.0, 2026-05-30)
