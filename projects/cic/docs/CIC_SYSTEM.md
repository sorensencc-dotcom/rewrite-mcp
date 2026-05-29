# CIC_SYSTEM.md

## 0. Multi‑Agent Runtime (External Contract)

CIC participates in a four‑agent orchestration loop with RTK, RRK‑AI, and git‑ai.
The authoritative definition of this runtime — including roles, boundaries,
data contracts, failure modes, and versioning rules — is defined in:

**CIC_AI_RUNTIME_CONTRACT.md**

This contract sits above CIC_SYSTEM.md in the documentation hierarchy and governs
all cross‑agent interactions. CIC_SYSTEM.md continues to define CIC's internal
architecture (ingestion pipeline, extractors, indexer, dashboard, control plane,
and section tracking), while the Runtime Contract defines how CIC interacts with
external agents.

---

## 1. Overview

CIC (Cast Iron Charlie Intelligence Core) is the ingestion, enrichment, and indexing
subsystem of the Cast Iron Charlie documentary intelligence engine. CIC operates
within the Runtime Contract and receives ingestion jobs from RTK, executes them
deterministically, and emits governance deltas to git-ai.

---

## 2. Core Components

### 2.1 Ingestion Pipeline

The deterministic pipeline that processes ingestion jobs:

1. **Harvester** — Fetches source content
2. **Extractor Chain** — Extracts structured data
3. **Indexer** — Indexes vectors into Qdrant
4. **Dashboard** — Surfaces results
5. **Section Tracking** — Maintains deterministic state

### 2.2 Extractor Chain

Pluggable extractors that process different content types:

- ImageAnalyzerV2 — Extracts visual information from images
- ReverseImageSearchExtractor — Finds similar images in archives
- OCR Extractor — Extracts text from images
- Custom Extractors — Domain-specific extraction logic

### 2.3 Indexer + Qdrant

Vector storage and semantic search:

- Stores embeddings with metadata payloads
- Supports semantic search across ingested content
- Maintains backup + restore capabilities

### 2.4 Control Plane

Orchestration and management:

- Job queue management
- Error handling and retry logic
- Resource monitoring
- Health checks

### 2.5 Section Tracking

Deterministic, resumable ingestion state:

- Tracks completion at section boundaries
- Enables pause/resume of ingestion
- Provides auditability
- Ensures monotonic advancement

---

## 3. Data Flows

### 3.1 Ingestion Job (RTK → CIC)

```json
{
  "job_id": "uuid",
  "type": "image | document | reverse_image",
  "source": "path or URL",
  "metadata": { }
}
```

### 3.2 Vector Payload (CIC → Qdrant)

```json
{
  "id": "fileId",
  "vector": [ ... ],
  "payload": {
    "file_path": "...",
    "extractor": "ImageAnalyzerV2 | ReverseImageSearchExtractor",
    "timestamp": "ISO"
  }
}
```

### 3.3 Governance Delta (CIC → git-ai)

```json
{
  "system_version": "1.2.1",
  "state_version": "1.3.1",
  "roadmap_version": "2.6.1",
  "changes": [ ... ]
}
```

---

## 4. Ingestion Determinism

CIC ingestion is:

- **Deterministic** — Every execution follows the same path
- **Resumable** — Can pause and resume at section boundaries
- **Auditable** — Full state visibility at each point
- **Monotonic** — Sections can only advance, never regress

---

## 5. Error Handling

When CIC fails:

- Emit error state to Section Tracking
- Emit drift detection signal to git-ai
- Block Section Tracking advancement
- git-ai runs drift check and emits research goals back to RRK-AI

---

## 6. PMS Integration (Internal to CIC)

The Prompt Management System (PMS) composes and manages prompts for the Extractor Chain.

### 6.1 PMS Role

- **Composes prompts** for extractors based on content type and extraction goals
- **Caches prompts** to avoid redundant generation (SHA256 cache key from template + variables)
- **Manages templates** for different extraction scenarios (vision, reverse_image, ocr, custom)
- **Tracks versions** for reproducibility and drift detection
- **Validates prompts** before passing to extractors

### 6.2 PMS Location in Pipeline

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

### 6.3 PMS Schema

**PromptTemplate:** Template ID, name, version, extractor type, content type, template string, hash, max_tokens.

**ComposedPrompt:** Fully composed prompt with template ID, job ID, variables, cache key, validation state.

**PMSLog:** Execution trace with latency, success/error state, extractor response, trace ID.

See **PMS_INTEGRATION_SPECIFICATION.md** for complete schema definitions.

### 6.4 PMS Caching

- **Cache Key:** `SHA256(template_id + template_version + JSON(variables))`
- **Invalidation:** On template updates or variable changes
- **Metrics:** Cache hit ratio, cache size, lookup time

### 6.5 PMS Configuration

- **Template Registry:** `projects/cic/pms/templates/` (vision/, ocr/, custom/)
- **Format:** YAML (template_id, name, version, template string, max_tokens)
- **Environment:** `PMS_CACHE_ENABLED`, `PMS_CACHE_MAX_SIZE`, `PMS_CACHE_TTL_MS`, `PMS_TEMPLATE_REGISTRY`

### 6.6 PMS Contract

- **Input (Control Plane → PMS):** Job ID, content type, source, extraction goals
- **Output (PMS → Extractor):** Prompt ID, composed content, extractor type, trace ID, metadata
- **No impact on Section Tracking:** PMS is transparent to section advancement

---

## 7. RTK Automation Layer (Active Automation)

RTK orchestrates active automation loops driven by contract-defined research goals:

### 7.1 Burst Ingestion Planner (Mode A)
- Batches goals received from RRK-AI into bounded ingestion sets called bursts.
- Grouping occurs by priority and target type (e.g. `image`, `text`).
- Emits structured `CICIngestionJob` models with assigned PMS templates.

### 7.2 Smoke-Test Gating (Mode B)
- Gates section-tracking state boundaries with verification checks.
- Confirms PMS template compilations succeed and extractors process jobs cleanly.
- Blocks advancement, transitions sections to `blocked:smoke_failed`, and dispatches governance warnings on failures.

### 7.3 Concurrency & Safeguards
- Emits structured backpressure controls.
- Halts executions and alerts the `cic-gitai` feedback channel if the burst-level job failure rate exceeds a 50% threshold.

### 7.4 Telemetry State Endpoint
- Exposes automation state at `GET /rtk/automation/state`.

---

## 8. Future Sections

*Placeholder sections for v1.2.0+:*

- 9. Extractor Chain Deep Dive
- 10. Qdrant Configuration
- 11. Performance & Scaling

---

**Version:** 1.1.0  
**Last Updated:** 2026-05-29  
**Owner:** CIC-SYSTEM  
**Status:** ACTIVE  

See **CIC_AI_RUNTIME_CONTRACT.md** for multi-agent orchestration details.
See **PMS_INTEGRATION_SPECIFICATION.md** for Prompt Management System details.
