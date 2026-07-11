# ImageAnalyzerV3: Production Vision Extraction for Documentary Harvesting

**Version**: 2.0.0  
**Status**: Specification & Skeleton (Ready for implementation)  
**Component**: Harvester Extractor Chain  
**Created**: 2026-07-10  

---

## Overview

ImageAnalyzerV3 is a production-grade vision extraction service that replaces the stub ImageAnalyzer.ts. It integrates Google's Gemini Flash Latest API into the documentary harvesting pipeline to extract structured metadata from images:

- **Objects**: Labels, confidence scores, bounding boxes
- **Faces**: Detection, bounding boxes, attributes (age, gender, expression)
- **Colors**: Dominant colors, hex codes, percentages
- **Geo Hints**: Landmarks, terrain, architecture, text-based location clues
- **Scene Description**: Single-sentence summary of image content

The extractor fits seamlessly into the ExtractorChain, respects Instinct engine policies, and emits comprehensive telemetry for monitoring and drift detection.

---

## Why Gemini Flash Latest?

**Decision**: Use Google Gemini 2.0 Flash Latest (NOT Claude Vision)

| Metric | Gemini Flash | Claude Vision | Rationale |
|--------|-------------|---------------|-----------|
| **Latency** | 400–600ms | 800–1200ms | Must fit 800ms per-extractor budget |
| **Cost** | $0.075/image | $0.15/image | 50% cheaper for high-volume harvesting |
| **Optimized for** | Structured extraction | Contextual reasoning | We need fast objects/faces/colors |
| **Batch processing** | Excellent | Standard | Better for 10k+/day volumes |
| **Trade-off** | Lower face descriptions | Superior face reasoning | Accept for speed + cost |

**Conclusion**: Gemini Flash Latest is optimal for documentary harvesting. If OCR or deep face reasoning becomes critical, we can add Claude Vision integration later with caching.

---

## Deliverables

### 1. **ImageAnalyzerV3.spec.md** — Full Specification
   - Executive summary + vision API rationale
   - ImageMetadata v2 type definitions
   - Feature extraction method contracts
   - Telemetry event specifications
   - Error handling strategy (timeouts, API failures, invalid images)
   - Healthcheck & API credential strategy
   - Implementation roadmap (5 phases)
   - Testing fixtures list
   - Configuration & deployment guide

### 2. **ImageAnalyzerV3.ts** — TypeScript Class Skeleton
   - `ImageAnalyzerV3` class extending `BaseExtractor`
   - All method signatures with JSDoc contracts
   - Type definitions: `ImageMetadata`, `DetectedObject`, `DetectedFace`, `DominantColor`, `GeoHint`
   - Stub implementations (return empty/mock data, console.log)
   - Error handling patterns
   - Factory function for async initialization
   - Ready for implementation phase (no code hidden behind placeholders)

### 3. **ImageAnalyzerV3.integration.md** — Integration Guide
   - ExtractorChain integration (context flow, telemetry)
   - Instinct engine integration (policy evaluation, skill skipping)
   - PMS (Prompt Management System) integration
   - Error handling & telemetry capture
   - Testing & verification patterns
   - Configuration & deployment in CI/CD
   - Migration path from stub
   - Troubleshooting guide
   - API reference (Gemini Flash Latest)

### 4. **ImageAnalyzerV3.quick-ref.md** — Quick Reference Card
   - One-page cheat sheet for implementers
   - File locations, classes, type definitions
   - Implementation checklist (5 phases)
   - Environment variables
   - Telemetry schema
   - Integration points
   - Error handling matrix
   - Gemini API call pattern
   - Testing fixtures structure
   - Performance targets
   - FAQ

### 5. **This README** — Navigation & Overview

---

## File Structure

```
projects/cic/src/harvester/extractors/
├── ImageAnalyzerV3.ts                    # Implementation skeleton
├── ImageAnalyzerV3.spec.md               # Full specification
├── ImageAnalyzerV3.integration.md        # Integration guide
├── ImageAnalyzerV3.quick-ref.md          # Quick reference
├── ImageAnalyzerV3.README.md             # This file
├── base-extractor.ts                     # Parent class (already exists)
├── extractor-chain.ts                    # Integration point (needs update)
├── iextractor.ts                         # Interface (already exists)
├── imageAnalyzer.ts                      # Old stub (to deprecate)
├── v2/
│   ├── extractor-v2.types.ts             # Semantic types (already exists)
│   └── extractor-v2.errors.ts            # Error types (already exists)
└── __fixtures__/
    ├── images/                           # Test images (to create)
    │   ├── portrait.jpg
    │   ├── landscape.jpg
    │   ├── corrupted.jpg
    │   └── oversized.bin
    └── expected/                         # Expected outputs (to create)
        ├── portrait.json
        └── landscape.json
```

