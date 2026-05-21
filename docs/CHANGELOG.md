# Changelog

## [2.8.1] - 2026-05-20
### Added
- **Phase 28: Auto-Tagging + Release Bundles**: Automated the final release pipeline.
    - **Release Tagging** (`tools/release-tag.mjs`): Automated Git tagging with drift verification.
    - **Release Bundling** (`tools/release-bundle.mjs`): Creates portable `.tar.gz` distribution bundles with SHA256 checksums.
- **Control Plane**: Added static file serving for documentation and release artifacts.
- **Operator UI**: Integrated Release Notes Panel for real-time visibility.
- **Harvester**: Minor client updates for model consistency.
- **Doc Drift Detection (Final Wiring)**: Automated guardrail to prevent code/doc divergence.
    - **Drift Checker** (`tools/doc-drift-check.js`): Node.js tool that enforces version sync and subsystem-specific documentation in the changelog.
    - **Policy Enforcement**: Updated `ANTIGRAVITY.md` and `docs/DOC_POLICY.md` with mandatory drift checks and updated Doc Policy.

## [2.8.0] - 2026-05-20
...
### Added
- **Autonomous Recovery Plane (C3/C4) — Self-Healing & SLO Dashboard**: Implementation of the autonomous control loop and real-time SLO visualization.
    - **Recovery Control Loop** (`projects/cic/control-plane/recovery/control-loop.js`): Autonomous `tick()` cycle that pulls SLO metrics, evaluates declarative policies, and triggers recovery effectors (throttle, fallback, quarantine) with cooldown logic.
    - **SLO Metrics Aggregator** (`projects/cic/control-plane/recovery/slo-aggregator.js`): Unified metrics aggregation logic for Reliability, Safe-Mode, Latency, and Error Budget.
    - **Recovery History API** (`apps/control-plane/routes/recovery.js`): New route providing access to the durably persisted history of autonomous recovery actions.
    - **SLO Dashboard Panel** (`apps/operator-ui/js/slo-panel.js`): Real-time dashboard component rendering reliability gauges, active policy triggers, and recovery history.
    - **Dashboard SLO Integration** (`apps/operator-ui/dashboard/index.html`): Wired the SLO panel into the main Observability Dashboard with CSS hardening and dynamic state updates.
- **MAS Dynamic Re-routing — Rerun & Fallback Logic**: Operationalized MAS decision directives within the execution pipeline.
    - **MAS-Aware Orchestration** (`projects/cic/orchestrator/src/orchestrator.js`): Refactored `runAgentWithMAS` to act on `rerunAgent` and `fallbackAgent` directives, enabling self-correcting agent execution based on telemetry.
    - **Agent Telemetry Metadata** (`projects/cic/orchestrator/src/agentExecutor.js`): Enhanced agent output to include latency and drift metrics for downstream MAS decision-making.
    - **PMS Drift Linkage** (`projects/cic/orchestrator/src/pmsClient.js`): Integrated drift detection into `buildPrompt` to feed live drift signals into the MAS Synergy Analyzer.
- **Archival Specialist Agent Prototype**: A specialized research agent utilizing the Antigravity SDK patterns.
    - **Archival Agent** (`projects/cic/orchestrator/src/agents/archivalSpecialist.js`): Specialized research agent for analyzing archival records and identifying historical gaps.
    - **Archival Prompt Pack** (`apps/cic-pms/packs/archival_specialist_v1.json`): Task-specific instructions for archival analysis and structured output generation.
    - **Archival Test Suite** (`projects/cic/orchestrator/tests/archival_specialist.test.js`): Verification suite for archival agent behavior and output validation.

### Fixed
- **Gemini Model Mapping** (`apps/cic-pms/src/rawGeminiClient.js`): Standardized `gemini` model name to `gemini-3.5-flash` to ensure compatibility with Antigravity 2.0 mandates and fix connectivity errors.
- **API Versioning & Integration** (`apps/control-plane/index.js`, `apps/operator-ui/js/control-plane-api.js`): Integrated recovery routes and updated CicAPI version to support new recovery endpoints.

## [2.6.0] - 2026-05-20

### Added

