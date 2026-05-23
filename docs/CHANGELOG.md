# Changelog

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
    - **Rotation Policy** ([`docs/SECRET_ROTATION_PLANE.md`](SECRET_ROTATION_PLANE.md)): Defined versioned key slots (`_ACTIVE`, `_NEXT`) and rotation cadences.
    - **Rotation Tool** ([`tools/rotation/rotate.js`](../tools/rotation/rotate.js)): Scripted lifecycle management for staging, cutover, and cleanup of secrets.
    - **Rotation Health Check**: Automated enforcement of secret rotation invariants ([`tools/rotation/health-check.js`](https://github.com/sorensencc-dotcom/rewrite-mcp/blob/main/tools/rotation/health-check.js)).
    - **Versioned Secret Support**: Updated core services and model clients to prioritize `_ACTIVE` keys.

## [2.10.0] - 2026-05-20
### Added
- **Phase 28: Auto-Tagging + Release Bundles**: Automated the final release pipeline.
    - **Release Tagging** (`tools/release-tag.mjs`): Automated Git tagging with drift verification.
    - **Release Bundling** (`tools/release-bundle.mjs`): Creates portable `.tar.gz` distribution bundles with SHA256 checksums.
    - **Release Diffing** (`tools/release-diff.mjs`): Generates velocity deltas and comparison artifacts between versions.
- **Control Plane**: Added static file serving for documentation and release artifacts.
- **Orchestrator**: Updated configuration and model linkages for Antigravity 2.0.
- **Operator UI**: Integrated Release Notes, Bundle, and Diff Panels for real-time visibility.
- **Harvester**: Minor client updates for model consistency.
- **Doc Drift Detection (Final Wiring)**: Automated guardrail to prevent code/doc divergence.
    - **Drift Checker** (`tools/doc-drift-check.js`): Node.js tool that enforces version sync and subsystem-specific documentation in the changelog.
    - **Policy Enforcement**: Updated `ANTIGRAVITY.md` and `docs/DOC_POLICY.md` with mandatory drift checks and updated Doc Policy.

## [2.9.0] - 2026-05-20
### Added
- **Infisical Secret Plane (CIC-wide Rollout)**: Transitioned Orchestrator, Harvester, and Control Plane to the "Gold Standard" secret management.
    - **Zero-Plaintext Mandate**: Codified in [`docs/SECRET_PLANE.md`](SECRET_PLANE.md).
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
