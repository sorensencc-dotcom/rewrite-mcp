# Release Diff: v2.9.0 vs v2.8.1

## Velocity Delta
- **Total Changes**: 6 (Delta: -3)
- **New Features**: 6 (Delta: -3)
- **Fixes**: 0 (Delta: +0)

## Latest Changes (v2.9.0)
### Added
- **Infisical Secret Plane (CIC-wide Rollout)**: Transitioned Orchestrator, Harvester, and Control Plane to the "Gold Standard" secret management.
    - **Zero-Plaintext Mandate**: Codified in [`do../governance/SECRET_PLANE.md`](../governance/SECRET_PLANE.md).
    - **Service-Scoped Prefixes**: Implemented `ORCH_`, `HARV_`, and `CP_` prefixes to prevent env collisions.
    - **Boot-Time Guardrails** (`src/config.js`): Every core service now fails-fast with `FATAL_SECRET_MISCONFIGURATION` if required secrets are missing.
    - **Infisical Docs** (`secrets.md`): Per-service guides for local dev, CI (OIDC), and Runtime (K8s).
    - **Backward Compatibility**: Shared LLM and Telemetry clients updated to support both legacy and prefixed keys.

## Previous Changes (v2.8.1)
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
