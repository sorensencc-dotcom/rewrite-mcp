# SkillOpt Validator Pipeline Integration Guide

**Version:** 1.0.0  
**Date:** 2026-05-30  
**Status:** Implementation Complete

---

## Overview

This guide documents **Step 1: Pipeline Integration** — wiring the SkillOpt Validator into the CIC ingestion pipeline at three critical points:

1. **Post-INGEST** (after envelope creation)
2. **Post-ENRICH** (after extractors complete)
3. **Post-COMPRESS** (after optimization)

The integrated pipeline is implemented in `validate-pipeline.js` and validates skill output at each stage with autonomous quality assurance.

---

## Architecture

```
Raw Input
   ↓
[INGEST] normalize() → envelope
   ↓
[VALIDATE] validateSkillOutput() → score, detect drift, escalate
   ↓
[ENRICH] runExtractorsForAsset() → artifacts
   ↓
[VALIDATE] validateSkillOutput() → score, detect drift, escalate
   ↓
[COMPRESS] compress envelope/artifacts → optimized output
   ↓
[VALIDATE] validateSkillOutput() → score, detect drift, escalate
   ↓
Result { ingest, enrich, compress + validation results }
```

---

## Files

### New Files Created

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `src/pipeline/validate-pipeline.js` | Main integrated orchestrator | 425 | ✅ Complete |
| `src/pipeline/validate-pipeline.test.js` | Integration test suite | 220 | ✅ Complete |
| `src/pipeline/INTEGRATION_GUIDE.md` | This file | TBD | ✅ Complete |

### Modified Files

None yet. To integrate into the existing pipeline:

- Optional: Update `src/pipeline/run-pipeline.js` to call `validatePipeline()` instead of simple ingestChunk → ask flow
- Optional: Wire `validatePipeline()` into `src/memos/run-ingestion.js` as a consumer

---

## Public API

### `validatePipeline(input: ValidatePipelineInput) → Promise<ValidatePipelineResult>`

**Input:**
```typescript
{
  user_id: string;
  intent: string;
  text: string;
  source?: string;                 // Default: "manual"
  correlation_id?: string;         // Default: generated UUID
  qdrantClient: QdrantClient;      // @qdrant/js-client-rest
  claudeClient: Anthropic;         // @anthropic-ai/sdk
  emitterClient: EmitterClient;    // Federation Protocol emitter
}
```

**Output:**
```typescript
{
  correlation_id: string;
  user_id: string;
  intent: string;
  source: string;
  ingest: {
    envelope: CanonicalAssetEnvelope;
    validation_result: SkillOptValidationResult;
  };
  enrich: {
    artifacts: Artifact[];
    validation_result: SkillOptValidationResult;
  };
  compress: {
    optimized_output: CompressedOutput;
    validation_result: SkillOptValidationResult;
  };
  duration_ms: number;
  success: boolean;
  error?: string;  // If success === false
}
```

---

## Integration Points

### 1. Direct Replacement

Replace `run-pipeline.js` usage:

```javascript
// OLD:
import { runPipeline } from './src/pipeline/run-pipeline.js';
const result = await runPipeline({ user_id, intent, text, source });

// NEW:
import { validatePipeline } from './src/pipeline/validate-pipeline.js';
import { QdrantClient } from '@qdrant/js-client-rest';
import Anthropic from '@anthropic-ai/sdk';
import { createEmitterClient } from '../validators/TelemetryEmitter.js';

const result = await validatePipeline({
  user_id,
  intent,
  text,
  source,
  qdrantClient: new QdrantClient({ url: process.env.QDRANT_URL }),
  claudeClient: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  emitterClient: createEmitterClient('http', {
    endpoint: process.env.FEDERATION_ENDPOINT
  })
});
```

### 2. In Memos Ingestion Worker

Add to `src/memos/run-ingestion.js` as a new consumer:

```javascript
import { validatePipeline } from '../pipeline/validate-pipeline.js';
import { QdrantClient } from '@qdrant/js-client-rest';
import Anthropic from '@anthropic-ai/sdk';

class ValidatePipelineConsumer {
  constructor({ qdrantClient, claudeClient, emitterClient }) {
    this.qdrantClient = qdrantClient;
    this.claudeClient = claudeClient;
    this.emitterClient = emitterClient;
  }

  async consume(event) {
    // Route validated memo through INGEST → ENRICH → COMPRESS with validation
    const result = await validatePipeline({
      user_id: event.user_id,
      intent: event.intent || 'research',
      text: event.content,
      source: 'memos',
      correlation_id: event.id,
      qdrantClient: this.qdrantClient,
      claudeClient: this.claudeClient,
      emitterClient: this.emitterClient,
    });

    // Log validation results
    if (!result.success) {
      log.error('pipeline_validation_failed', {
        eventId: event.id,
        error: result.error,
      });
    } else {
      log.info('pipeline_validation_success', {
        eventId: event.id,
        ingest_score: result.ingest.validation_result.scoring.aggregate,
        enrich_score: result.enrich.validation_result.scoring.aggregate,
        compress_score: result.compress.validation_result.scoring.aggregate,
      });
    }
  }
}

// In run-ingestion setup:
const validateConsumer = new ValidatePipelineConsumer({
  qdrantClient: new QdrantClient({ url: process.env.QDRANT_URL }),
  claudeClient: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  emitterClient: createEmitterClient('http', {
    endpoint: process.env.FEDERATION_ENDPOINT
  })
});

bus.subscribe(event => {
  if (event.intent === 'research' || event.validate_output) {
    validateConsumer.consume(event);
  }
});
```

