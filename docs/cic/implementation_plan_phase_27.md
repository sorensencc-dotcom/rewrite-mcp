# Phase 27 — CIC Knowledge Graph (CKG)

## Overview
Phase 27 introduces the CIC Knowledge Graph (CKG): a unified semantic graph that connects CIC docs, ARPS deltas, Memory events, Skill Graph nodes, APR planning episodes, CRO execution episodes, and external doctrine mappings into a single queryable substrate.

CKG becomes the shared knowledge layer for planning, execution, drift detection, and cross‑system reasoning.

---

## 27.1 — CKG Schema (CKG‑Spec)

### Objectives
- Define a stable, extensible schema for CIC’s unified knowledge graph.
- Make all knowledge entities and relations explicit and machine‑queryable.

### Tasks
- Define node types:
  - `doc`, `delta`, `memory_event`, `skill`, `agent`, `tool`, `phase`, `task`, `planning_episode`, `execution_episode`, `external_system`, `external_skill`
- Define edge types:
  - `references`, `depends_on`, `derived_from`, `updates`, `executes`, `logs`, `critiques`, `documents`, `maps_to`, `contradicts`
- Create JSON schema:
  - `ckg-graph.schema.json` describing `nodes[]` and `edges[]`.
- Define storage format:
  - `projects/cic/ckg/graph.json` as the canonical persisted graph.

---

## 27.2 — CKG Store (CKG‑Store)

### Objectives
- Provide a simple, robust persistence and query layer for the Knowledge Graph.

### Tasks
- Implement `CkgStore`:
  - Load/save graph from `projects/cic/ckg/graph.json`.
  - Append nodes/edges with idempotent deduplication.
  - Query by:
    - node id, type, tags
    - edge type, from, to
- Provide helper queries:
  - `getNeighborhood(nodeId, depth)`
  - `findByTag(tag)`
  - `findByType(type)`

---

## 27.3 — CKG Harvester (CKG‑Harvester)

### Objectives
- Ingest knowledge from existing CIC subsystems into CKG.

### Tasks
- Implement `CkgHarvester` that:
  - Scans docs:
    - `docs/cic/*.md` → `doc` nodes, `references` edges (links, fenced blocks).
  - Scans ARPS:
    - Phase fences → `delta` nodes, `updates` edges to `phase`/`doc`.
  - Scans Memory Layer:
    - Memory JSONL → `memory_event` nodes, `logs` edges to related entities.
  - Scans Skill Graph:
    - Import `skill`, `agent`, `tool`, `phase` nodes and their edges.
  - Scans APR:
    - `PlanningEpisode` logs → `planning_episode` nodes, `critiques`/`depends_on` edges.
  - Scans CRO:
    - `ExecutionEpisode` logs → `execution_episode` nodes, `executes`/`logs` edges.
  - Scans external doctrine:
    - Existing Claude/Copilot/Antigravity mappings → `external_system`/`external_skill` nodes, `maps_to` edges.

---

## 27.4 — CKG Synthesizer (CKG‑Synthesizer)

### Objectives
- Clean, enrich, and analyze the graph to surface structure and drift.

### Tasks
- Implement `CkgSynthesizer`:
  - Deduplicate nodes/edges by stable ids.
  - Compute hotspots:
    - Highly connected nodes (central concepts).
    - Isolated nodes (potential orphans).
  - Detect contradictions:
    - Simple heuristic: conflicting tags/flags on related nodes (e.g., `status: COMPLETE` vs `status: PENDING` for same phase).
  - Detect doc vs memory drift:
    - Docs claiming state that disagrees with latest `memory_event`/`execution_episode`.
  - Write synthesized metadata into graph `meta.hotspots`, `meta.drift`.

---

## 27.5 — CKG API (CKG‑API)

### Objectives
- Expose the Knowledge Graph as a first‑class control‑plane surface.

### Tasks
- Add routes (e.g. `ckg-routes.ts`):
  - `GET /v1/ckg/graph` — full graph (with pagination/limits).
  - `GET /v1/ckg/nodes` — filter by type/tag.
  - `GET /v1/ckg/edges` — filter by type/from/to.
  - `GET /v1/ckg/neighborhood/:id` — local graph around a node.
  - `GET /v1/ckg/hotspots` — central nodes, orphans.
  - `GET /v1/ckg/drift` — doc vs reality drift report.
- Register `registerCkgRoutes(v1Router)` in `v1-router.ts`.

---

## 27.6 — Knowledge Explorer UI (CKG‑UI)

### Objectives
- Provide an operator console for exploring CIC’s unified knowledge.

### Tasks
- Create `KnowledgeExplorer.tsx`:
  - Node list with filters (type, tag).
  - Edge list with filters (type).
  - Neighborhood view for a selected node.
  - Hotspot view (central nodes, orphans).
  - Drift dashboard (doc vs memory vs execution).
- Wire into UI:
  - `/knowledge` route in `router.tsx`.
  - Sidebar entry “Knowledge Graph” in `Sidebar.tsx`.

---

## 27.7 — Integration with APR, CRO, Memory, Skill Graph (CKG‑Integration)

### Objectives
- Make CKG the shared substrate for planning and execution.

### Tasks
- APR:
  - Add optional CKG‑backed goal discovery:
    - Use hotspots and drift nodes as candidate planning goals.
- CRO:
  - Log each `ExecutionEpisode` into CKG via `CkgStore`.
- Memory:
  - Treat Memory events as a subset of CKG nodes; keep formats aligned.
- Skill Graph:
  - Mirror Skill Graph nodes/edges into CKG and keep them in sync.
- ARPS:
  - Ensure Phase fences are represented as `delta` nodes with `updates` edges.

---

## Verification

### Automated
- `ckg-store.test.ts`:
  - Load/save, dedupe, queries.
- `ckg-harvester.test.ts`:
  - Extraction from docs, ARPS, Memory, Skills, APR, CRO.
- `ckg-synthesizer.test.ts`:
  - Hotspots, orphans, drift detection.
- `ckg-api.test.ts`:
  - All `/v1/ckg/*` endpoints.
- `ckg-ui.test.tsx`:
  - Knowledge Explorer renders and loads data.

### Manual
- `npm run build`
- `npm run test`
- `npm run doc:drift`
- `mkdocs build`
- Manually inspect:
  - `/v1/ckg/graph`
  - Knowledge Explorer UI
  - Drift report correctness.

---

## Deliverables
- CKG schema and store
- CKG Harvester and Synthesizer
- CKG control‑plane API
- Knowledge Explorer UI
- Integration with APR, CRO, Memory, Skill Graph, ARPS
- Updated docs and passing tests
