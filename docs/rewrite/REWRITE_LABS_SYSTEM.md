# System Overview

The Rewrite Labs ecosystem is an operator-grade architecture designed for high-precision LLM orchestration, now fully migrated to the **Antigravity 2.0** standard.

## Current Project Snapshot

- **CIC (Cast Iron Charlie)** — A multi-agent Documentary Research Engine at `C:\dev\rewrite-mcp\castironforge\cic-ingestion\`.
  - Pipeline: `INGEST → ENRICH → ORCHESTRATE → SYNTHESIZE → AUDIT`
  - Subsystems: `Image Analyzer`, `Document Analyzer`, `Evidence Normalizer`, `Evidence Schema v1.0`
  - Completed: Queue + DLQ, `ReverseImageSearchExtractor`, full test suite passing.
  - Observability Dashboard: `apps/operator-ui/dashboard/index.html` — single-file dark theme polling 6 agents every 10s.

- **Rewrite Labs** — AI-powered website redesign company, separate from CIC.
  - Pipeline: `Discovery → Harvester → Redesign → Outreach → Delivery`
  - 20-site SMB benchmark corpus: 18/20 captured; Opus/Sonnet A/B tests pending API credits.
  - Owners: `Chris + Balraj`

- **Multi-AI Workflow**
  - `Copilot` is the orchestrator for documentation, summaries, Microsoft 365 integration, and workflow structuring.
  - `Claude` is the deep systems engine for architecture, code reasoning, and complex synthesis.
  - `Wispr` is input acceleration from voice into structured text.

- **Coding & Ops Standards**
  - Deterministic operator-grade code, ESM with explicit `.js`, structured JSON logs, explicit errors, isolated subsystems.
  - Node.js 20+, WSL2 Ubuntu 22.04+, WebSocket + HTTP, Castironforge MCP backend, HTML + vanilla JS frontend.

- **Living Document Rules**
  - `FIND → READ → DETERMINE VERSION BUMP → GENERATE → UPLOAD → ARCHIVE IN PLACE → CONFIRM`
  - Never overwrite older versions; preserve history in place.

- **Personal Preferences**
  - Highly technical, deterministic, multi-step execution plans.
  - Exact file paths, commands, diffs, and verification steps.
  - Avoid orphan dashboards or duplicated consoles.
  - Prefer isolated dependencies and reproducible setups.

## Core Components

### Antigravity Runtime

The foundational environment for the Rewrite monorepo, utilizing the Antigravity CLI and SDK for agent development and deployment. It defaults to the **Gemini 3.5 Flash** model for high-speed, agentic reasoning.

### Prompt Management System (PMS)

The PMS provides deterministic, versioned, and model-optimized prompt assembly. It includes the **Flash-Grade Fallback Engine**, which manages multi-tier model chaining (Gemini → Claude → Llama) and guarantees structural integrity through **Safe-Mode Templates**.

### Orchestrator v2.1

A high-concurrency execution engine that manages multi-agent workflows.

**Key Features (Phase 25/26 Upgrades):**

- **Parallel Execution**: Simultaneous agent orchestration using asynchronous `Promise.all` patterns.
- **Resilience Layer**: Automated retries with jitter and model fallbacks.
- **Pipeline Checkpointing**: Real-time state-saving of agent outputs for resumability and auditability.
- **Correlation Integrity**: Unified tracing across all concurrent sub-agent tasks.
- **Golden-Path Verification**: Automated suites ensure reliability across the full parallel lifecycle.

### MAS Subsystem (Phase 27-31)

The Multi-Agent Synergy layer sits between the Orchestrator and its agents, providing real-time routing decisions, shared memory, and cognitive traceability.

- **Synergy Analyzer** (`src/mas/synergyAnalyzer.js`): Consumes agent telemetry packets and emits routing directives — rerunAgent, speculativeRun, parallelizeAgents, skipAgent, fallbackAgent. Every directive is SHA-256 hashed into a `correlationId` for full trace linkage.
- **Blackboard** (`src/mas/blackboard.js`): Shared memory plane with five typed channels (facts, entities, signals, hypotheses, notes). Entries are deterministically hashed and WAL-persisted to `data/mas-blackboard.json`.
- **Introspection & Efficacy (Phase 30-31)**: Provides accountable autonomy by recording the "why" behind every MAS intervention. It utilizes counterfactual simulation to model projected instability vs. mitigated outcomes, surfacing ROI metrics like "Failures Avoided" in the Efficacy Lab dashboard.
- **MAS Fusion Layer** (`src/mas/mas.js`): Unified entry point that combines the Synergy Analyzer and Blackboard. Exposes `processTelemetry()` for agent execution hooks and re-exports all blackboard read/write APIs under production-safe names (`publishFact`, `publishEntity`, etc.).
- **Orchestrator Integration** (`orchestrator.js` v1.1.0): All agent executions run through `runAgentWithMAS()`, which measures per-step latency, translates agent names to MAS IDs via `MAS_AGENT_MAP`, and applies returned directives (e.g. triggering a `rerunAgent` retry) within the same execution step.
- **Operator Dashboard Panels**: Live-polling MAS Blackboard, Cognitive Trace, and Efficacy Lab panels in the Observability Dashboard.

### Autonomous Recovery Plane (Phase 27)

The self-stabilization layer that monitors and governs the Antigravity runtime based on the **Antigravity SLO Charter**.

- **SLO Metrics Plane (C1)**: Aggregates live signals from telemetry, runtime counters, and error budgets into windowed SLO aggregates. Accessible via `GET /api/control-plane/metrics/slo`.
- **Recovery Policies Engine (C2)**: A deterministic decision engine that evaluates SLO metrics against declarative, versioned policy sets (`policy-set.json`). It produces recovery actions such as throttling, fallback escalation, and quarantining.
- **SLO Dashboard**: The primary operational interface for monitoring real-time health gauges, error budget burn rates, and active recovery actions.

---

## Technical Reference

### Architecture
- [Control Plane Design](architecture/control-plane-design.md)
- [SLO Dashboard Spec](architecture/slo-dashboard-spec.md)
- [Prompt Management (PMS)](architecture/pms.md)
- [Agent Orchestration](architecture/agents.md)
- [Pipeline Architecture](architecture/pipeline.md)
- [Telemetry Subsystem](architecture/telemetry.md)
- [MAS Introspection & Efficacy](architecture/mas-introspection.md)

### Governance & Policy
- [Antigravity Mandate](governance/ANTIGRAVITY.md)
- [SLO Charter](governance/SLO_CHARTER.md)
- [Documentation Policy](governance/DOC_POLICY.md)
- [Versioning Standard](governance/VERSIONING.md)
- [Secret Plane](governance/SECRET_PLANE.md)

### Tools & Operations
- [Runtime Harness](tools/runtime-harness.md)
- [Prompt Telemetry](tools/prompt-telemetry.md)
- [Master Instructions](manuals/master-instructions-manual/v1.2/manual.md)

### Releases
- [Changelog](releases/CHANGELOG.md)
- [Latest Release (v2.15.0)](releases/2.15.0.md)
- [Phase 25 (Antigravity)](releases/phase-25-antigravity.md)

