# CIC Master Roadmap
Version: 2.5.1
Updated: 2026-07-10
Author: Chris Sorensen

Cast Iron Charlie Documentary Research Engine
Phase Status: Phase 1 — 80% IMPLEMENTED (vision integration pending) | Phase 2 — 🔄 80% COMPLETE | Phase 3 — PENDING 🔲

Living document — update on each phase milestone or architecture change.
Version increments: Major = phase boundary. Minor = architecture change. Patch = status/checklist update.

---

## Table of Contents
1. Current State Summary
2. Agent Taxonomy
3. Phased Deployment
   - 3.1 Phase 1 — Foundation (Q3–Q4 2026) — COMPLETE
   - 3.2 Phase 2 — Scale & Integration (Q1–Q2 2027) — 80% COMPLETE
   - 3.3 Phase 3 — Production & Optimization (Q3–Q4 2027) — PENDING
4. Integration Architecture
5. Governance
6. KPIs
7. Implementation Checklist

---

## 1. Current State Summary

**As of 2026-07-10 — Actual runtime discovery**

### 1.1 Phase Summary

| Phase | Status | Completion |
|---|---|---|
| Phase 1 — Foundation | 80% IMPLEMENTED | Vision integration pending |
| Phase 2 — Scale & Integration | 🔄 IN PROGRESS | 80% |
| Phase 3 — Production & Optimization | 🔲 PENDING | — |

### 1.2 Delivered Components & Architecture

**Core Analyzer & Extractor System (v2 pattern):**

| Component | File(s) | Status |
|---|---|---|
| IExtractor Interface v1.0.0 | `src/cic/analyzers/iExtractor.js` | ✅ Complete - shared contract for all extractors |
| Analyzer Registry v1.0.0 | `src/cic/analyzers/registry.js` | ✅ Complete - maps analyzer keys to IExtractor modules (raw Gemini calls) |
| Extractor Registry v1.0.0 | `src/cic/extractors/registry.js` | ✅ Complete - wraps analyzers for corpus payload output |
| **ImageAnalyzerV2 v2.0.0** | `src/cic/analyzers/ImageAnalyzerV2.js` | ✅ **LIVE** - 4 sub-extractors, Gemini 2.0 Flash Latest active |
| - Sub-extractor 1: Scene Graph | ImageAnalyzerV2.js:195-231 | ✅ Objects, relationships, spatial layout, dominant colors, era detection |
| - Sub-extractor 2: Face Clusterer | ImageAnalyzerV2.js:317-368 | ✅ Face detection, bounding boxes, clustering, identity hints |
| - Sub-extractor 3: Place Recognizer | ImageAnalyzerV2.js:430-470 | ✅ Landmarks, geolocation, architectural style, indoor/outdoor classification |
| - Sub-extractor 4: Cross-Referencer | ImageAnalyzerV2.js:561-611 | ✅ Public figures, locations, reverse image hints, evidence bundle |
| ImageAnalyzerV2Extractor v1.0.0 | `src/cic/analyzers/ImageAnalyzerV2Extractor.js` | ✅ Wrapper for corpus payload adaptation |

**Orchestration & DAG Engine (v3 architecture):**

| Component | File(s) | Status |
|---|---|---|
| **Orchestrator v3.0.0** | `src/cic/orchestrator/v3.0.0/index.js` | ✅ **LIVE** - DAG engine, scheduler, registry, MCP bus, replay |
| DAG Creation | `orchestrator/v3.0.0/dag/createDag.js` | ✅ Complete - builds DAG structure (nodes, edges, metadata) |
| DAG Mutation | `orchestrator/v3.0.0/dag/mutateDag.js` | ✅ Complete |
| DAG Execution | `orchestrator/v3.0.0/dag/runDag.js` | ✅ Complete - sequential node execution w/ registry dispatch |
| Module Registry | `orchestrator/v3.0.0/registry/registry.js` | ✅ Complete - frozen module namespace for DAG node resolution |
| Scheduler | `orchestrator/v3.0.0/scheduler/scheduler.js` | ✅ Complete |
| Replay Engine | `orchestrator/v3.0.0/replay/replay.js` | ✅ Complete |
| MCP Bus | `orchestrator/v3.0.0/mcp/mcpBus.js` | ✅ Complete |

**Routing & Dispatch (conditional MIME-based):**

