# Master Roadmap — CIC / Rewrite Labs
# File: docs/roadmaps/master-roadmap.md | Version: 2.7.0 | Date: 2026-06-11
# Status: ACTIVE
# Last Updated: 2026-06-11 (Wayland W1–W7 phases added, W1 complete, W2–W3 in progress)

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

---

## Wayland Integration Phases (W1–W7) — Autonomous Orchestration

### Status: W1 Complete, W2–W3 In Progress, W4–W6 Ready, W7 Pending W1

**Overview:** Implement Phase 23–27 autonomy stack via Wayland CLI + ForgeFlow workflows. Replaces manual PS1 chaining with declarative pipelines, autonomous assistants, and real-time observability.

### W1 — Install & Scaffold ✓ COMPLETE
**Delivered:** 2026-06-11

- Installed wayland-core v0.10.0 via npm
- Created `.wayland/config.toml` (Opus 4.8 model, Anthropic provider, metrics :9091)
- Ported improvement-analysis.md skill to `.wayland/skills/`
- Added improvement-analysis.js implementation
- Updated `.claude/settings.json` with read-only tool allowlist (6 tools, 314+ high-frequency calls)
- Updated W4-W7-STATUS.md status document

**Ref:** Commit e83c084 "Wayland Phase W1: Install & Scaffold complete"

### W2 — Skill Port ✓ COMPLETE
**Delivered:** 2026-06-11

- improvement-analysis.md skill ported (Markdown + YAML compatible)
- improvement-analysis.js implementation created in scripts/
- Skill ready for execution: `npx @ferroxlabs/wayland-core run --skill improvement-analysis`

**Pending:** ANTHROPIC_API_KEY environment variable

### W3 — ForgeFlow Pipelines ⏳ OPEN
**Timeline:** 2026-06-12 through 2026-06-14
**Effort:** 2–3 days

Four workflows to create in `.wayland/workflows/`:

1. **cic-daily-ingest.ron** — Ingest pipeline (bulk-ingest-batches → classify → organize → Slack notify)
2. **cic-archive-query.ron** — Archive research (query-archives → reconcile → Slack notify)
3. **cic-weekly-ops.ron** — Operations (follow-ops → curate → report → Slack notify)
4. **cic-improvement-analysis.ron** — Monthly analysis (skill invoke → save report → Slack notify)

**Ref:** `.wayland/workflows/` directory (to be created)

### W4 — Slack Channel Setup ✓ COMPLETE
**Delivered:** 2026-06-09

- 4 apps configured: Herald, Sentinel, Automaton, Pilot
- 4 channels live: #cic-pipeline, #cic-alerts, #w7-assistants, #wayland-orchestration
- Webhooks tested and responding

**Ref:** W4-W7-STATUS.md

### W5 — Prometheus + Grafana Metrics ✓ COMPLETE
**Delivered:** 2026-06-09

- Prometheus running (localhost:9090), alert rules defined
- Grafana running (localhost:3000, admin:admin)
- CIC System Overview dashboard auto-provisioned
- Awaiting Wayland metrics on :9091 (will appear when W1-W3 run)

**Ref:** W4-W7-STATUS.md

### W6 — MCP Server (Real Data) ✓ COMPLETE
**Delivered:** 2026-06-09

- cic-mcp-server.js running (:7010)
- 6 tools responding: query_inventory, search_entity_graph, get_archive_results, get_gaps_report, get_system_health
- 663 inventory records, 10 archive results live

**Ref:** scripts/cic-mcp-server.js, W4-W7-STATUS.md

### W7 — Autonomous Assistants ⏳ READY (Pending W3)
**Timeline:** 2026-06-15 through 2026-06-22
**Effort:** 2–3 days

Four assistants in `.wayland/assistants.ron`:

1. **CIC-Ingest** (Daily 03:00 UTC) → cic-daily-ingest workflow
2. **CIC-Research** (Mon 04:00 UTC) → cic-archive-query workflow
3. **CIC-Report** (Fri 18:00 UTC) → cic-weekly-ops workflow
4. **CIC-Monitor** (1st/mo 06:00 UTC) → improvement-analysis workflow

All assistants wired to Slack, MCP tools, and Prometheus metrics export.

**Blocker:** W3 workflows must be created first

**Ref:** W4-W7-STATUS.md, `.wayland/assistants.ron`

---

**Next Actions:**

1. Set ANTHROPIC_API_KEY environment variable
2. Create W3 workflows (cic-daily-ingest.ron, cic-archive-query.ron, cic-weekly-ops.ron, cic-improvement-analysis.ron)
3. Test skill execution: `npx @ferroxlabs/wayland-core run --skill improvement-analysis`
4. Load and test assistants with `wayland config load-assistants`
5. Verify Wayland metrics flow to Prometheus → Grafana

**Dependencies:** Phase 1 (ingestion pipeline) — provides scripts for W3 workflows to call
