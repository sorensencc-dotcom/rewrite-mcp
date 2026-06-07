# Release Diff: v2.11.0 vs v2.10.0

## Velocity Delta
- **Total Changes**: 5 (Delta: -6)
- **New Features**: 5 (Delta: -6)
- **Fixes**: 0 (Delta: +0)

## Latest Changes (v2.11.0)
### Added
- **Infisical Secret Rotation Plane**: Implemented staged rotation for core API keys.
    - **Rotation Policy** ([`do../governance/SECRET_ROTATION_PLANE.md`](../governance/SECRET_ROTATION_PLANE.md)): Defined versioned key slots (`_ACTIVE`, `_NEXT`) and rotation cadences.
    - **Rotation Tool** ([`tools/rotation/rotate.js`](https://github.com/sorensencc-dotcom/rewrite-mcp/blob/main/tools/rotation/rotate.js)): Scripted lifecycle management for staging, cutover, and cleanup of secrets.
    - **Rotation Health Check**: Automated enforcement of secret rotation invariants ([`tools/rotation/health-check.js`](https://github.com/sorensencc-dotcom/rewrite-mcp/blob/main/tools/rotation/health-check.js)).
    - **Versioned Secret Support**: Updated core services and model clients to prioritize `_ACTIVE` keys.

## Previous Changes (v2.10.0)
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