| Component | File(s) | Status |
|---|---|---|
| Sidecar Pipeline v1.0.0 | `src/cic/pipelines/sidecar.js` | ✅ **LIVE** - MIME-based conditional routing |
| - MIME to extractor dispatch | sidecar.js:30-35 | ✅ image/jpeg, image/png, image/webp, image/gif to "image:v2" |
| - Extractor resolver | sidecar.js:47-49 | ✅ resolveExtractorKey() maps MIME to registry key |
| - Failure handling | sidecar.js:66-106 | ✅ Unsupported MIME, registry gaps, extractor errors all logged |
| Pipeline: ingestToOrchestrate v1.0.0 | `src/cic/pipelines/ingestToOrchestrate.js` | ✅ Chains ingestion to DAG creation to DAG execution |

**Telemetry Sink Infrastructure:**

| Component | File(s) | Status |
|---|---|---|
| Telemetry Facade v1.0.0 | `src/cic/ingestion/v1.0.0/telemetry/telemetry.js` | ✅ **SKELETON** - trackIngestionStart, trackIngestionSuccess, trackIngestionFailure |
| Events module | `src/cic/ingestion/v1.0.0/telemetry/events.js` | ✅ **SKELETON** - emitEvent() interface defined, placeholder impl |
| Metrics module | `src/cic/ingestion/v1.0.0/telemetry/metrics.js` | ✅ **SKELETON** - recordMetric() interface defined, placeholder impl |
| **Missing (Phase 2):** | — | 🔲 Event bus integration, metrics backend, runId tracking, skill metrics, outcome tracking |

**Type System (v2 contracts):**

| Component | File(s) | Status |
|---|---|---|
| CIC Types v1.0.0 | `src/cic/core/types.js` | ✅ Complete - CicContext, HarvesterPayload, DagNode, DagEdge, Dag, AgentContract, PipelineContract |

**Legacy Phase 1 Components (retained for reference):**

| Component | File(s) | Status |
|---|---|---|
| Ingestion Agent Core | `src/ingestion/ingestionAgent.js` | ✅ v1.0.1 - assetId assigned post-validation |
| Ingestion HTTP Server | `src/ingestion/ingestionServer.js` | ✅ v1.0.0 - native Node.js, multipart parser, /ingest + /health |
| Synthesis Agent Core | `src/synthesis/synthesisAgent.js` | ✅ v1.0.0 - entity/edge/timeline to ResearchBrief |
| Brief Builder | `src/synthesis/briefBuilder.js` | ✅ v1.0.0 - Levenshtein dedup, Gemini resolution |
| Research Orchestrator Core | `src/orchestrator/researchOrchestrator.js` | ✅ v1.0.0 - entity graph, multi-source routing |
| Audit Agent Core | `src/audit/auditAgent.js` | ✅ v1.0.0 - immutable audit records, 4-rule anomaly engine |

### 1.3 Active Pipeline Sequence (9 Stages)

```
Maintenance → Harvester → Sweeper → Enricher (Phase 2.5) → Indexer → Corpus Builder
```

Ingestion Agent is the authoritative intake boundary feeding `assets` before pipeline runs.

### 1.4 End-to-End Data Flow

```
Ingestion Agent
     ↓  assets table (status: pending)
     ↓  asset.ingested → Castironforge MCP
Extractor Enricher
     ↓  IExtractor dispatch
     ↓  entities/topics tables + sidecar.json
     ↓  asset.enriched → Castironforge MCP
Research Orchestrator
     ↓  entity_nodes + entity_edges upserts
     ↓  timeline_entries construction
     ↓  orchestration.complete → Castironforge MCP
Synthesis Agent
     ↓  ResearchBrief (Levenshtein dedup + Gemini resolution)
     ↓  research_briefs table
     ↓  synthesis.complete → Castironforge MCP
Audit Agent
     ↓  audit_log (append-only, SHA-256 per record)
     ↓  4-rule anomaly engine
```

### 1.5 Live CLI Commands

| Command | Function |
|---|---|
| `npm run ingest` | Start Ingestion Agent HTTP server |
| `npm run enrich` | AI enrichment stage on pending assets |
| `npm run extractor:test` | Standalone extractor smoke-test |
| `npm run orchestrator` | Start Research Orchestrator Agent |
| `npm run synthesis` | Start Synthesis Agent server |
| `npm run audit` | Start Audit Agent (full event stream subscription) |
| `npm run mcp` | Start Castironforge MCP — HTTP on MCP_HTTP_PORT + WebSocket on MCP_WS_PORT |
| `npm run pipeline` | Full 9-stage pipeline (includes Enricher) |
| `npm run test` | Full integration test suite (11 tests: 6 E2E + 5 contract) |
| `npm run status` | Print current system status |