- **Phase 27A–F: MAS Decision Persistence + Synergy Panel + Drift Trace Panel**: Full MAS observability stack — every routing directive is now durable, queryable, and visible in the operator console.
    - **Blackboard decisions channel** (`projects/cic/orchestrator/src/mas/blackboard.js`): Added `decisions: []` to persisted state with forward-compatible cold-start migration. `addDecision` validates entry, appends with ISO timestamp, enforces 200-entry ring buffer, persists atomically. `getDecisions` returns a deep-copy snapshot.
    - **`processTelemetry` persistence** (`projects/cic/orchestrator/src/mas/mas.js`): `addDecision` now called after every `analyzeSynergy` call, capturing `agent`, `drift`, `confidence`, `action`, `target`, `reason`, and `correlationId`. No directive evaporates anymore.
    - **`GET /mas/decisions`** (`apps/control-plane/routes/mas.js`): New Control Plane endpoint reads `decisions` array from `mas-blackboard.json`. Returns `{ ok: true, decisions: [] }` gracefully before any orchestration runs.
    - **MAS Synergy Decisions Panel** (`apps/operator-ui/dashboard/index.html`): Full-width dashboard section with 6-metric stats bar (Total, Reruns, Fallbacks, Speculative, Skips, Stable), 50-entry newest-first decision log with agent, action, target, drift, confidence, reason columns. Color-coded: green=stable, amber=warn, red=crit. Polls every 10s.
    - **MAS Drift Trace Panel** (`apps/operator-ui/dashboard/index.html`): Full-width dual ASCII chart panel — drift trace left, confidence trace right, last 80 signals. Stats bar: signal count, latest drift/conf, trend direction (↑/↓/→), MAS Mood (STABLE/UNCERTAIN/CRITICAL) color-coded against synergy thresholds. `asciiBarChart` shared helper normalizes any 0–1 value array to a 10-row bar chart.
- **Doc Policy Infrastructure**: Formal documentation update policy and shared model skill.
    - **Formal Policy** (`docs/DOC_POLICY.md`): Keep a Changelog rules, roadmap maintenance rules, versioning scheme, mandatory trigger table, model enforcement mandate.
    - **Shared Skill** (`skills/doc-update.md`): Model-agnostic 5-step skill spec (determine version → compute bump → write changelog → update roadmap → validate). Compatible with Claude, Gemini, and any AI assistant in this workspace.
    - **Living Roadmap** (`docs/ROADMAP.md`): Completed phases v1.1.0–v2.6.0, Active queue, Planned backlog, Suggestion Log for unagreed ideas.
# Changelog

## [2.3.0] - 2026-05-20


- **MAS Phase 1-2 Fusion — Unified Subsystem**: Merged the Synergy Analyzer and Blackboard into a single, production-ready module.
    - **`mas.js` Fusion Layer**: Created `projects/cic/orchestrator/src/mas/mas.js` — the canonical entry point for all MAS interactions. Provides `processTelemetry`, `publishFact`, `publishEntity`, `publishHypothesis`, `publishNote`, `readBlackboard`, and all query functions. Adds a `data/` directory guard on module load.
    - **Orchestrator MAS Wiring** (`orchestrator.js` v1.1.0): All agent executions now flow through `runAgentWithMAS()`, which measures latency, maps orchestrator agent names (`extractor`, `synthesizer`, etc.) to MAS agent IDs (`INGEST`, `SYNTHESIZE`, etc.) via `MAS_AGENT_MAP`, and routes MAS directives (`rerunAgent`, `fallbackAgent`, etc.) back into the execution loop.
- **MAS Blackboard API** (`/mas/blackboard`): New authenticated GET endpoint on the Control Plane. Reads `mas-blackboard.json` directly from disk (file-system bridge between ESM orchestrator and CJS control plane). Returns `{ ok: true, blackboard: null, reason: 'no_data_yet' }` before any orchestration runs.
- **MAS Blackboard Dashboard Panel**: New live-polling observability panel in `apps/operator-ui/dashboard/index.html`. Displays Signals / Facts / Entities / Hypotheses / Notes counts and a 30-entry scrollable signal log with agent name, directive action, drift, confidence, and reason columns. Refreshes every 10 seconds.

## [2.2.0] - 2026-05-21
### Fixed
- **Connectivity Standardization**: Standardized all local service communication on `127.0.0.1` (IPv4) to resolve DNS resolution inconsistencies (`localhost` vs `127.0.0.1`) causing 502 and fetch errors.
- **Intelligence Server Compliance**: Implemented missing `/agents` endpoint in `intelligence-server.js` to provide the Control Plane with expected agent metadata.
- **Operator UI Selectors**: Fixed a critical collision in CSS selectors where the "EXPORT LOGS" button in the header was intercepting clicks intended for agent "RESET" buttons.
- **Correlation ID Regex**: Updated Playwright test regex to support the actual hyphenated format of correlation IDs generated by the Control Plane.
- **Service Binding**: Standardized all backend services (Control Plane, Intelligence, Telemetry) to bind explicitly to `0.0.0.0` for reliable cross-process communication.

