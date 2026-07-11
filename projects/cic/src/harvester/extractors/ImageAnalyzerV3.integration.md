# ImageAnalyzerV3 Integration Guide

**Version**: 1.0.0  
**Status**: Reference (to accompany skeleton implementation)  
**Last Updated**: 2026-07-10  

---

## 1. ExtractorChain Integration

### 1.1 Basic Usage

```typescript
import { ExtractorChain } from "./extractor-chain.js";
import { ImageAnalyzerV3 } from "./ImageAnalyzerV3.js";

const chain = new ExtractorChain();
chain
  .add(new SemanticExtractor())
  .add(new ImageAnalyzerV3())         // ← Add ImageAnalyzerV3 here
  .add(new TopicExtractor());

const result = await chain.run(rawText, {
  docType: "bibliography",
  sourceFormat: "ris",
  tenantId: "default",
  region: "us-east-1"
});

console.log(result.final_payload); // Contains image metadata
```

### 1.2 Context Flow

ImageAnalyzerV3 receives context from the ExtractorChain and passes it along:

```typescript
// Input from ExtractorChain
{
  raw: "...",                    // Raw text from document
  pmsEngine: { ... },            // Prompt Management System
  doc_type: "bibliography",      // Document type
  source_format: "ris",          // Source format
  // ... previous extractor outputs ...
  entities: [ ... ],             // From SemanticExtractor
  relationships: [ ... ],        // From RelationshipExtractor
}

// ImageAnalyzerV3 processes image references in raw text or context
// Returns:
{
  type: "image_analysis",
  metadata: { ... ImageMetadata v2 ... }
}

// ExtractorChain threads this down to next extractor:
{
  ...previousContext...,
  type: "image_analysis",
  metadata: { ... }
}
```

### 1.3 Telemetry Emission (by ExtractorChain)

The ExtractorChain automatically emits telemetry for ImageAnalyzer:

```typescript
// extractor-chain.ts, inside the loop at line 82+
for (const extractor of this.chain) {
  const name = extractor.constructor.name;  // "ImageAnalyzerV3"
  
  if (name === "ImageAnalyzerV3") {
    skillLabel = "extract_image_analysis";
    skillVersion = "2.0.0";
  }
  
  const tStart = Date.now();
  const output = await extractor.extract(context);
  const duration = Date.now() - tStart;
  
  // ExtractorChain emits skill telemetry with:
  // - skillName: "extract_image_analysis"
  // - skillVersion: "2.0.0"
  // - latencyMs: duration
  // - outcome: "success" | "partial" | "failure"
  // - errorType: "timeout" | "invalid_image" | "api_error" | "validation_error"
}
```

**Important**: ImageAnalyzerV3 does NOT emit telemetry directly. All telemetry is handled by ExtractorChain.

---

## 2. Instinct Engine Integration

### 2.1 Instinct Configuration

Instincts can control ImageAnalyzer behavior:

```typescript
// Example instinct: disable image analysis for text-only docs
{
  name: "text_only_policy",
  version: "1.0.0",
  trigger: {
    pipeline: "documentary_ingest",
    when: {
      doc_type: "bibliography_entry",
      source_format_in: ["txt", "csv"]
    }
  },
  logic: {
    routing_policy: {
      then: {
        avoid_skills: ["extract_image_analysis"]  // ← Skip ImageAnalyzer
      }
    }
  }
}
```

### 2.2 Instinct Evaluation Flow

```typescript
// In ExtractorChain.run() at line 34+

// 1. Evaluate instincts based on doc type and format
const instincts = specRegistry.evaluateInstincts(
  "documentary_ingest",
  docType,        // e.g., "bibliography"
  sourceFormat,   // e.g., "ris"
  tenantId,
  region
);

// 2. For each active instinct, emit InstinctTelemetry
const activeInstincts = specRegistry.getInstincts().filter(/* ... */);

for (const instinct of activeInstincts) {
  const skillsSelected = ["extract_semantic_text", "extract_image_analysis", ...];
  const skillsAvoided = instinct.logic.routing_policy.then.avoid_skills || [];
  
  // Emit before extraction
  void getTelemetrySink().recordInstinct({
    runId,
    pipeline: "documentary_ingest",
    instinctName: instinct.name,
    skillsSelected: skillsSelected.filter(s => !skillsAvoided.includes(s)),
    skillsAvoided
  });
}

// 3. Skip extractors that are in instincts.avoid
for (const extractor of this.chain) {
  const name = extractor.constructor.name;
  const skillLabel = name === "ImageAnalyzerV3" ? "extract_image_analysis" : ...;
  
  if (instincts.avoid.includes(skillLabel)) {
    console.log(`[ExtractorChain] Skipping ${skillLabel} per instinct`);
    continue;  // ← Skip ImageAnalyzer if avoided
  }
  
  // Otherwise, run ImageAnalyzer
  const output = await extractor.extract(context);
}
```