### 1.6 Database Schema (All Tables Live)

| Table | Key Columns | Notes |
|---|---|---|
| `assets` | asset_id, mime_type, source_type, storage_path, source_meta, status, ingested_at, updated_at | Authoritative intake record |
| `research_briefs` | brief_id, asset_id, generated_at, brief_json, confidence, status, created_at | Synthesis Agent output |
| `entity_nodes` | node_id, label, type, first_seen, last_seen, occurrence_count | Orchestrator-maintained graph |
| `entity_edges` | edge_id, source_node, target_node, relationship, asset_ids | Orchestrator-maintained graph |
| `timeline_entries` | entry_id, asset_id, place_label, geo_hint, scene, timestamp, created_at | Orchestrator-built timeline |
| `audit_log` | record_id, event_type, agent_id, asset_id, received_at, payload, checksum | INSERT-only, SHA-256 tamper-evidence |
| `pipeline_runs` | id, run_type, started_at, finished_at, status, stages_ok, stages_fail, files_in, files_out, summary | Pipeline execution record |

Schema notes:
- `ai_vision` is a valid entity source in `schema.sql`
- `enricher` is a valid pipeline run type
- `audit_log` is append-only — no UPDATE or DELETE permitted

### 1.7 Documentation Delivered

| Doc | Contents |
|---|---|
| `docs/extractors.md` | IExtractor interface, registry, plug-in authoring guide |
| `docs/pipeline.md` | 9-stage pipeline architecture, stage contracts |
| `docs/ingestion.md` | Ingestion Agent full reference |
| `docs/synthesis.md` | Synthesis Agent, ResearchBrief format, dedup, conflict resolution |
| `docs/audit.md` | Audit Agent, audit log schema, 4-rule anomaly engine, integrity API |

### 1.8 MIME Support — Ingestion Agent

| Category | Types |
|---|---|
| Images | image/jpeg, image/png, image/webp, image/gif |
| Documents | application/pdf, text/plain, text/html, application/json |
| Media | video/mp4, audio/mpeg |

---

## 2. Agent Taxonomy

| Agent | ID | Responsibility | Status |
|---|---|---|---|
| Ingestion Agent | `ingestion_agent` | Intake boundary — normalize, validate, persist, emit asset.ingested | ✅ Live v1.0.1 |
| Image Analyzer Extractor | `image_analyzer` | Vision AI — scene, people, locations, objects via Gemini Flash Latest | ✅ Live v1.0.0 |
| Extractor Enricher | `extractor_enricher` | Pending assets query, IExtractor dispatch, entity/topic update, sidecar patch | ✅ Live v1.0.0 |
| Research Orchestrator | `research_orchestrator` | Multi-source cross-reference, entity graph, timeline construction, emits orchestration.complete | ✅ Live v1.0.0 |
| Synthesis Agent | `synthesis_agent` | Evidence aggregation, Levenshtein dedup, Gemini conflict resolution, ResearchBrief output | ✅ Live v1.0.0 |
| Audit Agent | `audit_agent` | Immutable append-only audit trail, SHA-256 tamper-evidence, 4-rule anomaly engine | ✅ Live v1.0.0 |
| Integration Test Suite | `test_harness` | 6 E2E + 5 contract tests — node:test, node:assert, zero external frameworks | ✅ Live v1.0.0 |
| Castironforge MCP | `castironforge_mcp` | Real-time inter-agent WebSocket fanout, HTTP event ingestion, subscription registry, 30s heartbeat | ✅ Live v1.0.0 |

---

## 3. Phased Deployment

### 3.1 Phase 1 — Foundation (Q3–Q4 2026) — 80% IMPLEMENTED

**Status:** Core v2 architecture delivered. Vision API integration (Gemini calls) LIVE. Remaining work: E2E test coverage, dashboard, Phase 2 extractors.

**Phase 1 Actual Deliverables:**

