# Master Roadmap — CIC / Rewrite Labs
# File: docs/roadmaps/master-roadmap.md | Version: 2.6.0 | Date: 2026-06-09
# Status: ACTIVE
# Last Updated: 2026-06-09 (Phase 4.4 complete, Phases 5–6 roadmap added)

---

## CIC Phase 1 — Ingestion Foundation (Complete)

- Queue system (BullMQ) with DLQ and drift detection
- Ingestion pipeline: file, URL, Drive sources
- Schema validation + normalization stages
- Telemetry events and metrics

---

## CIC Phase 2 — Harvester + Orchestrator (Complete)

- Harvester v2.0.0: file, web, sidecar adapters
- Orchestrator v3.0.0: DAG-based execution with replay and scheduler
- Agent registry: HarvesterAgent, IngestorAgent
- Control plane service + Operator UI (Pipelines, Agents, Runs, Metrics tabs)
- Pipelines: harvestToIngest, ingestToOrchestrate

---

## CIC Phase 3 — Analyzer Integration (Complete)
### Delivered: 2026-05-16

- **Analyzer subsystem online**
  - IExtractor interface contract (`analyzers/iExtractor.js`)
  - ImageAnalyzerV2 (v2.0.0): 4 parallel sub-extractors (scene graph, face clusters, place recognition, cross-references)
  - Analyzer registry: `image` and `image:v2` → ImageAnalyzerV2

- **Extractor wrapper layer**
  - `ImageAnalyzerV2Extractor.js`: adapts IExtractor output to corpus payload shape
  - Corpus payload: `{ faces, objects, labels, embeddings }`
  - Label compiler: aggregates scene objects + place candidates + public figures
  - Embedding hints: per-face textual descriptors

- **Extractor Registry**
  - `extractors/registry.js`: separate from analyzer registry
  - `getExtractor(key)` resolver; both `image` and `image:v2` wired

- **Sidecar pipeline** (`pipelines/sidecar.js`)
  - MIME → extractor key dispatch (jpeg, png, webp, gif → `image:v2`)
  - Zero silent failures: unknown MIME returns `{ status: 'unsupported' }`
  - Registry gap throws (not silently returns null)

- **Corpus builder pipeline** (`pipelines/corpusBuilder.js`)
  - Stateless merge: `mergeIntoCorpus(corpus, extract)` returns new corpus
  - Deduplicates tags across merges
  - `buildCorpus(job)` convenience: sidecar → merge in one call
  - Extensible: new extract types add new `if (extract.type === X)` branches

- **Pipelines index updated** (`pipelines/index.js` v1.1.0)
  - Exports: `runSidecar`, `createCorpus`, `mergeIntoCorpus`, `buildCorpus`

- **Operator UI — Analyzers tab** (`operator-ui/control-room.html` v1.1.0)
  - New "Analyzers" tab: polls `/api/control-plane/analyzers` every 30s
  - Renders per-analyzer: name, key, ONLINE/OFFLINE, GEMINI_API_KEY present/missing, detail, error
  - Inline init — no separate JS module required

- **Analyzer Status service** (`services/analyzer-status.js` v1.0.0)
  - `getAnalyzerStatus()`: probes all registered analyzers in parallel
  - Dynamic import guard against GEMINI_API_KEY module-level throw
  - Returns `{ analyzers: AnalyzerStatus[], timestamp: string }`

- **Control Plane — Analyzers route** (`services/control-plane/routes/analyzers.js` v1.0.0)
  - `GET /api/control-plane/analyzers` → full status snapshot
  - `GET /api/control-plane/analyzers/:key` → single analyzer by key

- **Control Plane server updated** (`services/control-plane/index.js` v1.1.0)
  - Analyzers routes wired into dispatch table
  - Routes index updated

---

## CIC Phase 4.4 — Repomix Integration (Complete)
### Delivered: 2026-06-09

**Owner:** Chris Sorensen (Claude Code)  
**Execution:** Days 2–5 (2026-06-08 to 2026-06-09)  
**Status:** ✅ COMPLETE — Production-ready

- **RepositoryIngestion module** (300+ lines)
  - Framework detection: React, Vue, Angular, Django, Rails, Laravel, Express
  - Secret validation: fail-fast on API_KEY, SECRET, TOKEN, PASSWORD, AWS_, GCP_
  - Token budgeting: 30% analysis, 50% redesign, 20% validation (5× total)
  - Deterministic Repomix invocation with JSON parsing

- **RepoAnalysisBridge** (172 lines)
  - Architecture detection: monolith, modular, microservices (3/3 tests ✅)
  - Code pattern extraction: naming, async/await, testing, error handling, documentation
  - KG node creation: ExternalRepositoryNode with full metadata

- **Token Telemetry Pipeline**
  - 211,000 → 137,150 tokens (35% compression) on 5-repo validation
  - Per-tenant visibility: acme-corp, techflow, startup-xyz
  - Per-framework distribution: React 46%, Rails 19.4%, Django 18%, Vue 16.6%
  - CodeBurn integration: all ingestions logged

- **Integration Test** (Day 5)
  - All 6 success criteria passing ✅
  - Telemetry events valid (5/5)
  - Architecture detection working (modular detected)
  - Pattern extraction functional (async, tests, docs)
  - KG nodes ready for Phase 24+ integration

**Ref:** `PHASE_4.4_COMPLETION_SUMMARY.md` (full technical spec + metrics)

---

## CIC Phase 4 — Corpus Persistence + Search (Planned)
### Timeline: 2026-06-15 through 2026-06-29

- Qdrant vector store integration
- Corpus persistence layer
- Semantic search over people, entities, tags, vectors
- Research query API

**Blocking:** Phase 4.4 (Repomix integration upstream) — ✅ COMPLETE

---

## CIC Phase 5 — Documentary Synthesis (Planned)
### Timeline: 2026-07-01 through 2026-07-15

- Timeline reconstruction from corpus
- Narrative draft generation
- Primary source index builder
- Documentary pitch package generator

**Dependencies:** Phase 4 (corpus persistence)