---

## Quick Start for Implementers

### Step 1: Read the Specification
Start with **ImageAnalyzerV3.spec.md** for the full context. Focus on sections:
- 1. Executive Summary
- 2. Vision API Choice Rationale
- 5. Vision Feature Extraction Methods
- 6. Telemetry Events
- 8. Error Handling Strategy

### Step 2: Review the Skeleton
Open **ImageAnalyzerV3.ts** to see:
- Class structure and inheritance from BaseExtractor
- Method signatures with JSDoc contracts
- Stub implementations (showing what to replace)
- Type definitions (ready to use as-is)

### Step 3: Understand Integration
Read **ImageAnalyzerV3.integration.md** sections:
- 1. ExtractorChain Integration (how image analyzer participates)
- 2. Instinct Engine Integration (policy-based skipping)
- 4. Error Handling & Telemetry (what ExtractorChain captures)
- 5. Testing & Verification (testing patterns)

### Step 4: Use Quick Reference
Keep **ImageAnalyzerV3.quick-ref.md** handy during implementation:
- Implementation Checklist (track progress)
- Gemini API Call Pattern (copy-paste template)
- Error Handling Strategy matrix (error → handling)
- Testing Fixtures (what to create)

### Step 5: Implementation Phases
1. **Setup** (environment, fixtures)
2. **Core Implementation** (credentials, healthcheck, validation, API wrapper)
3. **Feature Extraction** (objects, faces, colors, geo, scene)
4. **Testing** (unit, integration, E2E)
5. **Production** (CI/CD, monitoring, alerting)

---

## Key Design Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| **Gemini Flash Latest** | Speed + cost optimal | ~400–600ms latency, ~$0.075/image |
| **Parallel feature extraction** | Faster pipeline | Objects, faces, colors analyzed in parallel |
| **Confidence thresholding** | Quality control | Only high-confidence results (default 0.6) |
| **Graceful degradation** | Pipeline resilience | Return partial metadata on timeout, don't halt chain |
| **Exponential backoff retry** | Transient error handling | Retry rate-limit (429) and server errors (5xx) up to 3x |
| **No telemetry in extractor** | Single responsibility | ExtractorChain emits telemetry for all extractors |
| **ImageMetadata v2 type** | Future-proof | Extensible structure for added features |

---

## Integration Points

### 1. ExtractorChain
```typescript
const chain = new ExtractorChain()
  .add(new SemanticExtractor())
  .add(new ImageAnalyzerV3())      // ← Fits here
  .add(new TopicExtractor());

await chain.run(rawText, { docType: "bibliography", ... });
```

**What ExtractorChain does:**
- Instantiates ImageAnalyzerV3
- Calls `extract()` with context threaded from previous extractors
- Emits skill telemetry (skillName: "extract_image_analysis", version: "2.0.0")
- Captures outcome ("success", "partial", "failure")
- Catches errors and marks telemetry accordingly
- Threads output to next extractor

### 2. Instinct Engine
Instinct policies can disable ImageAnalyzer:
```typescript
{
  trigger: { doc_type: "bibliography_entry", source_format_in: ["txt", "csv"] },
  logic: { avoid_skills: ["extract_image_analysis"] }  // ← Skip if set
}
```

**When to use this**: Text-only documents without images (saves API calls).

### 3. Telemetry Sink
ExtractorChain emits telemetry automatically:
```typescript
{
  skillName: "extract_image_analysis",
  skillVersion: "2.0.0",
  latencyMs: 543,
  outcome: "success",
  errorType: null,
  ...  // See SkillTelemetry interface in telemetry-types.ts
}
```

**No direct telemetry in ImageAnalyzerV3** — all emitted by ExtractorChain.

---

## Telemetry Schema

ImageAnalyzerV3 does not emit telemetry. ExtractorChain emits `SkillTelemetry`:

