# ImageAnalyzerV3 Specification

**Version**: 1.0.0  
**Status**: Specification (skeleton phase)  
**Last Updated**: 2026-07-10  
**Component**: Harvester Extractor Chain  

---

## 1. Executive Summary

ImageAnalyzerV3 replaces the stub ImageAnalyzer with a production-grade vision extraction service. It integrates Google's Gemini Flash Latest API to extract structured metadata from images within the documentary ingestion pipeline. The extractor:

- Analyzes images to detect objects, faces, dominant colors, and scene context
- Emits telemetry for performance monitoring and drift detection
- Validates API credentials at startup via healthcheck
- Handles timeouts, API failures, and invalid image formats gracefully
- Follows the BaseExtractor pattern and integrates with ExtractorChain

---

## 2. Vision API Choice Rationale: Gemini Flash Latest

### Selection Criteria

| Criterion | Gemini Flash Latest | Claude Vision | Winner |
|-----------|-------------------|---------------|--------|
| **Latency (ms)** | 400–600 | 800–1200 | Gemini |
| **Cost per image** | $0.075 (1M token avg) | $0.15 (2K token avg) | Gemini |
| **Object detection** | Excellent | Good | Gemini |
| **Face detection** | Strong | Excellent | Claude |
| **Scene description** | Good | Excellent | Claude |
| **Color extraction** | Excellent | Good | Gemini |
| **OCR capability** | Good | Excellent | Claude |
| **Geo hints** | Good | Good | Tie |
| **Pipeline efficiency** | High (fits 800ms budget) | Moderate (exceeds budget) | Gemini |
| **Batch processing** | Optimized | Standard | Gemini |

### Decision: Gemini Flash Latest

**Rationale:**
- **Speed**: 400–600ms latency comfortably fits the 800ms baseline per-extractor budget in ExtractorChain
- **Cost**: 50% lower than Claude Vision, critical for high-volume harvesting (10k+ images/day)
- **Structured extraction**: Optimized for objects, faces, colors, geo—precisely the features we extract
- **Scalability**: Designed for efficient batch processing of many images
- **Fit**: Documentary harvester needs speed + accuracy on structured extraction, not deep contextual reasoning

**Trade-offs accepted:**
- Slightly lower accuracy on face *descriptions* (mitigated by confidence thresholds)
- No OCR support (documents should be in structured metadata, not images)
- Less sophisticated scene reasoning (not required for cataloging)

**Future migration path:** If OCR or face reasoning becomes critical, switch to Claude Vision with caching to amortize latency cost.

---

## 3. Integration Points

### 3.1 ExtractorChain Integration

ImageAnalyzerV3 plugs into the ExtractorChain as an optional skill:

```typescript
const chain = new ExtractorChain()
  .add(new SemanticExtractor())
  .add(new ImageAnalyzer())        // ← ImageAnalyzerV3 instance
  .add(new TopicExtractor());

await chain.run(rawText, { docType: "bibliography", sourceFormat: "ris" });
```

**Skill Label**: `extract_image_analysis`  
**Skill Version**: `2.0.0`  
**Pipeline**: `documentary_ingest`  
**Stage**: `evidence_pack`

### 3.2 Instinct Engine Integration

ExtractorChain evaluates instincts before running ImageAnalyzer. If instincts specify `avoid_skills: ["extract_image_analysis"]`, the extractor is skipped.

```typescript
// Inside ExtractorChain.run()
const instincts = specRegistry.evaluateInstincts("documentary_ingest", docType, sourceFormat, ...);
if (instincts.avoid.includes("extract_image_analysis")) {
  console.log("[ExtractorChain] Skipping ImageAnalyzer per instinct policy");
  continue;  // Skip this extractor
}
```

**Key Benefit**: Policies can disable image analysis for document types that never contain images (e.g., text-only bibliography entries).

### 3.3 Telemetry Sink Integration

ImageAnalyzerV3 does NOT directly emit telemetry. ExtractorChain emits skill telemetry for every extractor, including ImageAnalyzer.