### 2.3 Skill Labeling in ExtractorChain

The chain must recognize ImageAnalyzerV3 by class name. Update line 92 in extractor-chain.ts:

```typescript
else if (name === "ImageAnalyzerV3") {
  skillLabel = "extract_image_analysis";
  skillVersion = "2.0.0";
}
```

---

## 3. PMS (Prompt Management System) Integration

### 3.1 Prompt Templates

ImageAnalyzerV3 can use PMS to request structured prompts:

```typescript
// In ImageAnalyzerV3.extractObjects() [STUB]
if (input.pmsEngine && typeof input.pmsEngine.requestPrompt === "function") {
  const res = await input.pmsEngine.requestPrompt("identify_objects", input);
  const prompt = res.prompt;
  const pmsMetadata = res.metadata;
  
  // Use prompt to call Gemini
  const geminiResponse = await this.callGeminiVision(input, prompt);
} else {
  // Fallback to hardcoded prompt
  const prompt = await this.buildPrompt("objects_extraction_v2", {
    imageId: input.imageId
  });
}
```

### 3.2 Multi-Stage Orchestrator

PMS's multi-stage orchestrator can be used for complex analysis:

```typescript
// Example: two-stage pipeline
// Stage 1: Classify image type
// Stage 2: Extract features specific to that type

const stage1 = await pmsEngine.requestPrompt("classify_image_type", input);
const imageType = parseResponse(stage1.prompt);  // "portrait", "landscape", "document"

const stage2 = await pmsEngine.requestPrompt(`extract_${imageType}_features`, input);
const features = parseResponse(stage2.prompt);
```

---

## 4. Error Handling & Telemetry

### 4.1 ExtractorChain Error Capture

When ImageAnalyzerV3 throws or returns partial metadata:

```typescript
// extractor-chain.ts, line 132+
try {
  const output = await extractor.extract(context);
  outcome = "success";
} catch (err: any) {
  outcome = "failure";
  errorType = err.message.includes("timeout") ? "timeout" : "validation_error";
  errorMessageSnippet = err.message.slice(0, 200);
  throw err;  // ← Re-throw so chain stops
}
```

If ImageAnalyzerV3 returns partial metadata in its catch block:

```typescript
// ImageAnalyzerV3.extract() [STUB]
catch (err: any) {
  // Return partial metadata (objects[], faces[], colors[], geoHints[] empty)
  return {
    type: "image_analysis",
    metadata: {
      imageId: input.imageId,
      objects: [],
      faces: [],
      colors: [],
      geoHints: [],
      sceneDescription: "",
      analysisConfidence: 0.0,
      warnings: [err.message],
      analyzedAt: new Date().toISOString(),
      analyzedWithModel: this.modelId
    }
  };
}
```

ExtractorChain will still emit telemetry:

```typescript
{
  skillName: "extract_image_analysis",
  outcome: "partial",
  errorType: "timeout",
  errorMessageSnippet: "Request timed out after 3 attempts"
}
```

### 4.2 Drift Detection

Instinct telemetry captures drift:

```typescript
// After extraction completes, ExtractorChain enriches instinct telemetry
void getTelemetrySink().enrichInstinct(runId, {
  pipelineOutcome: "partial",           // Some extractors failed
  driftDelta: 0.1,                      // Estimated drift increase
  latencyDeltaMs: totalLatency - 800    // Actual - baseline
});
```

---

## 5. Testing & Verification

### 5.1 Unit Test Integration

