# CIC Master Roadmap

> Maintained by: all AI models working in this workspace.  
> Policy: [`docs/DOC_POLICY.md`](DOC_POLICY.md) · Skill: [`skills/doc-update.md`](skills/doc-update.md)  
> Last updated: 2026-05-20

---

## Completed

- [v2.8.0] Phase 27G: MAS-Aware Waterfall — MAS decisions + signals in telemetry stream, timeline, and per-run waterfall traces — 2026-05-20
- [v2.7.1] Doc Drift Detection: Automated guardrail (`tools/doc-drift-check.js`) and policy enforcement — 2026-05-20
- [v2.7.0] Phase 27I: Autonomous Recovery Plane (C3/C4) + MAS Rerun Logic + Archival Agent — 2026-05-21
- [v2.6.0] Phase 27A–F: MAS Decision Persistence, Synergy Panel, Drift Trace Panel — 2026-05-20
- [v2.3.0] Phase 27: MAS Phase 1-2 Fusion — unified `mas.js`, orchestrator MAS wiring, Blackboard API + Dashboard Panel — 2026-05-20
- [v2.2.0] Connectivity Standardization + Intelligence Timeline + Manual Override Telemetry — 2026-05-21
- [v2.1.0] Control Plane agents endpoint fix + Waterfall Trace Renderer + Stable N=50 concurrency — 2026-05-20
- [v2.0.0] Phase 26: Concurrency Stress Harness — scenarios A–E, fault injector, verdict engine, Stress Panel — 2026-05-21
- [v1.9.0] MAS Phase 2: Shared Blackboard Memory Plane — 5-channel fact store, query API, JSON persistence — 2026-05-20
- [v1.8.0] MAS Phase 1: Synergy Analyzer — signal model, decision engine, deterministic routing + SHA-256 correlation — 2026-05-20
- [v1.7.0] Phase 25: CIC Intelligence Layer — harvester, enricher, orchestrator integration — 2026-05-20
- [v1.6.0] Phase 24 completion: SLO panel, telemetry pipeline, agent metrics — 2026-05-20
- [v1.5.0] Phase 24: Observability Dashboard — real-time agent status, Playwright E2E, Google Auth, circuit breakers — 2026-05-20
- [v1.4.0] Harvester-PMS Integration — shared PMS client, multimodal Gemini client, prompt pack trio — 2026-05-18
- [v1.3.0] Phase 22–23: Control Plane hardening, region failover, telemetry subsystem — 2026-05-19
- [v1.2.0] Phase 19: Orchestrator Upgrade — deterministic multi-agent engine, PMS integration, drift telemetry — 2026-05-18
- [v1.1.0] Phase 18: Prompt Management System — four subsystems for prompt orchestration — 2026-05-18

---

## Active

---

## Planned

1. **Phase 27H — MAS Routing Heatmap**: Birds-eye frequency view of which agents trigger which directives (`rerunAgent`, `skipAgent`, etc.). Renders as an ASCII frequency table in the dashboard.

---

## Suggestion Log

> Ideas raised during sessions but not yet agreed upon. Nothing is silently dropped.  
> Format: `YYYY-MM-DD — [idea] — raised during [context]`

- 2026-05-21 — Configurable retry count and adaptive backoff for `rerunAgent` directive — raised during Phase 27I implementation
- 2026-05-21 — Configurable debug log level for LLM clients to capture raw model output without code changes — raised during Gemini model mapping fix
- 2026-05-21 — Improved JSON parsing robustness for safe-mode recovery (handle non-JSON model output more gracefully) — raised during golden-path test validation
- 2026-05-20 — Per-agent drift breakdown in the Drift Trace Panel (separate drift/conf chart per agent lane) — raised during Phase 27F implementation
- 2026-05-20 — MAS confidence threshold tuning UI — allow operator to adjust the 0.35/0.45 thresholds from the dashboard without code changes — raised during Synergy Analyzer review
- 2026-05-20 — Blackboard TTL/pruning policy — old signals accumulate forever; consider a configurable retention window (e.g., last 7 days) — raised during Phase 27A persistence design
