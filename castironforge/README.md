# CIC + Rewrite Labs — Unified Repository
Operator-Grade Research & Automation Ecosystem
Version: 1.2.0
Updated: 2026-05-10
Author: Chris Sorensen

---

## 1. Overview

This repository contains two interconnected but independent systems:

### Cast Iron Charlie (CIC)
A long-term documentary research engine centered on Charles Emil Sorensen (CESOR), built around archival ingestion, structured research logs, and narrative development. Phase 1 complete. Phase 2 80% complete. 8 agents deployed.

### Rewrite Labs
An AI-driven website redesign company that automates discovery, redesign, and outreach using operator-grade pipelines. POC complete. Intelligence-driven roadmap active (P0–P2 items in progress).

Both systems share:
- Deterministic, modular engineering standards
- Strict memory governance
- Multi-agent orchestration via Castironforge MCP
- Unified documentation structure
- Node 20+ ESM, structured JSON logging, explicit semver

---

## 2. Repository Structure

```
/
├── CIC/
│   ├── SYSTEM/        # stable architecture docs (CIC_SYSTEM.md)
│   ├── STATE/         # volatile project state (CIC_PROJECT_STATE.md)
│   ├── DOCS/          # authoritative living documents
│   ├── PIPELINES/     # ingestion, analysis, narrative scripts
│   └── ASSETS/        # images, transcripts, references
│
├── RewriteLabs/
│   ├── SYSTEM/        # stable architecture docs (REWRITE_LABS_SYSTEM.md)
│   ├── STATE/         # volatile state (REWRITE_LABS_STATE.md)
│   ├── DOCS/          # authoritative living documents
│   ├── PIPELINES/     # discovery, redesign, outreach scripts
│   └── ASSETS/        # raw materials, templates
│
└── GLOBAL/
    ├── CHANGELOG.md
    ├── README.md
    ├── System_Versioning_Standard.md
    ├── Memory_Injection_Block.md
    └── Memory_Diff_Tool.md
```

---

## 3. Core Principles

### Separation of Concerns
- **SYSTEM/** = stable, evergreen architecture
- **STATE/** = volatile, session-based
- **DOCS/** = authoritative living documents
- **PIPELINES/** = code, scripts, workflows
- **ASSETS/** = raw materials

### Memory Governance
Claude stores only: identity, stable structure, preferences, long-term goals.

Claude never stores: file IDs, versions, counts, dates, batch numbers, debugging logs, outreach status, pending tasks.

Volatile state lives in `CIC_PROJECT_STATE.md` and `REWRITE_LABS_STATE.md`.

---

## 4. How to Work With This Repo

### CIC Workflows
- Research → update Kroll Archive Log / Research Logs
- Narrative → update Treatment
- Verification → update QuestionsForDad
- Operational status → update `CIC_PROJECT_STATE.md`
- Pipeline → `npm run pipeline` (9 stages), `npm run ingest`, `npm run enrich`

### Rewrite Labs Workflows
- Discovery → update `REWRITE_LABS_STATE.md`
- Redesign → update Redesign_Briefs
- Outreach → update Outreach docs

---

## 5. Multi-Agent Orchestration

All agents communicate via Castironforge MCP (WebSocket event bus + HTTP REST).

| Agent | Role | Status |
|---|---|---|
| `ingestion_agent` | Intake boundary — validate, persist, emit | ✅ Live v1.0.1 |
| `image_analyzer` | Vision AI — scene/people/location/object extraction | ✅ Live v1.0.0 |
| `extractor_enricher` | Extractor dispatch, entity/topic update, sidecar patch | ✅ Live v1.0.0 |
| `research_orchestrator` | Entity graph, timeline construction, cross-reference routing | ✅ Live v1.0.0 |
| `synthesis_agent` | ResearchBrief aggregation, dedup, conflict resolution | ✅ Live v1.0.0 |
| `audit_agent` | Immutable audit trail, SHA-256 tamper-evidence, anomaly engine | ✅ Live v1.0.0 |
| `test_harness` | 11-test E2E + contract integration suite | ✅ Live v1.0.0 |
| `castironforge_mcp` | Real-time WebSocket event fanout, 30s heartbeat | ✅ Live v1.0.0 |

Agents read: SYSTEM docs, STATE trackers, living DOCS. Agents never write to memory.

---

## 6. Standards
- Deterministic, operator-grade output
- Modular documentation
- Explicit semver versioning
- Verified vs inferred vs unknown
- No hallucination
- No filler

---

## 7. Versioning
See `GLOBAL/CHANGELOG.md` for system-level version history.

---

## 8. Contact
Maintained by Chris Sorensen.
All system docs are authoritative and versioned.