The extractor provides:
- `outcome`: "success" | "partial" | "failure"
- `errorType`: "timeout" | "invalid_image" | "api_error" | "validation_error"
- `latencyMs`: time from extract() call to return
- Output payload size for monitoring

---

## 4. ImageMetadata V2 Type Definition

### 4.1 Core Type

```typescript
/**
 * ImageMetadata v2 — vision extraction output from Gemini Flash Latest
 * Extends v1 with structured vision analysis
 */
export interface ImageMetadata {
  // Identity
  imageId: string;           // Unique identifier or hash
  originalFilename?: string; // Preserved for audit trail
  mimeType: string;          // e.g., "image/jpeg", "image/png"
  fileSizeBytes?: number;    // For monitoring binary overhead

  // Vision Analysis (from Gemini)
  objects: DetectedObject[];
  faces: DetectedFace[];
  colors: DominantColor[];
  geoHints: GeoHint[];
  sceneDescription: string;

  // Metadata
  analysisConfidence: number; // 0.0–1.0, aggregate score
  analyzedAt: string;         // ISO timestamp
  analyzedWithModel: string;  // "gemini-2.0-flash-latest"

  // Diagnostics
  warnings?: string[];        // e.g., "low-confidence faces detected"
  rawTokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
}
```

### 4.2 Sub-types

```typescript
export interface DetectedObject {
  label: string;             // e.g., "person", "building", "document"
  confidence: number;        // 0.0–1.0
  boundingBox?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  description?: string;      // e.g., "formal attire, standing outdoors"
}

export interface DetectedFace {
  id: string;               // Face identifier within image
  confidence: number;       // 0.0–1.0, face detection confidence
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  attributes?: {
    approximate_age_range?: string;   // e.g., "25-35"
    gender?: string;                  // "male" | "female" | "unknown"
    expression?: string;              // e.g., "neutral", "happy", "stern"
    visibility?: string;              // e.g., "clear", "partial", "obscured"
  };
  description?: string;    // e.g., "formal portrait, centered subject"
  isNamedEntity?: boolean; // Placeholder for future name linking
}

export interface DominantColor {
  hex: string;             // e.g., "#3A4D5C"
  rgb: { r: number; g: number; b: number };
  name?: string;           // e.g., "slate blue"
  percentage: number;      // 0.0–100.0, proportion of image
  classification?: "foreground" | "background" | "accent";
}

export interface GeoHint {
  hintType: "landmark" | "terrain" | "architecture" | "text_based";
  value: string;           // e.g., "Statue of Liberty", "Fjord landscape"
  confidence: number;      // 0.0–1.0
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  source?: string;         // Where this hint came from (e.g., "text_in_image")
}
```

---

## 5. Vision Feature Extraction Methods

ImageAnalyzerV3 exposes these method signatures for structured extraction:

```typescript
export class ImageAnalyzerV3 extends BaseExtractor {
  // Main entry point
  async extract(input: ImageAnalyzerInput): Promise<ImageAnalysisResult>;

  // Feature extraction (internal)
  private async extractObjects(imageData: ImageData): Promise<DetectedObject[]>;
  private async extractFaces(imageData: ImageData): Promise<DetectedFace[]>;
  private async extractColors(imageData: ImageData): Promise<DominantColor[]>;
  private async extractGeoHints(imageData: ImageData): Promise<GeoHint[]>;
  private async analyzeScene(imageData: ImageData): Promise<string>;

  // Utilities
  private async validateImage(imageData: ImageData): Promise<boolean>;
  private async ensureHealthy(): Promise<void>;
  private async callGeminiVision(imageData: ImageData, analysisType: string): Promise<GeminiResponse>;
}
```

**Method Contracts:**

