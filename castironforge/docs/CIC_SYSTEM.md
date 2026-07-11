# CIC_SYSTEM.md
Version: 1.2.0
Updated: 2026-05-10
Author: Chris Sorensen

Cast Iron Charlie — System Specification
Purpose: Unified operator-grade system document for CIC Documentary Research Engine

---

## 1. Project Identity

Cast Iron Charlie is a long-term documentary centered on Charles Emil Sorensen (CESOR), Ford Motor Company's VP of Engineering and a key figure in the development of the moving assembly line and Willow Run.

Chris is the producer and collaborates with:

- His father (historical verification)
- Archival researcher Mike Kroll (primary source acquisition)

---

## 2. Core Research Infrastructure

The CIC research backbone consists of three authoritative living documents stored in Drive:

- **Kroll Archive Log** — primary archival index
- **Treatment** — master narrative document
- **QuestionsForDad** — ongoing fact-verification prompts

Additional research logs support archival organization and narrative development.

These documents are authoritative and must be referenced for all research and narrative decisions.

---

## 3. Technical Environment

- Windows 11 workstation (WSL2 Ubuntu 22.04+ for pipeline work)
- Claude Desktop (required for ingestion via MCP)
- Local Node.js MCP server (Castironforge MCP) for Drive integration
- `catalog_ingest` must run from Claude Desktop
- Operator-grade coding standards:
  - Node 20+
  - ESM with explicit `.js` extensions
  - Structured JSON logs (`{ timestamp, level, agentId, action, status, durationMs?, error? }`)
  - Explicit semver versioning on all components
  - Boundary validation on all inputs
  - No hallucination

---

## 4. Agent Taxonomy (Current — All v1.0.0)

| Agent | ID | Responsibility | Status |
|---|---|---|---|
| Ingestion Agent | `ingestion_agent` | Intake boundary — normalize, validate, persist, emit `asset.ingested` to MCP | ✅ Live v1.0.1 |
| Image Analyzer Extractor | `image_analyzer` | Vision AI — scene, people, locations, objects via Gemini Flash Latest | ✅ Live v1.0.0 |
| Extractor Enricher | `extractor_enricher` | Queries pending assets, routes to extractors, updates entities/topics, patches sidecar.json | ✅ Live v1.0.0 |
| Research Orchestrator | `research_orchestrator` | Entity graph maintenance, multi-source cross-referencing, timeline construction, emits `orchestration.complete` | ✅ Live v1.0.0 |
| Synthesis Agent | `synthesis_agent` | Evidence aggregation, Levenshtein dedup, Gemini conflict resolution, structured ResearchBrief output | ✅ Live v1.0.0 |
| Audit Agent | `audit_agent` | Immutable append-only audit trail, SHA-256 tamper-evidence, 4-rule anomaly engine | ✅ Live v1.0.0 |
| Integration Test Suite | `test_harness` | E2E pipeline + Ingestion Agent contract tests — 11 tests, `node:test`, zero external frameworks | ✅ Live v1.0.0 |
| Castironforge MCP / WebSocket Event Bus | `castironforge_mcp` | Real-time inter-agent event fanout: HTTP ingestion + WebSocket broadcast, subscription registry, 30s heartbeat | ✅ Live v1.0.0 |

---

## 5. Pipeline Architecture

### 5.1 Active Pipeline Sequence (9 Stages)

```
Maintenance → Harvester → Sweeper → Enricher (Phase 2.5) → Indexer → Corpus Builder
```

Ingestion Agent is the authoritative intake boundary feeding the `assets` table before pipeline stages run.

### 5.2 End-to-End Data Flow

```
Ingestion Agent
     ↓  assets table (status: pending)
     ↓  asset.ingested → Castironforge MCP
Extractor Enricher
     ↓  extractor dispatch (IExtractor)
     ↓  entities/topics tables + sidecar.json patch
     ↓  asset.enriched → Castironforge MCP
Research Orchestrator
     ↓  entity_nodes + entity_edges upserts
     ↓  timeline_entries construction
     ↓  orchestration.complete → Castironforge MCP
Synthesis Agent
     ↓  ResearchBrief aggregation + conflict resolution
     ↓  research_briefs table persist
     ↓  synthesis.complete → Castironforge MCP
Audit Agent
     ↓  audit_log (append-only, SHA-256 per record)
     ↓  anomaly engine (4 rules)
```

### 5.3 IExtractor Interface

Standardized pluggable contract. Required exports: `meta`, `extract()`, `healthCheck()`.

- **Extractor plug-ins deployed:** 1 (`image_analyzer`) — ✅ Live
- **Plug-in #2:** Reverse image search extractor — 🔲 Phase 2 remaining
- **Plug-in #3:** Public records cross-reference extractor — 🔲 Phase 2 remaining

---

