# Release Diff: v2.29.3 vs v2.29.2

## Velocity Delta
- **Total Changes**: 6 (Delta: +4)
- **New Features**: 6 (Delta: +4)
- **Fixes**: 0 (Delta: +0)

## Latest Changes (v2.29.3)
### Added
- **CIC Policy-Driven Optimization Layer** (`projects/cic/ingestion/`): Built a declarative policy engine for Headroom control, dynamic condition evaluations, and a styled glassmorphic dark-theme monitoring dashboard.
    - **headroomPolicyEngine.js**: Parses and evaluates rules against telemetry, logging decisions and caching via TTL.
    - **llmClientWithHeadroom.js**: Wired shouldBypassByPolicy check into chatWithHeadroom execution.
    - **intelligence-server.js**: Added /telemetry/headroom-policy endpoint with authentication bypass configuration.
    - **dashboard**: Implemented policy panel rendering and a refreshed modern glassmorphism design.
    - **headroomPolicy.test.js**: Created unit test suite verifying condition evaluations, caching, and rule hot-reloading.

## Previous Changes (v2.29.2)
### Added
- **HELM: Daily Operator OS** (`docs/helm/HELM_ROADMAP.md`): Vision and roadmap for the unified personal + business command dashboard. Covers layout architecture, panel specs, data source map, 5-phase build plan, and identity (name, logo concept).
    - **mkdocs.yml**: Registered HELM as top-level nav section.
