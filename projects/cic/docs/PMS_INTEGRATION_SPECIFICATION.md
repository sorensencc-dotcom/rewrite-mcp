# PMS Integration Specification (v1.1.0)

**Version:** 1.0.0-planning  
**Status:** Ready for implementation  
**Release:** v1.1.0  
**Owner:** CIC-SYSTEM  
**Date:** 2026-05-29

---

## Executive Summary

The Prompt Management System (PMS) is an internal CIC subsystem that composes and manages prompts for the Extractor Chain. This specification formalizes PMS as a first-class component, defines its schema, data contracts, and integration points with the ingestion pipeline.

**Scope:** PMS lives entirely inside CIC. It does not cross agent boundaries.

---

## 1. PMS Role & Responsibilities

### 1.1 What PMS Does

- **Composes prompts** for each extractor based on content type and extraction goals
- **Caches prompts** to avoid redundant generation
- **Manages templates** for different extraction scenarios (vision, reverse image, OCR)
- **Tracks prompt versions** for reproducibility and drift detection
- **Validates prompts** before passing to extractors

### 1.2 What PMS Does NOT Do

- Does not execute extractors (Extractor Chain does that)
- Does not store vectors (Indexer does that)
- Does not communicate with external agents (RTK, RRK-AI, git-ai)
- Does not manage ingestion jobs (Control Plane does that)

### 1.3 PMS Location in Pipeline

```
Harvester
    ↓
Control Plane (gets job)
    ↓
PMS (composes prompt for extractor)
    ↓
Extractor Chain (executes extraction)
    ↓
Indexer (stores vectors)
    ↓
Dashboard / Section Tracking
```

---

## 2. PMS Schema

### 2.1 Prompt Template Schema

```typescript
interface PromptTemplate {
  template_id: string;           // uuid
  name: string;                  // e.g., "ImageAnalyzerV2-Vision"
  version: string;               // semver
  extractor_type: "vision" | "reverse_image" | "ocr" | "custom";
  content_type: "image" | "document" | "pdf";
  
  // The template with placeholders
  template: string;              // e.g., "Analyze this image: {image_path}"
  
  // Metadata
  created_at: ISO8601;
  updated_at: ISO8601;
  hash: string;                  // SHA-256 of template content
  
  // Versioning
  replaces_template_id?: string; // if this is a replacement
  deprecated: boolean;
  
  // Constraints
  max_tokens: number;
  temperature?: number;
  top_p?: number;
}
```

### 2.2 Composed Prompt Schema

```typescript
interface ComposedPrompt {
  prompt_id: string;             // uuid
  template_id: string;           // reference to PromptTemplate
  job_id: string;                // reference to ingestion job
  
  // The fully composed prompt (template with values filled in)
  content: string;
  
  // Variable bindings
  variables: Record<string, string | number | boolean>;
  
  // Metadata
  created_at: ISO8601;
  extractor_target: string;      // e.g., "ImageAnalyzerV2"
  
  // Validation
  is_valid: boolean;
  validation_errors?: string[];
  
  // Caching
  cache_key: string;             // hash of template + variables
  cached: boolean;
  cached_at?: ISO8601;
}
```

### 2.3 PMS Execution Log Schema

```typescript
interface PMSLog {
  log_id: string;                // uuid
  prompt_id: string;             // reference to ComposedPrompt
  job_id: string;                // reference to ingestion job
  
  // Execution
  executed_at: ISO8601;
  execution_time_ms: number;
  success: boolean;
  
  // Errors
  error?: string;
  error_type?: "validation" | "composition" | "execution";
  
  // Output
  extractor_response?: Record<string, unknown>;
  
  // Tracing
  trace_id: string;              // for cross-system correlation
}
```

---

## 3. PMS Data Contracts

### 3.1 Input Contract: Job → PMS