### Added
- **Intelligence Timeline**: Integrated a global, filterable event timeline into the Observability Dashboard, surfacing Model Calls, Drift, Pipelines, and Manual Overrides.
- **Manual Override Telemetry**: Instrumented agent RESET/KILL actions to emit `OVERRIDE` events to the telemetry stream with full correlation tracking.

## [2.1.0] - 2026-05-20
### Fixed
- **Control Plane Agents Endpoint**: Resolved a critical `fetch is not a function` error in the `regions` router by switching to the standardized `fetchWithRetry` utility.
- **Subsystem Cleanup**: Surgically removed legacy/hallucinated OneDrive and MCP components from the CIC ingestion subsystem.
- **Import Resolution**: Fixed critical imports in `tokenMeter.js` and `harvester/index.js` within the Intelligence server.

### Added
- **Waterfall Trace Renderer**: Implemented a new visualization component in the Operator UI for rendering telemetry-linked waterfall traces.
- **Stable Concurrency**: Verified system stability at N=50 concurrency with 100% success rate using the new stress harness.

## [2.0.0] - 2026-05-21
### Added
- **Phase 26 Runtime Hardening (Completion)**: Delivered the Concurrency Stress Harness and observability upgrades.
    - **Concurrency Stress Harness**: Implemented a comprehensive test driver (`tools/concurrency-harness`) for validating Antigravity runtime under load.
    - **Scenario Engine**: Defined Pattern A-E test scenarios, including Parallel Fan-Out, Burst Storm, Latency Chaos, Partial Failure, and Long-Running Soak.
    - **Fault Injector**: Implemented surgical `fetch` overrides for injecting latency, hard network errors, and HTTP status codes.
    - **Verdict Engine**: Added invariant-based pass/fail diagnostics (correlation integrity, parallel isolation, safe-mode semantics).
    - **Operator UI Integration**: Created a telemetry-aware Stress Panel for the Control Room, including drill-down trace visualization.
    - **Observability**: Integrated real-time memory monitoring and telemetry-linked waterfall traces for stress runs.

## [1.9.0] - 2026-05-20
### Added

- **MAS Phase 2 — Shared Blackboard Memory Plane**: Implemented cross-agent shared memory for real-time state collaboration.
    - **Blackboard Module**: Created `projects/cic/orchestrator/src/mas/blackboard.js` with a versioned, JSON-persisted fact store.
    - **Fact Model**: Five distinct channels — facts, entities, signals, hypotheses, notes — each with deterministic SHA-256 entry IDs.
    - **Write API**: `addFact`, `addEntity`, `addSignal`, `addHypothesis`, `addNote` — all boundary-validated.
    - **Query API**: `queryFacts`, `queryEntities`, `querySignals`, `queryHypotheses`, `queryNotes`, `getBlackboard`.
    - **Persistence**: Atomic WAL-safe JSON writes to `data/mas-blackboard.json` with corruption-safe cold-start fallback.

## [1.8.0] - 2026-05-20
### Added

- **MAS Phase 1 — Synergy Analyzer Operationalization**: Implemented the Multi-Agent Synergy decision engine.
    - **MAS Signal Model**: Validated telemetry packet schema for all five agent types (INGEST, ENRICH, ORCHESTRATE, SYNTHESIZE, AUDIT).
    - **Decision Engine**: Rule-based routing directive computation — rerunAgent, speculativeRun, parallelizeAgents, skipAgent, fallbackAgent.
    - **Deterministic Routing**: Every directive is SHA-256 hashed into a 16-char `correlationId` for full trace linkage.
    - **Operator Logging**: Structured JSON log output via `logSynergyDecision`, CIC-telemetry-compatible.
    - **Module**: `projects/cic/orchestrator/src/mas/synergyAnalyzer.js` — isolated, zero external deps.

## [1.7.0] - 2026-05-20
### Added
- **Phase 26 Runtime Hardening (Partial)**: Implemented core resilience features for the Antigravity engine.
    - **Flash-Grade Fallback**: Centralized `modelFallback.js` with multi-tier model chaining (Gemini → Claude → Llama).
    - **Safe-Mode Templates**: Created a dedicated library of schema-valid JSON templates for every agent.
    - **JSON Normalization**: Implemented `jsonNormalize.js` to guarantee consistent object structures across the pipeline.
    - **Parallel Checkpointing**: Enabled automated state-saving for concurrent agent execution in `orchestrator.js`.
    - **Correlation Expansion**: Unified tracing and correlation mapping across all parallel sub-tasks.
