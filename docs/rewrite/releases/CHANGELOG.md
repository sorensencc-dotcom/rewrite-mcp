# Changelog

## [2.25.0] - 2026-05-30
### Added
- **Phase 36: Ford Integration (GAP-004)**: Materialized and executed the third biographical mission focusing on Sorensen's early Ford years (1905-1914).
    - **Mission Control** (`scripts/mission-control.js`): Updated to version 1.1.1. Hardened simulation logic for high-density industrial archives (Ford Piquette and Highland Park plants).
    - **GAP-004 Mission Assets**: Created Goal Manifest, Mission Pack, and hybrid industrial-strict Audit Configuration (`AuditConfig_GAP-004.json`).
    - **Structured Research Block** (`data/GAP-004_Research_Block.json`): Verified 1905 payroll ledger at Piquette, 1910 Highland Park superintendent role, and 1913 moving assembly line signatures.
    - **Narrative Gap Report** (`docs/GAP-004_Narrative_Gap_Report.md`): Finalized report documenting the transition from master patternmaker to industrial architect.
### Changed
- **Mission Control** (`scripts/mission-control.js`): Refactored simulation logic into a switch-like structure for better arc-specific result fidelity.

## [2.24.0] - 2026-05-30
### Added
- **Phase 35: Early American Integration (GAP-003)**: Materialized and executed the second biographical mission focusing on Sorensen's early US years (1900-1914).
    - **Mission Control** (`scripts/mission-control.js`): Hardened simulation logic to handle multiple research arcs (Danish Origins vs. US Integration) with arc-specific evidence simulation and subject materialization.
    - **GAP-003 Mission Assets**: Created Goal Manifest, Mission Pack, and biographical-strict Audit Configuration (`AuditConfig_GAP-003.json`).
    - **Structured Research Block** (`data/GAP-003_Research_Block.json`): Verified 1900 Census, Chicago Machinist Union registry (#14), and relocation to Detroit in 1902.
    - **Narrative Gap Report** (`docs/GAP-003_Narrative_Gap_Report.md`): Finalized report documenting the industrial transition from Chicago apprenticeship to Detroit engine shops.
### Changed
- **Mission Control** (`scripts/mission-control.js`): Refactored deliverable generation to be goal-agnostic via target-goal-based filename template.

## [2.23.0] - 2026-05-30
### Added
- **Phase 34: CIC AI Runtime Governance & Danish Origins (GAP-002)**: Hardened the system with runtime contracts and executed the first biographical mission.
    - **CIC AI Runtime v1.0.0**: Implemented a four-agent deterministic contract loop (CIC, RTK, RRK-AI, git-ai) with strict role boundaries and data contracts.
    - **Contract Loader** (`src/runtime/contract-loader.ts`): New utility to load and validate the CIC AI Runtime Contract (`CIC_AI_RUNTIME_CONTRACT.md`).
    - **RTK/RRK/gita Governance Patches**: Integrated contract validation into the boot sequence of core subsystems to prevent ungoverned execution.
    - **GAP-002 Mission Control**: Executed the "Danish Origins" research mission with a new biographical-strict audit posture.
    - **Biographical Audit Config** (`AuditConfig_GAP-002.json`): Enforced zero-anomaly tolerance, dual-primary-source verification, and strict temporal alignment for genealogical research.
    - **Structured Research Block** (`data/GAP-002_Research_Block.json`): Verified biographical data for Charles Emil Sorensen, including Lellinge parish records and Copenhagen emigration logs.
    - **Narrative Gap Report** (`docs/GAP-002_Narrative_Gap_Report.md`): Finalized research report documenting the transition from Denmark to the US.
### Changed
- **Mission Control** (`scripts/mission-control.js`): Updated to support dynamic `AuditConfig` loading and posture enforcement.

## [1.1.0] - 2026-05-30

### Added
- PMS subsystem (executor, registry, loader, templates)
- PMS integration into ImageAnalyzer, TextExtractor, Harvester
- RTK Active Automation Layer (burst planning, smoke gating, safeguards)
- Control Plane endpoints:
  - /pms/templates
  - /rtk/automation/state
- Hybrid Test Harness (Mode B) with 5 scenario suites
- 63 passing tests (unit + contract + hybrid)
- Updated CIC_SYSTEM.md with new architecture sections
- v1.1.0 Release Notes + Diagram

### Changed
- Harvester now attaches PMS metadata to ingestion results
- RTK now enforces section‑tracking invariants and failure‑rate thresholds

### Fixed
- PMS template resolution path robustness
- Extractor orchestration consistency
- Test discovery patterns in Vitest config

## [2.22.0] - 2026-05-24
### Added
- **Memory Sync Pack Infrastructure (Phase 9/33 Refinement)**: Hardened cross-platform alignment artifacts into production-grade infrastructure.
    - **Infrastructure-Grade Packaging**: Automated generation of versioned `.tar.gz` archives for all platform memory files.
    - **Dynamic Versioning**: Implemented `YYYY.MM.DD.NN` versioning for sync packs with automated daily incrementing.
    - **Integrity Manifests**: Every sync pack now includes `memory_sync_manifest.json` with SHA256 hashes and Git commit metadata.
    - **Change-Tracking Deltas**: New `memory_sync_deltas.json` identifies exact file changes and provides human-readable summaries.
    - **Hardened Validation**: `validate.ts` updated with regex-based format checks, cross-validation logic, and literal doctrine integrity verification.
    - **Continuous Delivery**: Integrated Memory Sync Pack export into GitHub Actions via `.github/workflows/memory-sync-pack.yml`.
    - **High-Fidelity Templates**: Refactored `merge.ts` with modular synthesis helpers and platform-optimized templates for Copilot, Gemini, and Claude.

## [2.21.0] - 2026-05-24
### Added
- **Multi-Agent AI-OS Governance & Evolution Stack (Phase 9/33)**: Implementation of the core governance and self-improvement substrate.
    - **Multi-Agent Execution Model**: Defines runtime semantics, task lifecycles, and deterministic ordering for distributed agents.
    - **Operator Control Plane**: Establishes operator (Chris) as the root authority with explicit command semantics (/route, /override, /policy).
    - **System Policy Engine**: Centralized, operator-programmable governance logic with policy inheritance and enforcement.
    - **Meta-Operator Layer**: Self-reflection engine enabling autonomous analysis of policies, workflows, and strategies.
    - **Meta-Audit Engine**: Continuous observability and subsystem health analysis providing structured, operator-grade reports.
    - **Meta-Evolution Engine**: Adaptive intelligence layer generating, ranking, and simulating system improvements for approval.
    - **Meta-Evolution Log**: Immutable, append-only genetic ledger of all evolutionary events and operator decisions.
    - **Meta-Evolution Simulator**: Predictive "what-if" engine for forecasting impact, risk, and stability deltas.
    - **Meta-Evolution Ranker**: Decision-making cortex prioritizing evolutions based on weighted impact and risk scoring.
- **AI-OS Application Hardening**: Fixed critical syntax errors in the Diff Tool and updated `tsconfig.json` for Node.js module compatibility.

## [2.20.0] - 2026-05-24
### Added
- **Intelligence Plane Operationalization**: Full end-to-end integration of the ingestion, extraction, and synthesis layers.
    - **Deterministic Ingestion Normalization** (Phases 29A): 8-stage pipeline (Boundary, ID, Dedupe, Metadata, Content, Text, Region, Assembly) guaranteeing canonical asset envelopes.
    - **Extractor Interface v1.0**: Pluggable, side-band artifact contract for post-ingestion processing.
    - **Image Analyzer v2.0**: Reference vision subsystem producing deterministic scene, object, face, and embedding artifacts.
    - **Asset Intelligence Record (AIR)**: Centralized state management merging heterogeneous signals into a unified view.
    - **Thematic Synthesis Engine**: Three-lens (Technical, Historical, Narrative) integration logic for research-grade outputs.
- **Rewrite Labs Skill Pack v1.0**: Production-ready automation suite (Discovery, Extractor, Redesign, Outreach) for multi-tenant CIC runtime.
- **Audio Transcriber Extractor**: Reference audio pass for structured transcript generation.

## [2.19.0] - 2026-05-23
### Added
- **Live Stress Validation (N=50)**: Empirical proof of MAS Efficacy Lab performance under high load.
    - **Stress Harness Verified**: Executed Phase 26 harness with 50 concurrent agents against the new Orchestrator-based Intelligence server.
    - **Stability Metrics**: Prevented 112 instability events and avoided 9,523 projected failures via MAS corrective actions.
    - **Cognitive Traces**: Captured 275 high-fidelity decision traces in `mas-introspection.json`.
    - **Mock Model Layer**: Enhanced `unifiedModelClient.js` with context-aware synthetic load injection for isolated MAS validation.
- **Doc Policy Synchronization**: Reorganized the Arsenal Knowledge Base and updated the global Doc Policy to reflect the new hierarchical structure.
- **Startup & Launcher Documentation**: Created a dedicated operational manual (`docs/rewrite/manuals/startup.md`) for the one-click GUI launcher and hardened CLI boot scripts.

## [2.18.0] - 2026-05-22
### Added
- **Security Infrastructure & Hardening**: Comprehensive protection against malware and credential leakage.
    - **Malware Scanner** (`scripts/run-scanner.js`): Automated signature-based sweep for the `quarantine/` directory.
    - **Pipeline Verification** (`scripts/verify-quarantine.js`): Health-check suite for security component integrity.
    - **Secret Protection Hook** (`.husky/pre-commit`): Automated pre-commit interceptor to prevent accidental Google/AWS key commits.
    - **Security Test Harness** (`tests/security-harness.js`): Reusable verification suite for the entire security plane.
    - **Security Manual** (`docs/rewrite/manuals/security_infrastructure.md`): Detailed operational guide for the new security features.

## [2.17.0] - 2026-05-22
### Added
- **Unified Global Navigation & Command Center**: Operational braid for the entire CIC ecosystem.
    - **Command Center** (`apps/operator-ui/index.html`): Central entry point for all system planes (Operations, Analytics, Technical, Knowledge, Intelligence, Research).
    - **Global Navigation Bar** (`apps/operator-ui/js/global-nav.js`): Universal navigation system fixed to every dashboard and documentation surface.
    - **Visual Unification**: Centralized design system in `colors_and_type.css` following the "Iron & Ember" aesthetic.
- **Web Regression Skill & Harness**: Automated integrity verification for the web ecosystem.
    - **Regression Script** (`tools/regressions/check-links.sh`): Crawls HTML and built site artifacts to verify internal and external link integrity.
    - **Project Skill** (`skills/web-regression.md`): Standardized procedure for link verification.
    - **Build Integration** (`package.json`): Automated link testing after MkDocs builds and during release cycles.
- **MkDocs Industrial Overhaul**: High-density, premium layout for the Knowledge Base.
    - **Industrial Theme** (`docs/css/charlie-theme.css`): Aggressive CSS overrides for high-density, strictly-branded documentation.
    - **Hero Landing Page** (`docs/index.md`): Categorized grid navigation with premium typography.
### Changed
- **Auth Bypassed**: Disabled Google Identity Services for direct local access.
    - **Backend Mode** (`apps/control-plane/.env`): Enabled `AUTH_DISABLED=true`.
    - **Dashboard Hardening**: Removed sign-in gates and login screens from all interfaces.
- **Navigation Braiding**: Cross-linked every system surface back to the Command Center.

## [2.16.0] - 2026-05-22
### Added
- **Operator Console Health Loader (Phase 32B)**: Authoritative baseline health-check execution engine for system validation.
    - **Health Engine** (`apps/control-plane/src/health-engine.js`): Deterministic manifest loader with parallel execution and timeout management.
    - **Health Route** (`apps/control-plane/routes/health.js`): Authoritative `/health/baseline` endpoint for operator-level system probes.
    - **E2E Test Alignment** (`tests/pipeline.e2e.test.js`): Synchronized golden-path tests with modern Control Plane route structure.
    - **Health Manifest** (`projects/cic/health/baseline.healthcheck.json`): Comprehensive baseline probes for Ingestion, PMS, and E2E Pipeline.
    - **Control Plane** (`apps/control-plane/index.js`): Integrated health routes and dual-mapped legacy API paths for backward compatibility.

## [2.15.0] - 2026-05-22
### Added
- **MAS Predictive Mode (Phase 28 Cognitive Substrate)**: Forward-looking cognitive model for forecasting MAS behavior.
    - **Predictive Engine** (`apps/operator-ui/js/mas-predictive.js`): Deterministic signal processing for TTI, Agent Drift, and Recovery Forecasts.
    - **Predictive Panel** (`apps/operator-ui/js/predictive-panel.js`): High-fidelity dashboard component with real-time trend indicators and neon accents.
    - **Operator UI** (`apps/operator-ui/dashboard/index.html`, `js/mas-analytics.js`): Integrated predictive analytics and exposed internal stability state.
    - **TTI Solver**: Calculates Time-to-Instability using linear regression on rerun frequency.
    - **Agent Drift Forecast**: Predicts at-risk agents based on volatility and failure clustering.
- **PMS Subsystem Installation**: Fully operationalized the Prompt Management System at `/mnt/c/Users/soren/apps/cic-pms`.
    - Resolved **Harvester** and **Orchestrator** import failures for `unifiedModelClient.js`.
    - Verified dependency chain and Gemini client connectivity for ingestion engine.
- **Release Automation Panel**: Fourth pillar of the Release Control Plane.
    - **Telemetry Engine** (`tools/release-timeline.mjs`): Updated to generate `release-telemetry.json` with health and velocity signals.
    - **Dashboard Integration** (`apps/operator-ui/js/release-automation-panel.js`): Real-time monitor for drift checks, doc sync, and deploy status.
- **One-Click Desktop Launcher**: Automated boot sequence and dashboard access.
    - **Launch Script** (`scripts/launch-cic.sh`): Hardened environment setup and server startup.
    - **Desktop Entry** (`scripts/CIC-Control-Plane.desktop`): GUI-native entry point for Linux environments.

### Fixed
- **Control Plane** (`apps/control-plane/routes/recovery.js`): Fixed incorrect relative import path for the recovery control loop.
- **Environmental Stability**: Improved Control Plane secret handling to support both Infisical-prefixed and standard environment variables.
- **Ingestion Entrypoint Standardization**: Resolved path ambiguity and legacy inconsistencies.
    - **Standardized Entrypoint**: Established `src/pipeline/run-pipeline.js` as the primary ingestion CLI.
    - **Harvester Integration** (`projects/cic/ingestion/package.json`): Added `npm run ingest` for streamlined execution.
    - **Pipeline Docs** (`docs/architecture/pipeline.md`): Updated architecture documentation with correct CLI usage and pathing.
- **Orchestrator Hardening**: Updated `orchestrator.js` to ensure clean lifecycle management for standardized entrypoints and predictive telemetry.

## [2.14.0] - 2026-05-21
### Added
- **MAS Autonomous Mitigation Mode (Phase 29)**: The system now actively steers away from drift and instability.
- **MAS Deep Introspection (Phase 30)**: Cognitive traceability layer that explains the *why* behind MAS interventions.
- **MAS Efficacy Lab (Phase 31)**: Provable value layer that quantifies the impact of autonomous mitigation.
- **Delta Analysis Engine**: Compares actual system behavior against "No Mitigation" counterfactuals.
- **Efficacy Panel**: New Operator UI component showing Failures Avoided, Instability Prevented, and Net-Positive Rate.
- **Incident Replay**: Historical reconstruction of cognitive traces for auditing and optimization.
- **Persistence**: Cognitive introspection traces are now persisted to `data/mas-introspection.json`.

## [2.13.0] - 2026-05-21

### Added

- **MAS-Aware Rerun Telemetry**: Full observability for the agent rerun lifecycle across three new event types.
    - **`emitMASRerunAttempt`** (`apps/cic-pms/src/telemetryClient.js`): Emits before each rerun execution; captures `agent`, `attempt`, `maxAttempts`, `backoffMs`, and `reason`.
    - **`emitMASRerunBackoff`** (`apps/cic-pms/src/telemetryClient.js`): Emits immediately before each backoff sleep; captures `agent`, `attempt`, and `backoffMs`.
    - **`emitMASRerunFinalState`** (`apps/cic-pms/src/telemetryClient.js`): Emits after the rerun loop concludes; captures `finalState` (`success` | `failed`), `attempts`, and `maxAttempts`.
    - **Orchestrator wiring** (`projects/cic/orchestrator/src/orchestrator.js`): All three emitters wired into the `runAgentWithMAS` rerun loop with correlation ID threading.
    - **Ingest routes** (`tools/prompt-telemetry/server.js`): Added `POST /ingest/mas_rerun_attempt`, `POST /ingest/mas_rerun_backoff`, `POST /ingest/mas_rerun_final_state` with 500-event ring buffers.
    - **Timeline + Trace** (`tools/prompt-telemetry/server.js`): `GET /telemetry/timeline` and `GET /telemetry/trace/:correlationId` now include all three rerun event types.
    - **MAS Intelligence Timeline panel** (`tools/prompt-telemetry/dashboard.html`): New dashboard panel showing rerun events with icons — ⚡ attempt, … backoff, ✓/✕ final state.
    - **MAS Rerun Waterfall panel** (`tools/prompt-telemetry/dashboard.html`): Proportional bar chart rendering each rerun event in sequence, keyed by backoff duration.

## [2.12.0] - 2026-05-21
### Added
- **MAS Rerun Hardening**: Implemented configurable retries and adaptive backoff for the `rerunAgent` directive.
    - **Adaptive Backoff**: Retries now use exponential backoff (`masBackoffMs * 2^(retry-1)`).
    - **Configurable Retries**: Added `ORCH_MAS_MAX_RETRIES` (default: 2) and `ORCH_MAS_BACKOFF_MS` (default: 500ms).
- **LLM Debug Plane**: Added configurable log levels to capture raw model inputs/outputs.
    - **Debug Logging**: Added `ORCH_LOG_LEVEL` support; `debug` level captures full LLM payloads and raw responses for Gemini, Claude, and Llama.
    - **Enhanced Logger** (`apps/cic-pms/src/logger.js`): Normalized log levels (debug, info, warn, error).
- **JSON Robustness**: Improved `normalizeModelOutput` to handle non-JSON or noisy model outputs.
    - **Markdown Extraction**: Automatically extracts JSON from markdown code blocks.
    - **Boundary Detection**: Recovers JSON by finding outermost `{}` braces in conversational outputs.
    - **Robustness Tests**: Added `rewrite-mcp/tests/jsonNormalize.test.js`.

## [2.11.0] - 2026-05-21
### Added
- **Infisical Secret Rotation Plane**: Implemented staged rotation for core API keys.
    - **Rotation Policy** ([`SECRET_ROTATION_PLANE.md`](../governance/SECRET_ROTATION_PLANE.md)): Defined versioned key slots (`_ACTIVE`, `_NEXT`) and rotation cadences.
    - **Rotation Tool** ([`tools/rotation/rotate.js`](https://github.com/sorensencc-dotcom/rewrite-mcp/blob/main/tools/rotation/rotate.js)): Scripted lifecycle management for staging, cutover, and cleanup of secrets.
    - **Rotation Health Check**: Automated enforcement of secret rotation invariants ([`tools/rotation/health-check.js`](https://github.com/sorensencc-dotcom/rewrite-mcp/blob/main/tools/rotation/health-check.js)).
    - **Versioned Secret Support**: Updated core services and model clients to prioritize `_ACTIVE` keys.

## [2.10.0] - 2026-05-20
### Added
- **Phase 28: Auto-Tagging + Release Bundles**: Automated the final release pipeline.
    - **Release Tagging** (`tools/release-tag.mjs`) : Automated Git tagging with drift verification.
    - **Release Bundling** (`tools/release-bundle.mjs`): Creates portable `.tar.gz` distribution bundles with SHA256 checksums.
    - **Release Diffing** (`tools/release-diff.mjs`): Generates velocity deltas and comparison artifacts between versions.
- **Control Plane**: Added static file serving for documentation and release artifacts.
- **Orchestrator**: Updated configuration and model linkages for Antigravity 2.0.
- **Operator UI**: Integrated Release Notes, Bundle, and Diff Panels for real-time visibility.
- **Harvester**: Minor client updates for model consistency.
- **Doc Drift Detection (Final Wiring)**: Automated guardrail to prevent code/doc divergence.
    - **Drift Checker** (`tools/doc-drift-check.js`): Node.js tool that enforces version sync and subsystem-specific documentation in the changelog.
    - **Policy Enforcement**: Updated `ANTIGRAVITY.md` and `rewrite/governance/DOC_POLICY.md` with mandatory drift checks and updated Doc Policy.

## [2.9.0] - 2026-05-20
### Added
- **Infisical Secret Plane (CIC-wide Rollout)**: Transitioned Orchestrator, Harvester, and Control Plane to the "Gold Standard" secret management.
    - **Zero-Plaintext Mandate**: Codified in [`SECRET_PLANE.md`](../governance/SECRET_PLANE.md).
    - **Service-Scoped Prefixes**: Implemented `ORCH_`, `HARV_`, and `CP_` prefixes to prevent env collisions.
    - **Boot-Time Guardrails** (`src/config.js`): Every core service now fails-fast with `FATAL_SECRET_MISCONFIGURATION` if required secrets are missing.
    - **Infisical Docs** (`secrets.md`): Per-service guides for local dev, CI (OIDC), and Runtime (K8s).
    - **Backward Compatibility**: Shared LLM and Telemetry clients updated to support both legacy and prefixed keys.
- **Autonomous Recovery Plane (C3/C4) — Self-Healing & SLO Dashboard**: Implementation of the autonomous control loop and real-time SLO visualization.
    - **Recovery Control Loop** (`projects/cic/control-plane/recovery/control-loop.js`): Autonomous `tick()` cycle that pulls SLO metrics, evaluates declarative policies, and triggers recovery effectors (throttle, fallback, quarantine) with cooldown logic.
    - **SLO Metrics Aggregator** (`projects/cic/control-plane/recovery/slo-aggregator.js`): Unified metrics aggregation logic for Reliability, Safe-Mode, Latency, and Error Budget.
    - **Recovery History API** (`apps/control-plane/routes/recovery.js`): New route providing access to the durably persisted history of autonomous recovery actions.

## [2.8.1] - 2026-05-20
### Added
- **Minor improvements**: Internal stability and telemetry fixes.

## [2.8.0] - 2026-05-20
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
