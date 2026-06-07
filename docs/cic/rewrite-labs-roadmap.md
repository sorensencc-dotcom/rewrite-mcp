---
title: Rewrite Labs Roadmap
version: 1.0.0
date: 2026-05-18
---

# Rewrite Labs Roadmap

RewriteLabs.io — AI-Driven Website Redesign Product
Engineering and product roadmap for the scan/rewrite tool, operator console, and backend.

## Phase 1 — Core Scan Engine

**Status:** In Progress

Build the foundational website analysis and redesign generation layer.

- Backend architecture (`rewrite-mcp/`)
- TypeScript server with scan and rewrite tools
- Operator console: control-room.html
- Demo seed data pipeline
- Intelligence server integration (port 4000)

Deliverables: Functional scan → rewrite pipeline, operator UI

## Phase 2 — Operator Console

**Status:** In Progress

Full-featured operator control room for managing scan/rewrite jobs.

- Control plane API (`apps/control-plane/`)
- Pipeline management routes
- Agent management routes
- Runs and metrics dashboards
- Auth: Google ID Token
- CORS: rewritelabs.ai origin

Deliverables: Production-ready control plane, authenticated operator UI

## Phase 3 — DocGen Integration

**Status:** In Progress

Automated documentation layer for all Rewrite Labs technical and business documents.

- DocGen engine (`projects/cic/docgen/` shared infrastructure)
- Rewrite Labs Roadmap (this document) → auto-synced DOCX
- API documentation generation
- Business plan document generation
- Document sync for all deliverables

Deliverables: Fully automated doc pipeline

## Phase 4 — Registry and Plugin System

**Status:** Pending

Extend the backend with plugin and registry capabilities.

- Tool registry
- Plugin install/uninstall API
- Skill manifest system
- Plugin marketplace integration

Deliverables: Plugin-capable server, skill registry

## Phase 5 — Customer-Facing Product

**Status:** Pending

Move from internal tool to customer-facing SaaS.

- Multi-tenant architecture
- Billing integration
- Customer onboarding flow
- Public API with rate limiting
- rewritelabs.io marketing site

Deliverables: Public beta launch, first paying customers

## Phase 6 — Scale and Distribution

**Status:** Pending

Scale infrastructure and build distribution channels.

- Cloudflare Workers deployment
- D1 database for job history
- R2 for asset storage
- Agency partner program
- White-label licensing

Deliverables: Production infrastructure, partner pipeline

## Ingestion Intelligence & Playbook Evolution

### Phase 2B — Playbook Evolution Engine

**Status:** Completed (2026-05-31)

Transform the ingestion pipeline from a static extractor chain into a self-optimizing, telemetry-driven playbook engine.

- TelemetryIngestor & PatternAnalyzer rolling z-score analysis
- EvolutionPlanner mutations & SimulationRunner Monte Carlo forecasting
- PlaybookPublisher promotion scoring and <100ms rollback hooks
- `/playbook/*` REST control plane routes registered

Deliverables: Operational self-optimizing playbook engine

### Phase 3 — Continuous Evolution Loop

**Status:** Planned

Continuous, autonomous optimization and governance loops for the ingestion brain.

- **Continuous Telemetry Cycle**: Convert ingestion from batch to scheduled/streaming mode with rolling telemetry checks.
- **Autonomous Mutation Engine**: Generate candidate playbook mutations continuously (swap, parallelize, prune, gate).
- **High-Frequency Simulation Layer**: Run fast Monte Carlo simulations for every candidate mutation.
- **Safe Auto-Promotion Pipeline**: Auto-promote only mutations exceeding improvement thresholds under governance windows.
- **Drift & Regression Detection**: post-promotion regression checks with <100ms automatic rollbacks.
- **Observability & Reporting**: Expose evolution metrics and `/playbook/evolution/status` dashboards.
- **Human-in-the-Loop Controls**: Manual override toggles and cycle approval gates.

Deliverables: Safe streaming continuous self-optimizing ingestion pipeline