| ✓ | Deliverable |
|---|---|
| ✅ | IExtractor interface contract — validated, v1.0.0 |
| ✅ | Analyzer Registry v1.0.0 — maps analyzer keys to raw IExtractor modules |
| ✅ | Extractor Registry v1.0.0 — wraps analyzers for corpus output |
| ✅ | **ImageAnalyzerV2 v2.0.0 LIVE** — 4 sub-extractors, Gemini 2.0 Flash Latest active |
| ✅ | Scene Graph extractor — objects, relationships, spatial layout, dominant colors, era |
| ✅ | Face Clusterer extractor — face detection, clustering, identity hints |
| ✅ | Place Recognizer extractor — landmarks, geolocation, architectural style |
| ✅ | Cross-Referencer extractor — public figures, locations, reverse image hints |
| ✅ | **Orchestrator v3.0.0 LIVE** — DAG engine, scheduler, registry, MCP bus, replay |
| ✅ | DAG execution engine — sequential node dispatch via registry |
| ✅ | Sidecar Pipeline v1.0.0 — MIME-based conditional routing (image/jpeg/png/webp/gif → image:v2) |
| ✅ | Telemetry Sink infrastructure (skeleton) — events, metrics, telemetry facades |
| ✅ | v2 Type System — CicContext, DagNode, DagEdge, Dag, AgentContract, PipelineContract |
| ✅ | Ingestion Agent v1.0.1 — validates, normalizes, persists, emits asset.ingested |
| ✅ | Structured JSON logging on all components |
| ✅ | Node 20+ ESM, zero external dependencies |
| 🔲 | Full Phase 1 E2E test: source → ImageAnalyzerV2 → orchestrator → output |
| 🔲 | Observability dashboard — live agent health polling |

---

### 3.2 Phase 2 — Scale & Integration (Q1–Q2 2027) — 🔄 IN PROGRESS

**Phase 2 Remaining (Blocking Release):**

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Vision API integration E2E test | 🔲 Blocking | Verify ImageAnalyzerV2 → Orchestrator v3 → output end-to-end |
| 2 | Telemetry sink backend integration | 🔲 Blocking | events.js, metrics.js currently placeholders; integrate event bus, runId, skill metrics, outcome tracking |
| 3 | Dashboard — live agent health | 🔲 Phase 2.5 | Health polling across orchestrator, sidecar pipeline, MCP bus |
| 4 | ReverseImageSearchExtractor v1.0.0 | 🔲 Phase 2.5 | IExtractor plug-in #2 — cross-reference duplicate detection |
| 5 | PublicRecordsExtractor v1.0.0 | 🔲 Phase 2.5 | IExtractor plug-in #3 — entity archival cross-reference |

**Phase 2 Milestone Status:**

| # | Milestone | Status |
|---|---|---|
| 1 | Research Orchestrator Agent v1.0 — entity graph + timeline builder + MCP WebSocket listener | ✅ Complete |
| 2 | Synthesis Agent v1.0 — ResearchBrief output, Levenshtein dedup + Gemini resolution | ✅ Complete |
| 3 | Audit Agent v1.0 — immutable audit trail, SHA-256 tamper-evidence, 4-rule anomaly engine | ✅ Complete |
| 4 | WebSocket Event Bus — Castironforge MCP real-time fanout, heartbeat + dead-client handling | ✅ Complete |
| 5 | MCP routing rules updated for Orchestrator and Synthesis stages | ✅ Complete |
| 6 | Integration Test Suite — 11 tests live (6 E2E + 5 contract), all env vars validated | ✅ Complete |
| 7 | Full Phase 2 E2E integration test: Ingestion → Enricher → Orchestrator → Synthesis → Audit | 🔲 Remaining |
| 8 | Reverse image search extractor — IExtractor plug-in #2 | 🔲 Remaining |
| 9 | Public records cross-reference extractor — IExtractor plug-in #3 | 🔲 Remaining |
| 10 | Observability dashboard — live agent health polling | 🔲 Remaining |

**Integration Points Wired:**
- WebSocket real-time event bus between all agents ✅
- MCP routing rules for Orchestrator + Synthesis stages ✅
- External API credentials managed via env vars with pre-flight validation ✅

**Integration Points Pending:**
- Reverse Image Search API — image cross-referencing and duplicate detection 🔲
- Public Records / Archives API — cross-reference entities against public archival sources 🔲
- Geolocation Services — location confidence scoring for image analysis output 🔲
- Media Metadata Extractors — extended EXIF, audio metadata, video frame extraction 🔲

---

### 3.3 Phase 3 — Production & Optimization (Q3–Q4 2027) — 🔲 PENDING

