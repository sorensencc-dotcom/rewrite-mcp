# ImageAnalyzerV3 Quick Reference

**A cheat sheet for implementers. For full details, see ImageAnalyzerV3.spec.md**

---

## File Locations

| File | Purpose |
|------|---------|
| `ImageAnalyzerV3.ts` | Main implementation (skeleton provided) |
| `ImageAnalyzerV3.spec.md` | Full specification + design rationale |
| `ImageAnalyzerV3.integration.md` | ExtractorChain + Instinct engine integration |
| `__fixtures__/images/` | Test images (to be created) |

---

## Key Classes & Types

```typescript
// Main class (extends BaseExtractor)
class ImageAnalyzerV3 {
  async extract(input: ImageAnalyzerInput): Promise<ImageAnalysisResult>;
  // Stub methods to implement:
  private async extractObjects(input: ImageAnalyzerInput): Promise<DetectedObject[]>;
  private async extractFaces(input: ImageAnalyzerInput): Promise<DetectedFace[]>;
  private async extractColors(input: ImageAnalyzerInput): Promise<DominantColor[]>;
  private async extractGeoHints(input: ImageAnalyzerInput, scene: string): Promise<GeoHint[]>;
  private async analyzeScene(input: ImageAnalyzerInput): Promise<string>;
}

// Output type
interface ImageMetadata {
  imageId: string;
  objects: DetectedObject[];
  faces: DetectedFace[];
  colors: DominantColor[];
  geoHints: GeoHint[];
  sceneDescription: string;
  analysisConfidence: number;  // 0.0–1.0
  analyzedAt: string;          // ISO timestamp
  analyzedWithModel: string;   // "gemini-2.0-flash-latest"
  warnings?: string[];
}
```

---

## Implementation Checklist

### Phase 1: Setup (✓ Already done)
- [x] Create ImageAnalyzerV3.ts skeleton
- [x] Define ImageMetadata v2 types
- [x] Define method signatures
- [ ] Create test fixtures (__fixtures__/images/)

### Phase 2: Core Implementation
- [ ] Implement `validateCredentials()` — check GOOGLE_AI_API_KEY
- [ ] Implement `ensureHealthy()` — ping Gemini API
- [ ] Implement `validateImage()` — format + size + header checks
- [ ] Implement `callGeminiVision()` — API wrapper + retry logic
- [ ] Implement `computeAggregateConfidence()` — weighted average

### Phase 3: Feature Extraction
- [ ] Implement `extractObjects()` → DetectedObject[]
- [ ] Implement `extractFaces()` → DetectedFace[]
- [ ] Implement `extractColors()` → DominantColor[]
- [ ] Implement `analyzeScene()` → string
- [ ] Implement `extractGeoHints()` → GeoHint[]

### Phase 4: Testing
- [ ] Unit tests for each method
- [ ] Integration test with ExtractorChain
- [ ] verifyExtractors.ts harness integration
- [ ] Error path testing (timeout, invalid image, API error)

### Phase 5: Production
- [ ] Update ExtractorChain to recognize ImageAnalyzerV3
- [ ] Add skill label mapping: name === "ImageAnalyzerV3" → "extract_image_analysis"
- [ ] Deploy with CI/CD (env vars, secret management)
- [ ] Monitor telemetry (latency, error rate, confidence)

---

## Vision API Choice: Why Gemini Flash Latest?

| Why Gemini? | Why NOT Claude Vision? |
|-------------|--------|
| 400–600ms latency (fits 800ms budget) | 800–1200ms (exceeds budget) |
| $0.075/image (50% cheaper) | $0.15/image (2x cost) |
| Objects + colors + faces (all we need) | Excellent but slower |
| Optimized for batch processing | Standard rate limiting |

**Trade-off**: Slightly lower face *descriptions*, no OCR. Accept these for speed + cost.

---

## Environment Variables

```bash
# Required
GOOGLE_AI_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxxxx

# Optional (with defaults)
IMAGE_ANALYSIS_TIMEOUT_MS=5000              # Default 5s
IMAGE_ANALYSIS_CONFIDENCE_THRESHOLD=0.6     # Default 0.6
IMAGE_MAX_SIZE_MB=25                        # Default 25MB (Gemini limit)
```

---

## Telemetry (Emitted by ExtractorChain, not ImageAnalyzerV3)

```typescript
{
  skillName: "extract_image_analysis",
  skillVersion: "2.0.0",
  latencyMs: 543,
  inputSizeBytes: 2048,
  outputSizeBytes: 4096,
  outcome: "success",  // or "partial", "failure"
  errorType: "timeout",  // or "invalid_image", "api_error", "validation_error"
  errorMessageSnippet: "Request timeout after 3 attempts"
}
```

---

## Integration Points

1. **ExtractorChain**: Calls `extract()`, emits telemetry
   ```typescript
   const chain = new ExtractorChain()
     .add(new ImageAnalyzerV3());
   await chain.run(rawText, { docType: "bibliography", ... });
   ```

2. **Instinct Engine**: Can skip ImageAnalyzer via policy
   ```typescript
   {
     avoid_skills: ["extract_image_analysis"]  // ← Skip if set
   }
   ```

3. **PMS**: Can provide structured prompts
   ```typescript
   const res = await input.pmsEngine.requestPrompt("identify_objects", input);
   ```

---

## Error Handling Strategy