- **Unified Model Interface**: Created `unifiedModelClient.js` to normalize provider responses.

## [1.6.0] - 2026-05-20
### Added
- **Antigravity 2.0 Migration (Phase 25)**: Transitioned the ecosystem to Google's latest agentic coding platform.
    - **Foundational Mandate**: Established `ANTIGRAVITY.md` at the workspace root to govern the new toolset.
    - **Model Upgrade**: Upgraded all core LLM clients to default to `gemini-3.5-flash` for improved speed and reasoning.
    - **Parallel Orchestration**: Refactored the Orchestrator for concurrent agent execution using asynchronous `Promise.all` patterns.
    - **Migration Roadmap**: Codified the transition strategy in `docs/migrations/antigravity.md` and updated system state.
- **Infrastructure Fixes**: Resolved monorepo path resolution issues affecting cross-package imports in the `projects/cic` directory.

## [1.5.0] - 2026-05-20
### Added
- **CIC Observability Dashboard**: Implemented a real-time monitoring interface for the CIC pipeline.
    - **Real-time Interface**: Created `apps/operator-ui/dashboard/index.html` featuring an Agent Grid, Pipeline Diagram with animations, and an Event Log.
    - **Control Plane Integration**: Connected the dashboard to the `/agents` API for live status updates.
    - **Security**: Hardened the `/dashboard` route with Google Identity Auth and a Login Gate.
    - **Manual Overrides**: Added "RESET/KILL" circuit breakers for each agent (INGEST, ENRICH, ORCHESTRATE, SYNTHESIZE, AUDIT, MODELS).
- **Playwright E2E Suite**: Comprehensive automated testing for the Observability Dashboard.
    - **Test Coverage**: Visual regression, latency/timeout handling, and functional flows.
    - **CI/CD Integration**: Added GitHub Actions workflow `.github/workflows/cic-dashboard-e2e.yml` for automated validation.

## [1.4.0] - 2026-05-18
### Added
- **Prompt Telemetry System**: Integrated a real-time monitoring dashboard for prompt performance and drift.
    - **Telemetry Service**: Implemented a Node.js ESM service for ingesting pack usage, drift events, and model call metrics.
    - **Operator UI Integration**: Added a "Prompt Telemetry" panel to the CIC Control Room with Cast Iron Charlie design styling.
    - **Telemetry Proxy**: Mounted authenticated `/telemetry` routes in the Control Plane to proxy service data.
    - **Subsystem Hooks**: Integrated telemetry emitters into Harvester and Orchestrator `pmsClient` and `geminiClient` modules.
    - **Unified UI Serving**: Updated Control Plane to serve the Operator UI directly on Port 3000, simplifying local development.

## [1.3.0] - 2026-05-19
### Added
- **Harvester-PMS Integration**: Unified the ingestion pipeline with the Prompt Management System.
    - **Shared Harvester PMS Client**: Implemented a context-aware `pmsClient.js` for all extractors and classifiers.
    - **Multimodal Gemini Client**: Added a basic `geminiClient.js` with base64 image support.
    - **Harvester Prompt Pack Trio**: Added `analysis_v1`, `research_v1`, and `rewrite_v1` packs.
    - **PMS Library Enhancements**: Updated `cic-pms` assembler to support dynamic context injection and multimodal payloads.
    - **Validation Suite**: Added pack validation and golden-path integration tests for the Harvester.

## [1.2.0] - 2026-05-18
### Added
- **Orchestrator Upgrade (Phase 19)**: Implemented a deterministic, multi-agent execution engine integrated with the PMS.
    - **Orchestrator Prompt Pack Trio**: Added planning, agent instruction, and synthesis prompt packs.
    - **Core Orchestrator Modules**: Implemented `taskInterpreter`, `pipelineSelector`, `agentPlanner`, `agentExecutor`, and `synthesizer`.
    - **PMS Drift Telemetry**: Integrated real-time drift detection for all Orchestrator prompt packs.
    - **Golden-Path Test Suite**: Added comprehensive end-to-end testing for the Orchestrator pipeline.

## [1.1.0] - 2026-05-18
### Added
- **Prompt Management System (PMS)**: Implemented four specialized subsystems for prompt orchestration:
...