## 6. Database Schema

### 6.1 Core Tables

| Table | Key Columns | Status |
|---|---|---|
| `assets` | `asset_id, mime_type, source_type, storage_path, source_meta, status, ingested_at, updated_at` | ✅ Live |
| `research_briefs` | `brief_id, asset_id, generated_at, brief_json, confidence, status, created_at` | ✅ Live |
| `entity_nodes` | `node_id, label, type, first_seen, last_seen, occurrence_count` | ✅ Live |
| `entity_edges` | `edge_id, source_node, target_node, relationship, asset_ids` | ✅ Live |
| `timeline_entries` | `entry_id, asset_id, place_label, geo_hint, scene, timestamp, created_at` | ✅ Live |
| `audit_log` | `record_id, event_type, agent_id, asset_id, received_at, payload, checksum (SHA-256)` | ✅ Live — append-only |
| `pipeline_runs` | `id, run_type, started_at, finished_at, status, stages_ok, stages_fail, files_in, files_out, summary` | ✅ Live |

### 6.2 Schema Notes

- `ai_vision` is a valid `entity_source` in `schema.sql`
- `enricher` is a valid `pipeline_run` type
- `audit_log` is INSERT-only — no UPDATE or DELETE permitted
- All queue tables use status lifecycle: `pending → running → completed | failed`

---

## 7. Live CLI Commands

| Command | Function |
|---|---|
| `npm run ingest` | Start Ingestion Agent HTTP server |
| `npm run enrich` | AI enrichment stage on pending assets |
| `npm run extractor:test` | Standalone extractor smoke-test |
| `npm run orchestrator` | Start Research Orchestrator Agent |
| `npm run synthesis` | Start Synthesis Agent server |
| `npm run audit` | Start Audit Agent (full event stream subscription) |
| `npm run mcp` | Start Castironforge MCP — HTTP on `MCP_HTTP_PORT` + WebSocket on `MCP_WS_PORT` |
| `npm run pipeline` | Full 9-stage pipeline (includes Enricher) |
| `npm run test` | Full integration test suite (11 tests: 6 E2E + 5 contract) |
| `npm run status` | Print current system status |

---

## 8. MIME Support — Ingestion Agent

| Category | Types |
|---|---|
| Images | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| Documents | `application/pdf`, `text/plain`, `text/html`, `application/json` |
| Media | `video/mp4`, `audio/mpeg` |

---

## 9. Documentation Published

| Doc | Path | Contents |
|---|---|---|
| Extractor system | `docs/extractors.md` | IExtractor interface, registry, plug-in authoring |
| Pipeline architecture | `docs/pipeline.md` | 9-stage pipeline, stage contracts |
| Ingestion Agent | `docs/ingestion.md` | Full ingestion agent reference |
| Synthesis Agent | `docs/synthesis.md` | ResearchBrief format, dedup, conflict resolution |
| Audit Agent | `docs/audit.md` | Audit log schema, anomaly rules, integrity API |

---

## 10. Governance

| Policy | Specification |
|---|---|
| Logging Standard | All agents emit `{ timestamp, level, agentId, action, status, durationMs?, error? }` to stdout |
| Env Var Policy | All env vars validated at module load. Missing var = immediate throw with var name. No hardcoded secrets. |
| File Header Standard | Every file: `// filename`, `// date`, `// version (semver)` |
| Agent Versioning | Semver. All agents currently at `v1.0.0` (Ingestion Agent at `v1.0.1`) |
| Audit Policy | `audit_log` is append-only, SHA-256 integrity-verified per record |
| Deprecation Policy | 60-day notice, parallel operation window, hard cutover |
| Patch Cadence — Critical | 48-hour SLA |
| Patch Cadence — Standard | 14-day sprint |

---

## 11. State Management

Volatile project state is stored in:

- **CIC_PROJECT_STATE.md** (OneDrive / CIC Root)

Includes: batch status, pending ingestion, treatment updates, QuestionsForDad additions, outreach threads, engineering tasks, next actions.

State must never be stored in AI memory.

---

## 12. Memory Governance

Claude stores only stable, evergreen facts:

- Project identity
- Core collaborators
- Research structure
- Technical environment (stable parts)
- Operator-grade preferences
- Long-term goals

Volatile data is prohibited from memory.

---

## 13. Long-Term Goals

- Build and complete the CIC Documentary Research Engine.
- Complete the Cast Iron Charlie documentary.
- Maintain deterministic, operator-grade research workflows.
- Scale to 5,000+ assets/month autonomous processing (Phase 3 target).

---

## 14. Interaction Rules

When Chris asks about:

- **Current status** → reference `CIC_PROJECT_STATE.md`
- **Long-term structure** → use memory
- **Document contents** → reference living docs
- **New tasks** → update state tracker, not memory