| Deliverable | Target |
|---|---|
| Research Orchestrator v2.0 — automated conflict resolution, timeline synthesis | Q3 2027 |
| Image Analyzer v2.0 — advanced clustering, geolocation confidence scoring | Q3 2027 |
| Audit Agent — compliance snapshot exports, quarterly governance reports | Q3 2027 |
| Scale target: 5,000+ assets/month autonomous processing | Q4 2027 |
| Extractor plug-ins: 5+ deployed | Q4 2027 |

---

## 4. Integration Architecture

### 4.1 Internal Routing & Dispatch (Instinct-style conditional routing)

**Sidecar Pipeline v1.0.0 — MIME-based conditional router:**

Routes incoming extraction jobs to appropriate analyzer based on MIME type specification:

```
Job { mimeType, payload, meta }
  ↓ resolveExtractorKey(mimeType)
  ↓ MIME_EXTRACTOR_MAP lookup
  ↓ getExtractor(key) from registry
  ↓ extractor.extract(job)
  → ExtractorResult { status, data, error, durationMs }
```

Dispatch map:
- `image/jpeg`, `image/png`, `image/webp`, `image/gif` → `image:v2` (ImageAnalyzerV2)

Failure handling:
- Unknown MIME → { status: 'unsupported', result: null }
- Registry gap → throws (system error, not per-job)
- Extractor error → propagates to DLQ or caller

### 4.2 Internal Integrations

| Layer | Description |
|---|---|
| Orchestrator v3.0.0 | DAG-based orchestration — node type dispatch via registry |
| Sidecar Pipeline v1.0.0 | MIME-based conditional routing to extractors |
| Analyzer Registry | Maps analyzer keys to raw IExtractor modules (direct Gemini calls) |
| Extractor Registry | Wraps analyzers for corpus payload output shape |
| IExtractor Interface v1.0.0 | Standardized pluggable contract — `meta`, `extract()`, `healthCheck()` |
| Telemetry Facades | Events, metrics, telemetry — currently skeleton, Phase 2 backend integration pending |

### 4.3 External Integrations (Phase 2 — Pending)

| Service | Purpose | Status |
|---|---|---|
| Gemini 2.0 Flash Latest API | Vision AI for ImageAnalyzerV2 (4 sub-extractors) | ✅ **LIVE** |
| Event Bus Backend | Telemetry events sink (runId, skill metrics, outcomes) | 🔲 Phase 2 |
| Metrics Backend | Telemetry metrics aggregation | 🔲 Phase 2 |
| Reverse Image Search API | Image cross-referencing, duplicate detection | 🔲 Phase 2 |
| Public Records / Archives API | Entity archival cross-reference | 🔲 Phase 2 |
| Geolocation Services | Location confidence scoring refinement | 🔲 Phase 2 |

---

## 5. Governance

| Policy | Specification |
|---|---|
| Logging Standard | All agents emit `{ timestamp, level, agentId, action, status, durationMs?, error? }` to stdout |
| Env Var Policy | All env vars validated at module load. Missing var = immediate throw with var name. No hardcoded secrets. |
| File Header Standard | Every file: `// filename`, `// date`, `// version (semver)` |
| Agent Versioning | Semver. Deployed: all at v1.0.0 (ingestionAgent.js at v1.0.1) |
| Audit Policy | audit_log is append-only, INSERT-only, SHA-256 integrity-verified per record |
| Deprecation Policy | 60-day notice, parallel operation window, hard cutover |
| Patch Cadence — Critical | 48-hour SLA |
| Patch Cadence — Standard | 14-day sprint |

**Audit Agent — Live v1.0.0**
All pipeline events covered: `asset.ingested`, `asset.enriched`, `orchestration.complete`, `synthesis.complete`.
Anomaly rules active: high error rate, pipeline stall (>5 min), schema drift, duplicate event detection.

---

## 6. KPIs