```typescript
// tests/ImageAnalyzerV3.test.ts

import { ImageAnalyzerV3 } from "../ImageAnalyzerV3.js";
import { loadFixture } from "./fixtures.js";

describe("ImageAnalyzerV3", () => {
  let analyzer: ImageAnalyzerV3;

  beforeEach(() => {
    process.env.GOOGLE_AI_API_KEY = "test-key";
    analyzer = new ImageAnalyzerV3();
  });

  it("should extract objects from portrait image", async () => {
    const input = {
      imageId: "test-1",
      imageData: loadFixture("portrait.jpg"),
      mimeType: "image/jpeg"
    };

    const result = await analyzer.extract(input);

    expect(result.type).toBe("image_analysis");
    expect(result.metadata.objects).toBeDefined();
    expect(result.metadata.objects.length).toBeGreaterThan(0);
  });

  it("should handle invalid image gracefully", async () => {
    const input = {
      imageId: "test-2",
      imageData: Buffer.from("not an image"),
      mimeType: "image/jpeg"
    };

    const result = await analyzer.extract(input);

    expect(result.metadata.analysisConfidence).toBe(0.0);
    expect(result.metadata.warnings).toBeDefined();
  });

  it("should timeout after 5 seconds", async () => {
    // Mock Gemini API to hang
    // Assert ImageAnalyzerV3 times out and returns partial metadata
  });
});
```

### 5.2 Integration Test with ExtractorChain

```typescript
// tests/ImageAnalyzerV3.integration.test.ts

import { ExtractorChain } from "../extractor-chain.js";
import { ImageAnalyzerV3 } from "../ImageAnalyzerV3.js";

describe("ImageAnalyzerV3 with ExtractorChain", () => {
  it("should participate in extractor chain", async () => {
    const chain = new ExtractorChain()
      .add(new ImageAnalyzerV3());

    const result = await chain.run("test", {
      docType: "bibliography",
      sourceFormat: "ris"
    });

    expect(result.final_payload.type).toBe("image_analysis");
    expect(result.final_payload.metadata).toBeDefined();
  });

  it("should be skipped when instinct avoids it", async () => {
    // Mock instinct policy: avoid_skills: ["extract_image_analysis"]
    // Assert ImageAnalyzer.extract() is not called
  });
});
```

### 5.3 verifyExtractors Harness Integration

```typescript
// verifyExtractors.ts [existing]

async function verifyImageAnalyzer() {
  const analyzer = new ImageAnalyzerV3();
  const testCases = [
    {
      name: "portrait.jpg",
      input: loadFixture("portrait.jpg"),
      expected: loadFixture("portrait.json")
    },
    {
      name: "landscape.jpg",
      input: loadFixture("landscape.jpg"),
      expected: loadFixture("landscape.json")
    }
  ];

  for (const testCase of testCases) {
    try {
      const result = await analyzer.extract({
        imageId: testCase.name,
        imageData: testCase.input,
        mimeType: "image/jpeg"
      });

      // Compare result.metadata against expected
      // Log pass/fail to EXTRACTOR.md
    } catch (err) {
      console.error(`[verifyExtractors] ${testCase.name} failed:`, err.message);
    }
  }
}
```

---

## 6. Configuration & Deployment

### 6.1 Environment Variables

```bash
# .env.development
GOOGLE_AI_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxxxx
IMAGE_ANALYSIS_TIMEOUT_MS=5000
IMAGE_ANALYSIS_CONFIDENCE_THRESHOLD=0.6
IMAGE_MAX_SIZE_MB=25

# .env.test
GOOGLE_AI_API_KEY=test-key-only-for-mocking
IMAGE_ANALYSIS_TIMEOUT_MS=500          # Faster for tests

# .env.production
GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY}  # From secret manager
IMAGE_ANALYSIS_TIMEOUT_MS=3000          # Tighter SLA
IMAGE_ANALYSIS_CONFIDENCE_THRESHOLD=0.7  # Higher bar
```

### 6.2 CI/CD Integration

```yaml
# .github/workflows/test.yml

- name: Unit Tests (ImageAnalyzerV3)
  run: npm test -- --testPathPattern="ImageAnalyzerV3"
  env:
    GOOGLE_AI_API_KEY: ${{ secrets.GOOGLE_AI_API_KEY_TEST }}

- name: Integration Tests (ExtractorChain)
  run: npm test -- --testPathPattern="extractor.*integration"
  env:
    GOOGLE_AI_API_KEY: ${{ secrets.GOOGLE_AI_API_KEY_TEST }}

- name: Verification Harness (verifyExtractors)
  run: npm run verify-extractors
  env:
    GOOGLE_AI_API_KEY: ${{ secrets.GOOGLE_AI_API_KEY_TEST }}
```

