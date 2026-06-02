# CIC Documents Index

> **Operational Status:** Production  
> **Subsystem:** CIC (Cast Iron Charlie)  
> **Classification:** Technical / Operational  
> **Last Audit:** 2026-05-22

---

## 🏗️ Core System Reference
Foundational documents defining the CIC subsystem architecture and current state.

- **[System Overview](CIC_SYSTEM.md)**: Architectural blueprint of the CIC ingestion and orchestration pipeline.
- **[Project State](CIC_PROJECT_STATE.md)**: Live health report, connectivity status, and subsystem health gauges.
- **[Master Roadmap](CIC_MASTER_ROADMAP.md)**: Long-term trajectory from archival research to distribution.
- **[Phase 23 MLA Roadmap](MLA_ROADMAP.md)**: Detailed specification for the Memory Layer & Long-Horizon Autonomy.

---

## 🛠️ Operational Manuals
Step-by-step guides for pipeline execution, troubleshooting, and data management.

### Pipeline Control
- **[Ops Console](manuals/ops_console.md)**: Interface guide for the Control Plane and Pipeline runs.
- **[Replay Engine](manuals/replay_engine.md)**: Procedure for side-effect-free simulation of ingestion events.
- **[Dry-Run Mode](manuals/dry_run.md)**: Safeguard mechanisms for verifying logic without Joplin writes.

### Data Processing
- **[Task Extractor](manuals/task_extractor.md)**: NLP-driven extraction of action items from source memos.
- **[Idea Clusterer](manuals/ideas_clusterer.md)**: Semantic grouping of conceptual fragments into Joplin hierarchies.
- **[Daily Digest](manuals/daily_digest.md)**: Synthesis of processed events into summary notes.

### Observability
- **[Metrics & Health](manuals/metrics_health.md)**: Interpretation of SLOs, latencies, and error budget burn rates.
- **[Event Logging (Black Box)](manuals/event_logging.md)**: Audit trail specifications and log retrieval.

---

## 🔗 Integrations
- **[Dashboard Integration](CIC_Dashboard_Integration.md)**: Telemetry stream and MAS cognitive trace specifications.
- **[Memos-Joplin Pipeline](manuals/memos_joplin.md)**: E2E flow from ephemeral capture to persistent record.

---

## 🎨 Design & Standards
Visual semantics, component hardening, and design tokenization.

- **[Design System v1.1](CIC_DESIGN_SYSTEM_V1.1.md)**: Tokenized specification for industrial consistency.
- **[Design Review Workflow](DESIGN_REVIEW_V1.1.md)**: Tiered enforcement process for design compliance.
- **[Visual Index Template](VISUAL_INDEX_TEMPLATE.md)**: Standardized layout for artifact indices.
- **[Migration Checklist](MIGRATION_V1.1_CHECKLIST.md)**: Tracking progress for v1.1 system-wide rollout.

---

## 📜 Legal & Compliance
- **[Release Automation](manuals/release-automation.md)**: Documentation and artifact synchronization protocols.