```typescript
interface JobToPMSInput {
  job_id: string;                // from RTK
  content_type: "image" | "document" | "pdf";
  source: string;                // file path or URL
  extraction_goals: string[];    // e.g., ["extract_text", "identify_objects"]
  context?: Record<string, unknown>;
}
```

**Responsibility:** Control Plane provides this to PMS

### 3.2 Output Contract: PMS → Extractor Chain

```typescript
interface PMSToExtractorOutput {
  prompt_id: string;
  content: string;               // the actual prompt
  extractor_type: "vision" | "reverse_image" | "ocr";
  job_id: string;
  trace_id: string;
  metadata: {
    template_id: string;
    template_version: string;
    composed_at: ISO8601;
  }
}
```

**Responsibility:** PMS provides this to Extractor Chain

### 3.3 Cache Hit Contract: PMS Internal

```typescript
interface CacheHit {
  cache_key: string;             // hash of template + variables
  cached_prompt: ComposedPrompt;
  cache_hit_ratio: number;       // % of queries hitting cache
  cached_at: ISO8601;
  age_ms: number;                // time since cache entry created
}
```

**Responsibility:** PMS maintains internal cache and tracks hits

---

## 4. PMS Integration Points

### 4.1 Control Plane → PMS

**When:** After job validation, before extractor dispatch

```typescript
const composedPrompt = await pms.compose({
  job_id: job.job_id,
  content_type: job.type,
  source: job.source,
  extraction_goals: ["extract_text", "identify_objects"]
});

// Dispatch to extractor
await extractorChain.execute(composedPrompt);
```

### 4.2 PMS → Extractor Chain

**Contract:** Extractor Chain accepts `PMSToExtractorOutput` and executes

```typescript
interface ExtractorInput {
  prompt_id: string;
  content: string;               // PMS-composed prompt
  extractor_type: string;
  job_id: string;
  trace_id: string;
}
```

### 4.3 Extractor Chain → Section Tracking

**No change to existing contract.** PMS is transparent to Section Tracking.

---

## 5. PMS Caching Strategy

### 5.1 Cache Key Generation

```
cache_key = SHA256(template_id + template_version + JSON(variables))
```

### 5.2 Cache Invalidation

Cache entries are valid for:
- **Template Updates:** Invalidate all entries for that template
- **Variable Changes:** Recompute if variables change (automatic)
- **TTL:** Optional per-template TTL (default: no TTL)

### 5.3 Cache Metrics

Track for observability:
- Cache hit ratio (% of lookups hitting cache)
- Cache miss count
- Cache size (number of entries)
- Average cache lookup time

---

## 6. PMS Error Handling

### 6.1 Validation Errors

**When:** Template or variables fail validation

```typescript
interface ValidationError {
  type: "invalid_template" | "invalid_variables" | "missing_variables";
  message: string;
  field?: string;
}
```

**Handling:** Emit error to PMS Log, do NOT pass to extractor

### 6.2 Composition Errors

**When:** Prompt composition fails (template expansion error)

```typescript
interface CompositionError {
  type: "template_expansion_failed" | "variable_substitution_failed";
  message: string;
  template_id: string;
}
```

**Handling:** Log error, fallback to default prompt (if available)

### 6.3 Execution Errors

**When:** PMS can compose but extractor fails

```typescript
// Extractor failure is NOT a PMS failure
// PMS logs execution, Control Plane handles retry
```

**Handling:** PMS records in log, Control Plane decides retry

---

## 7. PMS Configuration

### 7.1 Template Registry Location

```
projects/cic/pms/templates/
  vision/
    image-analyzer-v2.yaml
    reverse-image-search.yaml
  ocr/
    ocr-default.yaml
  custom/
    domain-specific.yaml
```

### 7.2 Configuration File Format