```typescript
interface SkillTelemetry {
  runId: string;                    // Unique run identifier
  pipeline: "documentary_ingest";
  stage: "evidence_pack";
  skillName: "extract_image_analysis";
  skillVersion: "2.0.0";
  
  startedAt: string;                // ISO timestamp
  finishedAt: string;               // ISO timestamp
  latencyMs: number;                // Duration of extract() call
  
  inputSizeBytes: number;           // Image + context
  outputSizeBytes: number | null;   // ImageMetadata JSON
  
  outcome: "success" | "partial" | "failure";
  errorType?: "timeout" | "invalid_image" | "api_error" | "validation_error";
  errorMessageSnippet?: string;     // First 200 chars
  
  instinctName?: string;
  instinctVersion?: string;
  rulesEnforced: string[];
  hooksFired: string[];
}
```

**Error types:**
- `timeout`: Request exceeded deadline
- `invalid_image`: Unsupported format, corrupted, too large
- `api_error`: Gemini API returned error (auth, quota, rate limit, outage)
- `validation_error`: Output schema mismatch, missing required fields

---

## Environment Configuration

### Required
```bash
GOOGLE_AI_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxxxx
```

### Optional (with defaults)
```bash
IMAGE_ANALYSIS_TIMEOUT_MS=5000              # Default 5s, production 3s
IMAGE_ANALYSIS_CONFIDENCE_THRESHOLD=0.6     # Default 0.6, production 0.7
IMAGE_MAX_SIZE_MB=25                        # Gemini API limit, don't change
```

### Obtain API Key
Visit https://ai.google.dev → create project → enable Generative AI API → generate API key

---

## Testing Strategy

### Unit Tests
- Test each extraction method in isolation
- Mock Gemini API responses
- Verify confidence filtering
- Test error paths (timeout, invalid image, etc.)

### Integration Tests
- Test ImageAnalyzerV3 within ExtractorChain
- Verify context threading
- Verify telemetry emission by chain
- Test instinct policy enforcement (skip when avoided)

### Verification Harness (verifyExtractors.ts)
- Load golden image fixtures
- Compare results against expected JSON
- Measure latency and token usage
- Log results to EXTRACTOR.md

### Example Test
```typescript
it("should extract objects from portrait image", async () => {
  const analyzer = new ImageAnalyzerV3();
  const result = await analyzer.extract({
    imageId: "portrait-1",
    imageData: loadFixture("portrait.jpg"),
    mimeType: "image/jpeg"
  });

  expect(result.metadata.objects).toBeDefined();
  expect(result.metadata.objects.length).toBeGreaterThan(0);
  expect(result.metadata.analysisConfidence).toBeGreaterThanOrEqual(0.6);
});
```

---

## Error Handling Strategy

| Error Scenario | Handling | Outcome | Telemetry |
|---|---|---|---|
| **Invalid image format** | validateImage() throws | Partial metadata (empty features) | "partial" / "invalid_image" |
| **Image too large (>25MB)** | Throw immediately | Partial metadata | "partial" / "invalid_image" |
| **Timeout on first try** | Retry once with 2x timeout | Partial metadata | "partial" / "timeout" |
| **Timeout after retries** | Return partial metadata | Partial metadata (empty features) | "partial" / "timeout" |
| **Auth error (401)** | Throw immediately, no retry | Partial metadata | "failure" / "api_error" |
| **Rate limit (429)** | Retry 3x with backoff | Success (if succeeds) or partial | Depends on final outcome |
| **Server error (5xx)** | Retry 3x with backoff | Success (if succeeds) or partial | Depends on final outcome |
| **Network error** | Throw immediately | Partial metadata | "partial" / "api_error" |

**Key principle**: Never halt the ExtractorChain on ImageAnalyzer failure. Return partial metadata instead.

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Latency p50** | 400ms | Gemini API core time |
| **Latency p95** | 550ms | Core + overhead |
| **Latency p99** | 800ms | Ceiling (shared budget with other extractors) |
| **Error rate** | < 5% | Timeouts + API failures |
| **Cost per image** | $0.075 | Gemini Flash Latest pricing |
| **Cost per month** | ~$22 | For 10k images/day |
| **Monthly throughput** | ~330k images | At default rate limit |
| **Confidence >= 0.7** | > 80% images | Quality assurance bar |

---

## Monitoring & Alerting

