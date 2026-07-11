# CHANGELOG.md
CIC + Rewrite Labs — System Documentation Changelog
Semantic Versioning: MAJOR.MINOR.PATCH

---

## [1.2.0] — 2026-05-10

### Changed — CIC_SYSTEM.md (v1.1.0 → v1.2.0)
- Added full Agent Taxonomy table (8 agents, all v1.0.0 / v1.0.1)
- Added Section 5: Pipeline Architecture — 9-stage sequence, end-to-end data flow diagram, IExtractor plug-in status
- Added Section 6: Database Schema — all live tables documented (assets, research_briefs, entity_nodes, entity_edges, timeline_entries, audit_log, pipeline_runs)
- Added Section 7: Live CLI Commands table (10 commands — ingest, enrich, extractor:test, orchestrator, synthesis, audit, mcp, pipeline, test, status)
- Added Section 8: MIME Support table
- Added Section 9: Documentation Published table (5 docs: extractors.md, pipeline.md, ingestion.md, synthesis.md, audit.md)
- Added Section 10: Governance table (logging standard, env var policy, file header standard, agent versioning, audit policy, deprecation, patch cadence)
- Updated Section 3: Technical Environment — added WSL2 Ubuntu 22.04+, Castironforge MCP, structured JSON log schema
- Updated Section 13: Long-Term Goals — added Phase 3 scale target (5,000+ assets/month)
- Patch note: ingestionAgent.js v1.0.1 — assetId assigned only post-validation

### Changed — REWRITE_LABS_SYSTEM.md (v1.1.0 → v1.2.0)
- Added Section 3: AI Model Architecture — model-per-stage cost table, Opus 4.7 Vision upgrade note
- Added Section 4: Intelligence-Driven Roadmap Items (P0–P2, week of May 8 2026)
- Added Section 5: Competitor Watch table (Snap2Code, Framer, Google Stitch, v0 by Vercel, Wix ADI 2026)
- Added Section 8: Template Library — current verticals + pending additions + style variant naming convention
- Added Section 9: Production Architecture Targets — BullMQ, database, dashboard, multi-tenant
- Updated Section 2: Core System Components — added Puppeteer headless fallback, Google Maps API discovery, approval-queue outreach gate, Instantly/Smartlead integration note
- Updated Section 6: Technical Environment — added BullMQ, SQLite persistence target

### Changed — README.md (v1.1.0 → v1.2.0)
- Updated Section 2: Repository structure to reflect PIPELINES/ and ASSETS/ directories
- Updated Section 5: Multi-Agent Orchestration — 8 agents now listed with roles
- Updated Section 8: Contact block

### Changed — System_Versioning_Standard.md (v1.0.0 → v1.1.0)
- Clarified Rule 3: CHANGELOG.md is the canonical change record for all SYSTEM and GLOBAL docs
- Added example commit message format aligned with current repo standard

### Added — CIC Master Roadmap v2.5.0
- Authoritative regeneration of roadmap reflecting Phase 2 at 80% complete
- All four Phase 2 agents (Orchestrator, Synthesis, Audit, MCP) marked complete
- Phase 2 remaining items clearly scoped: E2E test, extractor plug-ins #2 and #3, observability dashboard
- KPI table updated with actuals through May 10 2026
- Full implementation checklist reconciled against v2.3.0 and v2.4.0

---

## [1.1.0] — 2026-05-10 (earlier session)

### Added
- Audit Agent v1.0.0 — immutable audit trail, SHA-256 tamper-evidence, 4-rule anomaly engine
- Research Orchestrator Agent v1.0.0 — entity graph, timeline builder, MCP WebSocket listener
- Castironforge MCP / WebSocket Event Bus v1.0.0 — HTTP event ingestion + WS fanout, heartbeat + dead-client handling
- entity_nodes, entity_edges, timeline_entries, audit_log tables to database schema
- CLI commands: npm run orchestrator, npm run audit, npm run mcp
- docs/audit.md — Audit Agent full reference
- Integration test suite expanded to 11 tests (6 E2E + 5 contract)
- Phase 2 status updated to 80% complete (was: In Progress, not quantified)

### Notes
- Synthesis Agent ResearchBrief output confirmed live with Levenshtein dedup and Gemini conflict resolution
- MCP routing rules updated for Orchestrator and Synthesis stages
- WebSocket real-time event bus fully operational between all 6 agents

---

## [1.0.1] — Planned

### Will Fix
- Minor formatting consistency across SYSTEM.md files
- Standardize headings across all docs

---

## [1.0.0] — Initial Release

### Added
- CIC_SYSTEM.md (full system specification)
- REWRITE_LABS_SYSTEM.md (full system specification)
- CIC_PROJECT_STATE.md (volatile tracker)
- REWRITE_LABS_STATE.md (volatile tracker)
- Memory Governance Standard
- Multi-Agent Orchestration Spec
- Architecture Map
- Memory Injection Block (Claude Desktop)
- Memory Diff Tool
- Unified Repo Folder Structure
- "How Claude Should Work With This System" Quickstart

### Notes
- This release establishes the complete operator-grade governance layer.
- Memory is now strictly separated from state and living documents.
- CIC and Rewrite Labs now share a unified architecture and standards.
