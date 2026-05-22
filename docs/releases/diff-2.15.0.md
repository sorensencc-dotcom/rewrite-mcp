# Release Diff: v2.15.0 vs v2.14.0

## Velocity Delta
- **Total Changes**: 22 (Delta: +15)
- **New Features**: 15 (Delta: +8)
- **Fixes**: 7 (Delta: +7)

## Latest Changes (v2.15.0)
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

## Previous Changes (v2.14.0)
### Added
- **MAS Autonomous Mitigation Mode (Phase 29)**: The system now actively steers away from drift and instability.
- **MAS Deep Introspection (Phase 30)**: Cognitive traceability layer that explains the *why* behind MAS interventions.
- **MAS Efficacy Lab (Phase 31)**: Provable value layer that quantifies the impact of autonomous mitigation.
- **Delta Analysis Engine**: Compares actual system behavior against "No Mitigation" counterfactuals.
- **Efficacy Panel**: New Operator UI component showing Failures Avoided, Instability Prevented, and Net-Positive Rate.
- **Incident Replay**: Historical reconstruction of cognitive traces for auditing and optimization.
- **Persistence**: Cognitive introspection traces are now persisted to `data/mas-introspection.json`.