### Metrics to Track
```
extract_image_analysis_latency_ms{quantile="p50,p95,p99"}
extract_image_analysis_errors_total{type="timeout,invalid_image,api_error"}
extract_image_analysis_tokens_total{type="input,output"}
extract_image_analysis_confidence_distribution{bin="0.0-0.2,0.2-0.4,..."}
extract_image_analysis_features_count{type="objects,faces,colors,geoHints"}
```

### Alert Thresholds
- Latency p99 > 1000ms → warning (approaching budget)
- Error rate > 5% → critical (investigation needed)
- Auth failures > 10/hour → critical (credential problem)
- Monthly API cost > $500 → warning (budget exceeded)

---

## Cost Estimation

**Gemini Flash Latest Pricing**: ~$0.075 per image (1M token input billing)

### Scenarios
| Volume | Duration | Cost | Notes |
|--------|----------|------|-------|
| 100 images | 1 hour | $7.50 | Development/testing |
| 1,000 images | 1 day | $75 | Small pilot |
| 10,000 images | 1 day | $750 | Medium production |
| 100,000 images | 10 days | $7,500 | Large batch |

### Budget Planning
- **Free tier**: 1M tokens/day (free) = ~13k images/day
- **Paid tier**: $500/month = ~6.6M images/month
- **Average daily cost at 10k images**: $2.25/day (~$68/month)

---

## Future Enhancements

1. **Batch Processing**: Send 10–50 images per API call (cost optimization)
2. **Named Entity Linking**: Link detected faces to entities from SemanticExtractor
3. **OCR Integration**: Add Claude Vision for document images (optional, slower)
4. **Semantic Caching**: Cache responses for identical images (content hash)
5. **Metadata Enrichment**: Link geo hints to geographic database
6. **Multi-modal Fusion**: Combine image context with text from SemanticExtractor

---

## FAQ

**Q: Why Gemini and not Claude?**  
A: Gemini Flash Latest is 2x faster and 50% cheaper. We optimize for documentary harvesting speed + cost, not deep contextual reasoning.

**Q: What if analysis fails?**  
A: Return partial metadata (empty feature arrays) with warnings. Don't halt the pipeline.

**Q: Can I disable ImageAnalyzer for certain documents?**  
A: Yes, via instinct policies. Set `avoid_skills: ["extract_image_analysis"]` in trigger conditions.

**Q: How much does it cost?**  
A: ~$0.075/image with Gemini Flash Latest. 10k images/day = ~$22/month.

**Q: How do I test without API key?**  
A: Mock GoogleGenerativeAI in unit tests (see integration guide for example).

**Q: What if I need OCR?**  
A: Future enhancement. For now, assume documents are structured metadata, not images.

---

## Links & Resources

| Resource | Link |
|----------|------|
| **Gemini API Docs** | https://ai.google.dev |
| **@google/generative-ai SDK** | https://www.npmjs.com/package/@google/generative-ai |
| **Pricing** | https://ai.google.dev/pricing |
| **Rate Limits** | https://ai.google.dev/docs/concepts/rate-limits |
| **Full Spec** | ImageAnalyzerV3.spec.md (this repo) |
| **Integration Guide** | ImageAnalyzerV3.integration.md (this repo) |
| **Quick Reference** | ImageAnalyzerV3.quick-ref.md (this repo) |

---

## Document History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 2.0.0 | 2026-07-10 | Claude Code | Full specification + skeleton + guides |
| 1.0.0 | 2026-07-10 | Claude Code | Initial outline |

---

## Next Steps

1. **Create test fixtures** in `__fixtures__/images/` (portrait.jpg, landscape.jpg, etc.)
2. **Implement Phase 2** (setup: credentials, healthcheck, validation, API wrapper)
3. **Implement Phase 3** (features: objects, faces, colors, geo, scene)
4. **Run Phase 4** (testing: unit, integration, E2E)
5. **Deploy Phase 5** (CI/CD, monitoring, production)

---

## Support & Questions

For clarification on:
- **Specification details** → See ImageAnalyzerV3.spec.md
- **Integration** → See ImageAnalyzerV3.integration.md
- **Quick lookup** → See ImageAnalyzerV3.quick-ref.md
- **Implementation patterns** → See ImageAnalyzerV3.ts skeleton
- **Testing** → See integration guide section 5