| Method | Input | Output | Error Cases | Timeout |
|--------|-------|--------|------------|---------|
| `extract()` | Image bytes + context | `ImageMetadata` | Invalid format, API failure | 5s |
| `extractObjects()` | Image + PMS context | `DetectedObject[]` | Timeout, API error | 3s |
| `extractFaces()` | Image + PMS context | `DetectedFace[]` | Timeout, API error | 3s |
| `extractColors()` | Image + PMS context | `DominantColor[]` | Timeout, API error | 2s |
| `extractGeoHints()` | Image + scene desc | `GeoHint[]` | Scene text missing | 2s |
| `analyzeScene()` | Image + PMS context | Scene string | Timeout, API error | 3s |
| `validateImage()` | Image bytes | Boolean | Format unsupported | 500ms |
| `ensureHealthy()` | — | void | API key missing/invalid | 1s |

---

## 6. Telemetry Events

ImageAnalyzerV3 does not directly emit telemetry. Instead, ExtractorChain captures:

### 6.1 Skill Telemetry (emitted by ExtractorChain)

```typescript
{
  runId: "run_1720605240000_abc123def",
  pipeline: "documentary_ingest",
  stage: "evidence_pack",
  skillName: "extract_image_analysis",
  skillVersion: "2.0.0",
  tenantId: "default",
  region: "us-east-1",
  
  startedAt: "2026-07-10T14:34:00.000Z",
  finishedAt: "2026-07-10T14:34:00.543Z",
  latencyMs: 543,                       // extract() duration
  
  inputSizeBytes: 2048,                 // Image bytes + context
  outputSizeBytes: 4096,                // ImageMetadata JSON
  
  outcome: "success",                   // or "partial", "failure"
  errorType: undefined,                 // or "timeout", "invalid_image", "api_error"
  errorMessageSnippet: undefined,       // First 200 chars of error
  
  instinctName: "fast_classification_v1",
  instinctVersion: "1.0.0",
  
  rulesEnforced: ["deterministic_only"],
  hooksFired: ["enforce_schema_before_commit"]
}
```

### 6.2 Diagnostic Context

**Latency Tracking:**
```typescript
latencies: {
  image_validation: 50,      // validateImage()
  objects_extraction: 400,   // extractObjects()
  faces_extraction: 380,     // extractFaces()
  colors_extraction: 120,    // extractColors()
  geo_hints_extraction: 150, // extractGeoHints()
  scene_analysis: 350,       // analyzeScene()
  total: 543
}
```

**Error Types:**
- `timeout`: Gemini API exceeded deadline
- `invalid_image`: Format unsupported, corrupted, or below size threshold
- `api_error`: API returned non-5xx error (auth, quota, rate limit)
- `validation_error`: Output schema mismatch or confidence threshold failed

---

## 7. Healthcheck & API Credential Strategy

### 7.1 Startup Validation

ImageAnalyzerV3 performs a preflight check during instantiation:

```typescript
export class ImageAnalyzerV3 extends BaseExtractor {
  constructor() {
    super();
    this.validateCredentials();  // throws if invalid
  }

  private validateCredentials(): void {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "[ImageAnalyzerV3] GOOGLE_AI_API_KEY env var is required. " +
        "Obtain from https://ai.google.dev"
      );
    }
    // Optional: ping Gemini to verify key validity
    // this.ensureHealthy(); // async, can be async in constructor via factory
  }
}
```

### 7.2 Environment Configuration

**Required:**
```bash
GOOGLE_AI_API_KEY=your_api_key_here
```

**Optional:**
```bash
GOOGLE_AI_MODEL_ID=gemini-2.0-flash-latest  # Default
IMAGE_ANALYSIS_TIMEOUT_MS=5000              # Default
IMAGE_ANALYSIS_CONFIDENCE_THRESHOLD=0.6     # Default
IMAGE_MAX_SIZE_MB=25                        # Default (Gemini limit)
```

### 7.3 Runtime Healthcheck