| KPI | Phase 1 Target | Phase 1 Actual | Phase 2 Target |
|---|---|---|---|
| Image extraction readiness | Baseline | ✅ ImageAnalyzerV2 v2.0.0 LIVE — 4 sub-extractors active | ≥90% coverage |
| Assets ingested | 100 smoke test | ✅ Operational | 1,000/week |
| Scene graph accuracy | Baseline | ✅ Baseline via Gemini 2.0 Flash | ≥85% |
| Face clustering precision | Baseline | ✅ Baseline via Gemini 2.0 Flash | ≥80% |
| Place recognition confidence | Baseline | ✅ Baseline via Gemini 2.0 Flash | ≥70% |
| Cross-reference resolution rate | — | — | ≥60% |
| Telemetry events captured | Skeleton | ✅ Facade structure (Phase 2 backend pending) | 100% events routed |
| Orchestrator DAG execution latency | — | ✅ v3.0.0 operational | <500ms/node |
| Sidecar pipeline dispatch accuracy | — | ✅ MIME routing live (image types) | 100% correct routing |
| Audit log completeness | 100% | ✅ 100% — SHA-256 verified | 100% |
| Pipeline error rate | <10% | ✅ Within target | <3% |
| Extractor plug-ins deployed | 1 | ✅ 1 (ImageAnalyzerV2 v2.0.0) | 3 (add reverse-image, public-records) |
| Agent uptime | 95% | ✅ Operational | 99% |
| E2E vision API integration | 0% | 🔲 Phase 2 blocking | 100% |
| Integration tests passing | — | ✅ 11 tests live (6 E2E + 5 contract) | Full suite + Phase 2 tests |

---

## 7. Implementation Checklist

### Phase 1 — 80% IMPLEMENTED

| ✓ | Task |
|---|---|
| ✅ | Node 20+ ESM enforced, explicit .js extensions on all imports |
| ✅ | Structured JSON log schema deployed across all components |
| ✅ | IExtractor interface v1.0.0 contract defined and validated |
| ✅ | Analyzer Registry v1.0.0: maps analyzer keys to raw IExtractor modules |
| ✅ | Extractor Registry v1.0.0: wraps analyzers for corpus payload output |
| ✅ | **ImageAnalyzerV2 v2.0.0 LIVE**: 4 sub-extractors, Gemini 2.0 Flash Latest active |
| ✅ | — Scene Graph extractor: objects, relationships, spatial layout, dominant colors, era |
| ✅ | — Face Clusterer extractor: face detection, clustering, identity hints, bounding boxes |
| ✅ | — Place Recognizer extractor: landmarks, geolocation, architectural style, indoor/outdoor |
| ✅ | — Cross-Referencer extractor: public figures, locations, reverse image hints, evidence |
| ✅ | **Orchestrator v3.0.0 LIVE**: DAG engine, scheduler, registry, MCP bus, replay |
| ✅ | DAG creation/mutation/execution: sequential node dispatch via registry |
| ✅ | Sidecar Pipeline v1.0.0: MIME-based conditional routing (image types → image:v2) |
| ✅ | Telemetry Sink infrastructure (skeleton): events, metrics, telemetry facades |
| ✅ | v2 Type System: CicContext, DagNode, DagEdge, Dag, AgentContract, PipelineContract |
| ✅ | Ingestion Agent v1.0.1: validate → MIME confirm → persist → emit asset.ingested |
| ✅ | CLI commands: npm run commands for all agents and pipelines |
| 🔲 | **Phase 1 blocking E2E test**: source → ImageAnalyzerV2 → Orchestrator v3 → output |
| 🔲 | Observability dashboard: live orchestrator, sidecar, MCP bus health polling |

### Phase 2 — 🔄 IN PROGRESS

| ✓ | Task |
|---|---|
| ✅ | Research Orchestrator Agent v1.0 — entity graph + timeline builder + MCP listener |
| ✅ | Synthesis Agent v1.0 — ResearchBrief output, Levenshtein dedup + Gemini resolution |
| ✅ | Audit Agent v1.0 — immutable audit trail, SHA-256 tamper-evidence, 4-rule anomaly engine |
| ✅ | Castironforge MCP WebSocket Event Bus — real-time fanout, heartbeat handling |
| ✅ | MCP routing rules — HTTP event ingestion + WS fanout wired end-to-end |
| ✅ | DB schema additions — entity_nodes, entity_edges, timeline_entries, audit_log |
| ✅ | CLI additions — npm run orchestrator, npm run synthesis, npm run audit, npm run mcp |
| ✅ | Integration Test Suite — 11 tests live (6 E2E + 5 contract), native node:test |
| 🔲 | **Phase 2 blocking**: Vision API E2E integration test (ImageAnalyzerV2 → Orchestrator v3) |
| 🔲 | **Phase 2 blocking**: Telemetry backend integration (events, metrics, runId, skill metrics) |
| 🔲 | Observability dashboard: live agent health polling (orchestrator, sidecar, MCP) |
| 🔲 | Reverse image search extractor v1.0.0 — IExtractor plug-in #2 |
| 🔲 | Public records extractor v1.0.0 — IExtractor plug-in #3 |
