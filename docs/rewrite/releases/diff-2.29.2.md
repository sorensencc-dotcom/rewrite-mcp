# Release Diff: v2.29.2 vs v2.29.1

## Velocity Delta
- **Total Changes**: 2 (Delta: -1)
- **New Features**: 2 (Delta: -1)
- **Fixes**: 0 (Delta: +0)

## Latest Changes (v2.29.2)
### Added
- **HELM: Daily Operator OS** (`docs/helm/HELM_ROADMAP.md`): Vision and roadmap for the unified personal + business command dashboard. Covers layout architecture, panel specs, data source map, 5-phase build plan, and identity (name, logo concept).
    - **mkdocs.yml**: Registered HELM as top-level nav section.

## Previous Changes (v2.29.1)
### Added
- **CIC Manual: Executive Intelligence Engine** (`docs/cic/manuals/executive_intelligence_engine.md`): Operator manual covering all three MCP tools (`execute_24h_triage_scan`, `stage_email_attachments`, `commit_triage_action`), triage rule engine, auth, audit log format, and scheduled execution.
    - **mkdocs.yml**: Registered new manual in CIC Manual nav section.
    - **server.js** (`projects/cic/ingestion/mcp-servers/executive-intelligence-engine/src/server.js`): Added `stage_email_attachments` tool with idempotent local file staging, `messageTargets` fast-path for inline triage integration, and `_stageMessageAttachments` helper. Wired Pass 2 inline staging into `execute_24h_triage_scan`.