```typescript
async ensureHealthy(): Promise<void> {
  try {
    // Minimal validation: can we reach the API?
    const testImage = Buffer.from([0xFF, 0xD8]); // JPEG header
    const response = await this.callGeminiVision(testImage, "test");
    if (!response || !response.success) {
      throw new Error("Gemini API healthcheck failed");
    }
  } catch (err: any) {
    throw new Error(
      `[ImageAnalyzerV3] Healthcheck failed: ${err.message}`
    );
  }
}
```

**When called:**
- First `extract()` call (lazy initialization)
- ExtractorChain startup (optional, configurable via instincts)
- Monitoring dashboards (periodic polling)

---

## 8. Error Handling Strategy

### 8.1 Error Categories

| Category | Root Cause | Handling | Telemetry |
|----------|-----------|----------|-----------|
| **Invalid Image** | Unsupported format, corrupted, too small | Emit warning, return partial metadata | `outcome: "partial"`, `errorType: "invalid_image"` |
| **Timeout** | Gemini API slow or network latency | Retry once with 2x timeout, then fail | `errorType: "timeout"` |
| **API Error (4xx)** | Auth failure, quota exceeded, rate limit | Fail immediately, do not retry | `errorType: "api_error"` |
| **API Error (5xx)** | Gemini service outage | Retry with exponential backoff (max 3) | `errorType: "api_error"` |
| **Validation Error** | Output schema mismatch, null fields | Log warning, fill defaults | `outcome: "partial"` |

### 8.2 Retry Logic

```typescript
async callGeminiVision(
  imageData: ImageData,
  analysisType: string,
  retryCount: number = 0
): Promise<GeminiResponse> {
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 500;

  try {
    return await this.makeGeminiRequest(imageData, analysisType);
  } catch (err: any) {
    if (err.status === 429 && retryCount < MAX_RETRIES) {
      // Rate limit: exponential backoff
      const delay = BASE_DELAY_MS * Math.pow(2, retryCount);
      await new Promise(r => setTimeout(r, delay));
      return this.callGeminiVision(imageData, analysisType, retryCount + 1);
    } else if (err.status >= 500 && retryCount < MAX_RETRIES) {
      // Server error: retry with backoff
      const delay = BASE_DELAY_MS * Math.pow(2, retryCount);
      await new Promise(r => setTimeout(r, delay));
      return this.callGeminiVision(imageData, analysisType, retryCount + 1);
    } else if (err.status === 401) {
      // Auth error: fail immediately
      throw new Error(`[ImageAnalyzerV3] Authentication failed: ${err.message}`);
    } else if (err.code === "TIMEOUT") {
      // Network timeout: fail after retries exhausted
      throw new Error(`[ImageAnalyzerV3] Request timeout after ${retryCount + 1} attempts`);
    } else {
      throw err;
    }
  }
}
```

### 8.3 Graceful Degradation

If image analysis fails after retries:
1. **Partial metadata**: Return bare minimum (filename, mimetype, zero-length feature arrays)
2. **Confidence threshold**: Features below 0.6 confidence are omitted
3. **Warning logs**: Emit to telemetry sink for monitoring
4. **Pipeline continues**: ExtractorChain does not halt on ImageAnalyzer failure

```typescript
try {
  const result = await this.extract(input);
  outcome = "success";
  return result;
} catch (err: any) {
  outcome = "partial";
  errorType = this.classifyError(err);
  // Return minimal metadata with empty features
  return {
    imageId: input.imageId,
    mimeType: input.mimeType,
    fileSizeBytes: input.fileSizeBytes,
    objects: [],
    faces: [],
    colors: [],
    geoHints: [],
    sceneDescription: "",
    analysisConfidence: 0.0,
    warnings: [err.message],
    analyzedAt: new Date().toISOString(),
    analyzedWithModel: "gemini-2.0-flash-latest"
  };
}
```

---

## 9. Implementation Roadmap

### Phase 1: Skeleton (THIS SPEC)
- [x] Define ImageMetadata v2 types
- [x] Define method signatures
- [x] Specify telemetry events
- [x] Specify error handling
- [ ] Create ImageAnalyzerV3.ts stub (methods return empty/mock data)

