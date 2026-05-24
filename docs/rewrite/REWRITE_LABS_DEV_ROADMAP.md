---
title: Rewrite Labs Platform & Product Roadmap
version: 2.20.0
date: 2026-05-24
---

# Rewrite Labs Roadmap

This roadmap covers both the **Technical Platform (Antigravity/MAS)** and the **RewriteLabs.io Product**.

---

## 🏗️ Technical Platform (Monorepo Phases)

### Completed

- **[v2.20.0] Phase 29: Intelligence Plane Operationalization** — End-to-end Ingestion (8-stage), Extractor Interface, Image Analyzer v2, AIR & Thematic Synthesis Engine — 2026-05-24
- **[v2.19.0] Live Stress Validation (N=50)** — Empirical proof of MAS Efficacy Lab performance under high load — 2026-05-23
- **[v2.17.0] Unified Global Navigation & Command Center** + Web Regression Skill + MkDocs Industrial Overhaul + Auth Bypass — 2026-05-22
- **[v2.16.0] Phase 27H — MAS Routing Heatmap**: Birds-eye frequency view of which agents trigger which directives (`rerunAgent`, `skipAgent`, etc.) in a cumulative ASCII heatmap. — 2026-05-22
- **[v2.15.0] MAS Predictive Mode**: Forward-looking cognitive model (TTI, Agent Drift, Recovery Forecasts) + One-Click Desktop Launcher + PMS Subsystem Installation — 2026-05-22
- **[v2.13.0] MAS-Aware Rerun Telemetry**: three new event types (`mas_rerun_attempt`, `mas_rerun_backoff`, `mas_rerun_final_state`), ingest routes, timeline/trace inclusion, and Intelligence Timeline + Waterfall dashboard panels — 2026-05-21
- **[v2.12.0] MAS Rerun Hardening** + LLM Debug Plane + JSON Robustness — 2026-05-21
- **[v2.8.0] Phase 27G: MAS-Aware Waterfall**: MAS decisions + signals in telemetry stream, timeline, and per-run waterfall traces — 2026-05-20
- **[v2.7.1] Doc Drift Detection**: Automated guardrail (`tools/doc-drift-check.js`) and policy enforcement — 2026-05-20
- **[v2.7.0] Phase 27I**: Autonomous Recovery Plane (C3/C4) + MAS Rerun Logic + Archival Agent — 2026-05-21
- **[v2.6.0] Phase 27A–F**: MAS Decision Persistence, Synergy Panel, Drift Trace Panel — 2026-05-20
- **[v2.3.0] Phase 27**: MAS Phase 1-2 Fusion — unified `mas.js`, orchestrator MAS wiring, Blackboard API + Dashboard Panel — 2026-05-20
- **[v2.2.0] Connectivity Standardization** + Intelligence Timeline + Manual Override Telemetry — 2026-05-21
- **[v2.1.0] Control Plane agents endpoint fix** + Waterfall Trace Renderer + Stable N=50 concurrency — 2026-05-20
- **[v2.0.0] Phase 26**: Concurrency Stress Harness — scenarios A–E, fault injector, verdict engine, Stress Panel — 2026-05-21

### Active

- **MAS Mitigation & Introspection (Phases 29-31)**: Actively steering away from drift and explaining cognitive interventions.

### Planned

1. **Phase 32 — MAS Governance Plane**: Operator-in-the-loop overrides for MAS directives and real-time policy adjustments.

---

## 🚀 RewriteLabs.io Product Roadmap

### Phase 1 — Core Scan Engine (In Progress)
- Backend architecture (`rewrite-mcp/`)
- TypeScript server with scan and rewrite tools
- Operator console: control-room.html

### Phase 2 — Operator Console (In Progress)
- Control plane API (`apps/control-plane/`)
- Runs and metrics dashboards
- Auth: Google ID Token

### Phase 3 — DocGen Integration (In Progress)
- DocGen engine (`projects/cic/docgen/` shared infrastructure)
- Automated DOCX synchronization

### Phase 4 — Registry and Plugin System (Pending)
- Tool registry and Skill manifest system

---

## 💡 Suggestion Log

- 2026-05-20 — Per-agent drift breakdown in the Drift Trace Panel.
- 2026-05-20 — MAS confidence threshold tuning UI.
- 2026-05-20 — Blackboard TTL/pruning policy.