### 6.3 Monitoring & Alerting

**Metrics to track:**
- `extract_image_analysis.latency_ms` (p50, p95, p99)
- `extract_image_analysis.error_rate` (% timeouts, API errors)
- `extract_image_analysis.tokens_per_image` (cost estimation)
- `extract_image_analysis.confidence_distribution` (% with conf >= 0.7)

**Alerts:**
- Latency p99 > 1000ms (approaching budget)
- Error rate > 5%
- API authentication failures
- Gemini service outages

---

## 7. Migration Path from Stub

### Current State
```typescript
// imageAnalyzer.ts (stub)
export class ImageAnalyzer extends BaseExtractor {
  async extract(input: any) {
    const prompt = await this.buildPrompt("image_analysis_v1", {
      filename: input.filename,
      mime: input.mime,
    });
    return {
      type: "image_analysis",
      prompt,
      metadata: { filename: input.filename, mime: input.mime }
    };
  }
}
```

### Phase 1: Copy ImageAnalyzerV3 into extractor chain
```typescript
import { ImageAnalyzerV3 } from "./ImageAnalyzerV3.js";
const chain = new ExtractorChain()
  .add(new ImageAnalyzerV3());  // ← Use new implementation
```

### Phase 2: Keep old stub for backwards compatibility
```typescript
// imageAnalyzer.ts
export { ImageAnalyzerV3 as ImageAnalyzer };  // Re-export as alias
```

### Phase 3: Update all references
```bash
grep -r "new ImageAnalyzer()" src/
# Replace with: new ImageAnalyzerV3()
```

### Phase 4: Deprecate old class
```typescript
// Add deprecation warning to old class
export class ImageAnalyzer extends BaseExtractor {
  constructor() {
    console.warn(
      "[DEPRECATION] ImageAnalyzer is deprecated. " +
      "Use ImageAnalyzerV3 instead. " +
      "Will be removed in v3.0.0"
    );
    super();
  }
}
```

---

## 8. Troubleshooting Guide

### Issue: "GOOGLE_AI_API_KEY env var is required"

**Cause**: Missing API key  
**Fix**: 
```bash
export GOOGLE_AI_API_KEY=your_key_here
```

### Issue: "Request timeout after 3 attempts"

**Cause**: Gemini API is slow or network latency  
**Fix**: 
- Increase `IMAGE_ANALYSIS_TIMEOUT_MS` to 6000
- Check network connectivity
- Reduce batch size (if processing multiple images)
- Consider using Gemini 1.5 Pro for complex images (slower but more accurate)

### Issue: "Invalid image: corrupted or unsupported format"

**Cause**: Image is corrupted or format is unsupported  
**Fix**: 
- Verify image format is JPEG, PNG, GIF, or WebP
- Check file size < 25MB
- Re-encode image to JPEG if format is unusual

### Issue: ImageAnalyzer skipped per instinct policy

**Cause**: An instinct rule is avoiding `extract_image_analysis`  
**Fix**: 
- Check instinct configuration via `specRegistry.getInstincts()`
- Verify trigger conditions (doc_type, source_format_in)
- Remove `extract_image_analysis` from `avoid_skills` or adjust trigger

---

## 9. API Reference

### Gemini Flash Latest Documentation
- **API**: https://ai.google.dev/tutorials/quickstart
- **Models**: https://ai.google.dev/models/gemini
- **Pricing**: https://ai.google.dev/pricing
- **Limits**: 1M tokens/day free tier, 10 requests/second

### SDK Integration
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-latest" });

const response = await model.generateContent({
  contents: [{
    role: "user",
    parts: [
      { text: "Analyze this image..." },
      { inlineData: { mimeType: "image/jpeg", data: base64EncodedImage } }
    ]
  }]
});
```

---

## 10. Future Enhancements

1. **Named Entity Linking**: Link detected faces to entities from SemanticExtractor
2. **Batch Processing**: Send 10–50 images per API call (cost savings)
3. **OCR Support**: Optional Claude Vision integration for document images
4. **Semantic Caching**: Cache responses for identical images (content hash)
5. **Multi-modal Fusion**: Combine image context with text features
6. **Metadata Enrichment**: Link geo hints to geographic database
7. **Performance Optimization**: Parallel feature extraction (already in stub)

