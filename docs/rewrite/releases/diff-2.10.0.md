# Release Diff: v2.10.0 vs v2.9.0

## Velocity Delta
- **Total Changes**: 11 (Delta: +1)
- **New Features**: 11 (Delta: +1)
- **Fixes**: 0 (Delta: +0)

## Latest Changes (v2.10.0)
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

## Previous Changes (v2.9.0)
### Added
- **Infisical Secret Plane (CIC-wide Rollout)**: Transitioned Orchestrator, Harvester, and Control Plane to the "Gold Standard" secret management.
    - **Zero-Plaintext Mandate**: Codified in [`do../governance/SECRET_PLANE.md`](../governance/SECRET_PLANE.md).
    - **Service-Scoped Prefixes**: Implemented `ORCH_`, `HARV_`, and `CP_` prefixes to prevent env collisions.
    - **Boot-Time Guardrails** (`src/config.js`): Every core service now fails-fast with `FATAL_SECRET_MISCONFIGURATION` if required secrets are missing.
    - **Infisical Docs** (`secrets.md`): Per-service guides for local dev, CI (OIDC), and Runtime (K8s).
    - **Backward Compatibility**: Shared LLM and Telemetry clients updated to support both legacy and prefixed keys.
- **Autonomous Recovery Plane (C3/C4) — Self-Healing & SLO Dashboard**: Implementation of the autonomous control loop and real-time SLO visualization.
    - **Recovery Control Loop** (`projects/cic/control-plane/recovery/control-loop.js`): Autonomous `tick()` cycle that pulls SLO metrics, evaluates declarative policies, and triggers recovery effectors (throttle, fallback, quarantine) with cooldown logic.
    - **SLO Metrics Aggregator** (`projects/cic/control-plane/recovery/slo-aggregator.js`): Unified metrics aggregation logic for Reliability, Safe-Mode, Latency, and Error Budget.
    - **Recovery History API** (`apps/control-plane/routes/recovery.js`): New route providing access to the durably persisted history of autonomous recovery actions.