---

## Validation Behavior

### INGEST Validation

**Skill ID:** `normalizer@1.0.0`  
**What It Validates:**
- Envelope structure correctness
- Checksum validity (SHA-256)
- Region inference accuracy
- Source metadata extraction

**Dimensions:**
- **Accuracy** (30%): Field presence + structural validity
- **Consistency** (25%): Repeated normalizations produce same checksum
- **Efficiency** (25%): Token usage vs baseline
- **Latency** (20%): Normalization speed vs baseline

**Baseline Status:** Provisional (0 samples initially)

### ENRICH Validation

**Skill ID:** `extractors@registry`  
**What It Validates:**
- Artifact generation completeness
- Field coverage (scene, objects, faces, embeddings, safety)
- Artifact quality + confidence scores
- Coverage across extraction types

**Dimensions:**
- **Accuracy** (30%): Semantic similarity of extracted fields
- **Consistency** (25%): Repeated extractions produce similar artifacts
- **Efficiency** (25%): Token usage vs baseline
- **Latency** (20%): Extraction speed vs baseline

**Baseline Status:** Provisional (0 samples initially, matures at 100+)

### COMPRESS Validation

**Skill ID:** `compressor@1.0.0`  
**What It Validates:**
- Compression ratio achievement (<50% recommended)
- Information loss assessment
- Critical field preservation
- No hallucination or corruption

**Dimensions:**
- **Accuracy** (30%): Information preservation score
- **Consistency** (25%): Repeated compressions produce similar output
- **Efficiency** (25%): Compression ratio vs baseline
- **Latency** (20%): Compression speed vs baseline

**Baseline Status:** Provisional (0 samples initially)

---

## Escalation Behavior

### RED Flag (<60 score)
- **Action:** **Halt pipeline immediately**
- **SLA:** 15 minutes operator approval required
- **Flow:**
  1. Skill paused
  2. Telemetry sent to Federation Protocol
  3. Claude reasoning requested
  4. Operator notified with root-cause hypothesis
  5. Operator must approve resumption

**Example Operators Notification:**
```
🚨 SkillOpt Validator Escalation — RED

Skill: normalizer@1.0.0
Stage: INGEST
Batch: batch_ingest_a1b2c3d4

Score: 52/100
- Accuracy: 45
- Consistency: 55
- Efficiency: 60
- Latency: 48

Root Cause (Claude):
Checksum validation failed; duplicate detection misfiring.

Confidence: 88%

Proposed Actions:
1. Reset dedup cache
2. Verify Qdrant connectivity
3. Re-validate envelope structure

System Action: HALT
Reason: Red flag escalation; skill halted until operator approval

Approval SLA: 2026-05-30T15:45:00Z
Escalation ID: esc_abc123
```

### YELLOW Flag (60–79 score)
- **Action:** Escalate to Claude for reasoning
- **SLA:** 5 minutes
- **Logic:**
  - If confidence ≥75%: **CONTINUE** (skill runs; actions logged)
  - If 50–74%: **PAUSE** (require operator validation)
  - If <50%: **HALT** (require operator approval)

### GREEN (≥80 score)
- **Action:** Continue normally
- **Logging:** Standard metrics only

---

## Testing

### Run All Tests

```bash
cd src/pipeline
npm install    # Install vitest if needed
npm run test   # Run validate-pipeline.test.js
```

### Run Specific Test Suite

```bash
npm run test -- validate-pipeline
npm run test -- --reporter=verbose
```

### Coverage

```bash
npm run test:coverage
```

---

## Environment Variables

```bash
# Qdrant
QDRANT_URL=http://localhost:6333

# Anthropic (Claude API)
ANTHROPIC_API_KEY=sk-ant-...

# Federation Protocol telemetry endpoint
FEDERATION_ENDPOINT=http://localhost:3000/telemetry
FEDERATION_TOKEN=token_...

# Logging
LOG_LEVEL=info
```

---

## CLI Usage

### Run a single validation pipeline

```bash
node src/pipeline/validate-pipeline.js \
  --user_id=test-user \
  --intent=research \
  --text="Charles Emil Sorensen supervised construction at Willow Run" \
  --source=archive
```

### Expected Output

