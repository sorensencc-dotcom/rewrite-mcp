# Changelog

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
