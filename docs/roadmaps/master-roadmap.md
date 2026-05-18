# Master Roadmap — CIC / Rewrite Labs
# File: docs/roadmaps/master-roadmap.md | Version: 2.5.0 | Date: 2026-05-16
# Status: ACTIVE

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

## CIC Phase 4 — Corpus Persistence + Search (Planned)

- Qdrant vector store integration
- Corpus persistence layer
- Semantic search over people, entities, tags, vectors
- Research query API

---

## CIC Phase 5 — Documentary Synthesis (Planned)

- Timeline reconstruction from corpus
- Narrative draft generation
- Primary source index builder
- Documentary pitch package generator