| Error | Handling | Telemetry |
|-------|----------|-----------|
| Invalid image format | validateImage() → throw | outcome: "partial" |
| Timeout (Gemini slow) | Retry 3x with backoff, then fail | outcome: "partial", errorType: "timeout" |
| Auth failure (401) | Fail immediately, no retry | outcome: "failure", errorType: "api_error" |
| Rate limit (429) | Retry 3x with exponential backoff | outcome: "partial" (if retries succeed) |
| Server error (5xx) | Retry 3x with exponential backoff | outcome: "partial" (if retries succeed) |

**Key**: Return partial metadata on failure, don't throw (unless fatal).

---

## Gemini API Call Pattern

```typescript
// 1. Encode image as base64
const imageBase64 = input.imageData.toString("base64");

// 2. Build prompt for Gemini
const prompt = `Identify all objects in this image...`;

// 3. Call Gemini Flash Latest
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-latest" });

const response = await model.generateContent({
  contents: [{
    role: "user",
    parts: [
      { text: prompt },
      { inlineData: { mimeType: input.mimeType, data: imageBase64 } }
    ]
  }]
});

// 4. Parse response
const text = response.response.text();
const objects = parseObjects(text);  // Parse into DetectedObject[]

// 5. Filter by confidence
return objects.filter(o => o.confidence >= this.confidenceThreshold);
```

---

## Testing Fixtures (to create)

```
__fixtures__/
  images/
    portrait.jpg          # Single face, clear background
    landscape.jpg         # Scenic view, landmarks visible
    document_scan.png     # Text-heavy (optional)
    multiple_people.jpg   # Several faces, objects
    corrupted.jpg         # Invalid data (for error test)
    oversized.bin         # >25MB (for size limit test)
  expected/
    portrait.json         # { objects: [...], faces: [...], colors: [...], ... }
    landscape.json
    ...
```

---

## Factory Pattern (Recommended)

Instead of `new ImageAnalyzerV3()`, use factory:

```typescript
export async function createImageAnalyzer(): Promise<ImageAnalyzerV3> {
  const analyzer = new ImageAnalyzerV3();  // Throws if API key missing
  await analyzer["ensureHealthy"]();       // Throws if API unavailable
  return analyzer;
}

// Usage
const analyzer = await createImageAnalyzer();
const result = await analyzer.extract(input);
```

---

## Key Decisions (Already Made)

| Decision | Rationale |
|----------|-----------|
| Use Gemini 2.0 Flash Latest | Speed + cost optimal for documentary harvesting |
| Parallel feature extraction | Faster processing (objects, faces, colors, scene in parallel) |
| Confidence threshold filtering | Reduce noise, keep only high-confidence results |
| No OCR support | Not required for metadata extraction, can add later |
| Graceful degradation on timeout | Return partial metadata instead of failing pipeline |
| Retry with exponential backoff | Handle transient API failures smoothly |

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Latency (p50) | 400ms | Core Gemini call |
| Latency (p95) | 550ms | Includes retries |
| Latency (p99) | 800ms | Budget ceiling (shared with other extractors) |
| Error rate | < 5% | Failures + timeouts |
| Cost per image | < $0.10 | Goal: $0.075 |
| Confidence >= 0.7 | > 80% of images | Quality bar |

---

## Monitoring & Alerts

**Key metrics to track in Prometheus/Grafana:**

```
extract_image_analysis_latency_ms{quantile="p50"}
extract_image_analysis_latency_ms{quantile="p95"}
extract_image_analysis_latency_ms{quantile="p99"}
extract_image_analysis_errors_total{type="timeout"}
extract_image_analysis_errors_total{type="api_error"}
extract_image_analysis_errors_total{type="invalid_image"}
extract_image_analysis_tokens_input_total
extract_image_analysis_tokens_output_total
extract_image_analysis_confidence_distribution{bin="0.0-0.2"}  // etc.
```

**Alert thresholds:**
- `latency_p99 > 1000ms` → warning
- `error_rate > 5%` → critical
- `auth_failures > 10/hour` → critical
- `monthly_cost > $500` → warning

---

## FAQ

**Q: Why not Claude Vision?**  
A: Slower (800–1200ms), more expensive ($0.15/image), overkill for structured extraction. Gemini Flash Latest is optimized for our use case.

**Q: What if an image fails to analyze?**  
A: Return partial metadata (empty objects[], faces[], etc.) with warnings. Don't throw—let chain continue.

**Q: How do I skip ImageAnalyzer for certain documents?**  
A: Use instinct policies: `avoid_skills: ["extract_image_analysis"]` in trigger condition.

**Q: What's the cost per month?**  
A: At 10k images/day: ~$22/month ($0.075/image × 10k × 30). Optimize via batching.

**Q: Can I use cached results?**  
A: Yes, future enhancement: hash image content, cache Gemini responses. Saves 50% cost.

**Q: How do I test without API key?**  
A: Mock GoogleGenerativeAI in unit tests:
```typescript
jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: jest.fn(() => Promise.resolve({ response: { text: () => "..." } }))
    }))
  }))
}));
```

---

## Links & Resources

| Resource | URL |
|----------|-----|
| Gemini API | https://ai.google.dev |
| @google/generative-ai SDK | https://www.npmjs.com/package/@google/generative-ai |
| Full Specification | ImageAnalyzerV3.spec.md |
| Integration Guide | ImageAnalyzerV3.integration.md |
| ExtractorChain | extractor-chain.ts |

