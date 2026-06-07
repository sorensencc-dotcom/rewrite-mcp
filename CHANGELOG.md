# Changelog

All notable changes to this project will be documented in this file.

## [2.30.1] - 2026-06-06

### Changed
- **Documentation**: Clarified the Claude memory sync path in `docs/rewrite/governance/DOC_POLICY.md`, `docs/rewrite/skills/doc-update.md`, `docs/cic/CIC_SYSTEM.md`, `docs/cic/CIC_AI_RUNTIME_CONTRACT.md`, and `docs/cic/CLAUDE_ANTIGRAVITY_FEDERATION_PROTOCOL.md`.

## [2.30.0] - 2026-06-05

### Added
- **Phase 44.0**: 7 new production-ready skills
  - cic-section-summarizer
  - agent-drift-detector
  - rewrite-labs-orchestrator
  - environment-diagnostics
  - session-boundary-manager
  - cic-roadmap-updater
  - operator-grade-procedures
- **Phase 44.1**: Claude Code MCP integration with 13 skills exposed as tools
- **Phase 44.2**: 3 canonical workflows
  - phase-summary-roadmap
  - environment-check-procedure
  - pipeline-orchestration-dashboard
- **Phase 44.3**: Telemetry and Operator Console
  - Extended telemetry (workflow, alert, system metrics)
  - Unified status layer (snapshots, health scoring, trends)
  - Operator Console UI (HTML/JS, no build required)
  - Telemetry dashboard (skill/workflow/health/alerts panels)
- **Phase 44.5**: HTTP Gateway for Copilot & Gemini integration
  - REST API for all 13 skills
  - Workflow execution endpoints
  - Telemetry endpoints
  - Deployment guides (Azure, GCP, Docker)
- **Documentation**: Full API reference, deployment guides, integration specs

### Fixed
- Synchronous validation in all skill scaffolds (validation before promise creation)
- PowerShell compatibility for test files

### Changed
- Skill runtime now tracks workflow-level telemetry
- MCP server supports all 13 skills via unified interface
- Operator console provides real-time system status
- Extended telemetry with workflow, alert, and system-level metrics

### Technical
- New modules: telemetry-extended.js, unified-status.js
- New applications: operator-console (HTML/JS), skill-gateway (Express)
- 1,164 new lines of code across Phase 44
- 114+ total tests, all passing

### Deployment Status
- Claude Code: ✅ Live via MCP
- Copilot: ✅ Ready (30 min deployment)
- Gemini: ✅ Ready (45 min deployment)

### Next
- Phase 44.4: Autonomous Orchestrator (spec ready, 4-6 hours)
- Phase 45: 7 new skills (specs ready, 6-8 hours)

---

## [2.29.3] and earlier

See git history for detailed changes prior to Phase 44 delivery.