```json
{
  "correlation_id": "a1b2c3d4-...",
  "user_id": "test-user",
  "intent": "research",
  "source": "archive",
  "success": true,
  "ingest": {
    "envelope": { "id": "...", "region": "archives", ... },
    "validation_result": { "success": true, "scoring": { "aggregate": 82, "status": "green" }, ... }
  },
  "enrich": {
    "artifacts": [ ... ],
    "validation_result": { "success": true, "scoring": { "aggregate": 85, "status": "green" }, ... }
  },
  "compress": {
    "optimized_output": { ... },
    "validation_result": { "success": true, "scoring": { "aggregate": 78, "status": "yellow" }, ... }
  },
  "duration_ms": 1250
}
```

---

## Baseline Initialization

### Before First Production Run

Initialize baselines for all 3 skills:

```javascript
import { loadBaseline, BaselineManager } from '../validators/index.js';
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrantClient = new QdrantClient({ url: process.env.QDRANT_URL });

// Initialize provisioning baseline (0 samples)
const baselineNormalizer = await loadBaseline('normalizer@1.0.0', qdrantClient);
const baselineExtractors = await loadBaseline('extractors@registry', qdrantClient);
const baselineCompressor = await loadBaseline('compressor@1.0.0', qdrantClient);

console.log('Baselines initialized:');
console.log(`  normalizer@1.0.0: ${baselineNormalizer.status} (${baselineNormalizer.sampleCount} samples)`);
console.log(`  extractors@registry: ${baselineExtractors.status} (${baselineExtractors.sampleCount} samples)`);
console.log(`  compressor@1.0.0: ${baselineCompressor.status} (${baselineCompressor.sampleCount} samples)`);
```

### Baseline Maturity

Each skill baseline follows this lifecycle:

1. **Provisional** (0–99 samples)
   - Recommendations: collect 100+ clean samples
   - Updates proceed normally
   - Drift detection enabled but at reduced sensitivity

2. **Mature** (100+ samples, no drift)
   - Rolling average active
   - Full drift detection sensitivity
   - Can be frozen if drift detected

3. **Frozen** (drift detected)
   - No updates until drift resolved
   - Requires manual investigation
   - Contact on-call engineer

---

## Rollout Strategy (Phased)

### Phase 1: Shadow Mode (Week 1–2)
- Deploy validator modules + validate-pipeline.js
- Initialize baselines with 100 samples each (manual ground truth verification)
- Run in shadow mode (scoring only, no blocking escalations)
- Monitor telemetry format + Federation Protocol compliance
- Collect metrics: GREEN%, YELLOW%, RED% distribution

### Phase 2: Yellow Flags (Week 3–4)
- Enable YELLOW-flag escalations (60–79 score)
- Claude reasoning production-ready
- Operator on-call for approvals (5-min SLA)
- Monitor false-positive rate (target <3%)

### Phase 3: Red Flags (Week 5+)
- Enable RED-flag escalations (<60 score)
- Skill halt logic active
- Operator on-call (15-min SLA)
- Full incident response integration
- Monitor false-positive rate (target <1%)

---

## Troubleshooting

### "Baseline in provisional state"
**Cause:** Fewer than 100 samples collected  
**Fix:** Continue validating pipeline; baseline matures after 100 clean samples

### "Baseline frozen due to drift"
**Cause:** Drift trigger detected (score drop >5pp, dimension <70 for 2 batches, etc.)  
**Fix:** Investigate root cause, update skill if needed, reset baseline when ready:
```javascript
import { resetBaseline } from '../validators/index.js';
await resetBaseline('normalizer@1.0.0', qdrantClient);
```

### "Claude reasoning timeout"
**Cause:** API latency >3s  
**Fix:** Check ANTHROPIC_API_KEY, retry; fallback to safe defaults

### "Telemetry emission NAK"
**Cause:** Federation Protocol endpoint unreachable  
**Fix:** Check $FEDERATION_ENDPOINT, verify auth token, check logs

---

## Next Steps (Post-Integration)

1. **Step 2:** Run test suite (`npm run test`)
   - Verify all 40+ tests pass
   - Check coverage >90%

2. **Step 3:** Baseline ImageAnalyzerV2
   - Initialize with 100 manual samples
   - Verify ground truth annotations

3. **Step 4:** Pre-launch E2E validation
   - 50-item batch flow
   - Manual verification of 5 red-flag escalations
   - Measure false-positive rate

4. **Step 5:** Post-launch monitoring
   - First 500 items through pipeline
   - Monitor telemetry patterns
   - Baseline convergence
   - Claude reasoning formatting

---

## References

- **SkillOpt Validator:** `src/validators/README.md` (comprehensive deployment guide)
- **Federation Protocol:** `C:\dev\rewrite-mcp\projects\cic\docs\Federation_Protocol_v1.0.0.md`
- **CIC System:** `C:\dev\rewrite-mcp\projects\cic\docs\CIC_SYSTEM.md`
- **Test Suite:** `src/validators/validators.test.js`

---

**Status:** ✅ Step 1 Complete — Ready for Step 2 (Test Suite Run)