### Phase 2: API Integration
- [ ] Integrate Google Generative AI SDK (`npm install @google/generative-ai`)
- [ ] Implement `callGeminiVision()` with structured prompts
- [ ] Implement timeout handling
- [ ] Add retry logic with exponential backoff

### Phase 3: Feature Extraction
- [ ] Implement `extractObjects()` (confidence >= 0.6)
- [ ] Implement `extractFaces()` (bounding boxes + attributes)
- [ ] Implement `extractColors()` (top 5 dominant colors)
- [ ] Implement `extractGeoHints()` (landmark detection)
- [ ] Implement `analyzeScene()` (single-sentence description)

### Phase 4: Testing & Validation
- [ ] Unit tests for each extraction method
- [ ] E2E tests with mock Gemini responses
- [ ] Benchmark latency (target: 400–600ms total)
- [ ] Benchmark cost (target: < $0.10/image)
- [ ] Test error paths (timeouts, invalid images, API errors)

### Phase 5: Production Hardening
- [ ] Add request/response logging
- [ ] Add metric collection (input size, token usage)
- [ ] Healthcheck integration with monitoring dashboards
- [ ] Integration test with ExtractorChain
- [ ] Integration test with Instinct engine

---

## 10. Testing Fixtures

### Golden Inputs (to be created in `__fixtures__/`)

```
__fixtures__/
  images/
    portrait.jpg          # Face detection test
    landscape.jpg         # Scene analysis + geo hints
    document_scan.png     # OCR-heavy (optional test)
    diagram.png           # Objects + text
    corrupted.jpg         # Invalid image test
    oversized.bin         # Size limit test (>25MB)
  expected/
    portrait.json         # Expected metadata
    landscape.json
    ...
```

### Test Harness (verifyExtractors.ts integration)

```typescript
const imageAnalyzer = new ImageAnalyzerV3();
const testCases = [
  { input: loadFixture("portrait.jpg"), expected: loadFixture("portrait.json") },
  { input: loadFixture("landscape.jpg"), expected: loadFixture("landscape.json") }
];

for (const testCase of testCases) {
  const result = await imageAnalyzer.extract(testCase.input);
  // Assert result.objects.length > 0
  // Assert result.analysisConfidence >= 0.6
}
```

---

## 11. Configuration & Deployment

### Environment Setup (CI/CD)

```yaml
# .env.test
GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY_TEST}
IMAGE_ANALYSIS_TIMEOUT_MS=5000
IMAGE_ANALYSIS_CONFIDENCE_THRESHOLD=0.6

# .env.production
GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY_PROD}
IMAGE_ANALYSIS_TIMEOUT_MS=3000  # Tighter in production
IMAGE_ANALYSIS_CONFIDENCE_THRESHOLD=0.7  # Higher threshold
```

### Cost Estimation

- **Gemini Flash Latest**: ~$0.075 per image (1M token input billing)
- **Daily harvesting**: 10,000 images → ~$0.75/day → ~$22/month
- **Monthly throughput at $500 budget**: ~6.6M images

### Monitoring Dashboard Metrics

- **Latency**: p50, p95, p99 per image
- **Error rate**: failures + timeouts as % of total
- **Cost**: tokens used, cost per image, daily spend
- **Confidence**: % of images with analysisConfidence >= 0.7
- **Features extracted**: avg objects, faces, colors per image

---

## 12. Future Enhancements

1. **Batch Processing**: Send multiple images to Gemini in parallel (10–50 per batch)
2. **Named Entity Linking**: Link detected faces to entities extracted by SemanticExtractor
3. **OCR Integration**: Optional OCR pass for document images (via Claude Vision)
4. **Semantic Caching**: Cache Gemini responses for identical images (content hash)
5. **Multi-modal Fusion**: Combine image metadata with text context from SemanticExtractor

---

## 13. Document History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-07-10 | Claude Code | Initial specification + skeleton roadmap |