```yaml
# image-analyzer-v2.yaml
template_id: img-analyzer-v2-001
name: ImageAnalyzerV2-Vision
version: 1.0.0
extractor_type: vision
content_type: image

template: |
  Analyze this image for the following:
  - Text content (OCR)
  - Objects and their relationships
  - Key visual elements
  - Historical context (if applicable)
  
  Image: {image_path}
  Context: {context}

max_tokens: 2048
temperature: 0.3
top_p: 0.9

deprecated: false
```

### 7.3 Environment Variables

```bash
PMS_CACHE_ENABLED=true
PMS_CACHE_MAX_SIZE=10000
PMS_CACHE_TTL_MS=3600000
PMS_TEMPLATE_REGISTRY=projects/cic/pms/templates/
PMS_LOG_LEVEL=info
```

---

## 8. PMS Testing Strategy

### 8.1 Unit Tests

```
tests/pms/
  pms.unit.test.ts
  - compose() with valid input
  - compose() with invalid variables
  - cache hit/miss
  - cache invalidation
  - validation
```

### 8.2 Integration Tests

```
tests/pms-integration/
  pms-extractor.integration.test.ts
  - PMS → Extractor handoff
  - Error propagation
  - Section tracking updates
```

### 8.3 Contract Tests

```
tests/runtime/
  pms-control-plane.contract.test.ts
  - Input validation
  - Output schema compliance
```

---

## 9. PMS Observability

### 9.1 Metrics to Track

- **Composition latency** (ms)
- **Cache hit ratio** (%)
- **Template usage** (count by template_id)
- **Error rate** (% of compositions failing)
- **Cache size** (number of entries)

### 9.2 Logs to Emit

```json
{
  "event": "prompt_composed",
  "prompt_id": "...",
  "job_id": "...",
  "template_id": "...",
  "cache_hit": true,
  "latency_ms": 45,
  "timestamp": "ISO8601"
}
```

### 9.3 Dashboards (for v1.2.0)

- PMS composition latency (p50, p95, p99)
- Cache hit ratio over time
- Template usage breakdown
- Error rate by template

---

## 10. Migration & Backward Compatibility

### 10.1 Current State (v1.0.0)

Extractors currently compose their own prompts (implicit).

### 10.2 Transition (v1.1.0)

- Extract prompt composition logic into PMS
- Update Extractor Chain to accept PMS-composed prompts
- Add fallback: if PMS unavailable, use extractor default

### 10.3 Validation

- All existing extraction behavior must remain unchanged
- New PMS cache must not change results
- Latency must not increase (expect 10-50ms PMS overhead)

---

## 11. Implementation Checklist

- [ ] Design PMS module structure
- [ ] Implement PromptTemplate schema + validation
- [ ] Implement ComposedPrompt schema
- [ ] Implement cache (in-memory + optional Redis)
- [ ] Implement template registry loader
- [ ] Implement Control Plane → PMS integration
- [ ] Implement PMS → Extractor integration
- [ ] Write unit tests (pms.unit.test.ts)
- [ ] Write integration tests (pms-extractor.integration.test.ts)
- [ ] Add PMS contract test (pms-control-plane.contract.test.ts)
- [ ] Update SYSTEM.md with PMS section
- [ ] Add PMS configuration docs
- [ ] Load test: cache under 100 concurrent jobs
- [ ] Merge PR to main
- [ ] Update Runtime Contract v1.1.0

---

## 12. Success Criteria (v1.1.0 Release)

- ✓ PMS is fully integrated into ingestion pipeline
- ✓ All existing extraction behavior unchanged
- ✓ Cache hit ratio > 50% for repeated templates
- ✓ PMS composition latency < 100ms (p95)
- ✓ All tests passing (unit + integration + contract)
- ✓ SYSTEM.md documents PMS architecture
- ✓ No drift between SYSTEM.md, code, and tests
- ✓ Runtime Contract v1.1.0 published

---

**Version:** 1.0.0-planning  
**Status:** Ready for Phase 1 implementation  
**Next:** Design PMS module structure and create template registry
