---
title: CIC Master Spec
version: 1.1.0
date: 2026-05-20
---

# CIC Master Spec

Cast Iron Charlie — Technical and Project Architecture Reference
Covers the intelligence pipeline, documentation engine, and production infrastructure.

## Project Overview

Cast Iron Charlie is a feature-length documentary about Charles Emil Sorensen (1881–1968),
the Danish immigrant who served as Henry Ford's chief production engineer for 40 years.
Sorensen oversaw the construction of the Rouge Complex, the civilian Jeep program, and
the Willow Run B-24 Liberator bomber plant — the largest building in the world at the time.

Producer: Chris Sorensen (great-grandson), Cast Iron Productions LLC, Tampa FL.

## Intelligence Pipeline

The CIC Intelligence Pipeline (BOB Architecture) processes archival materials and
surfaces research insights for the documentary team.

**Runtime:** Node.js 20+, ESM modules
**Location:** `projects/cic/ingestion/`
**Server:** `src/server/intelligence-server.js` — port 4000
**Endpoints:** `/health`, `/ask`, `/ingest`, `/pipeline`
**Vector store:** Qdrant
**LLM:** Anthropic Claude (claude-sonnet-4-x)

Primary sources ingested:
- Kroll Archive (scanned documents, ~600 items)
- Ford Motor Company records
- NASM archival photographs
- Burton Historical Collection records

## Documentation Engine

The CIC DocGen engine (BOB Architecture, Subsystems A–E) manages all project documentation.

**Runtime:** Node.js 20+, ESM modules
**Location:** `projects/cic/docgen/`
**Source docs:** `projects/cic/docs/`
**Output target:** Local secure storage / CastIronForge archival volumes.

Registered documents:
- CIC Master Roadmap — production phases
- CIC Master Spec — this document
- Rewrite Labs Roadmap — parallel product development
- CIC Docs Index — auto-maintained registry

## Control Plane

The CIC Control Plane is the operator interface for both the intelligence pipeline and
the documentation engine.

**Runtime:** Node.js 20+, CommonJS
**Location:** `apps/control-plane/`
**Port:** 3000
**Auth:** Google ID Token (configurable; AUTH_DISABLED=true for local dev)

Routes:
- `/health` — service status
- `/pipelines/cic/*` — intelligence pipeline proxy
- `/pipelines/*` — general pipeline management
- `/agents/*` — agent management
- `/runs/*` — run history
- `/metrics/*` — operational metrics
- `/telemetry/*` — telemetry proxy (prompt telemetry service)
- `/mas/*` — MAS subsystem (blackboard observability)
- `/docgen/*` — documentation engine (Subsystem D)

## Operator UI

**Location:** `apps/operator-ui/`
**Entry:** `control-room.html`
Single-file HTML/JS operator console, no build step required.

## Memory Governance

Per project rules:
- SYSTEM docs (this file) = stable architecture. Update only on structural change.
- STATE docs = volatile status. Never stored in memory.
- Living docs = authoritative. Local Markdown is source of truth.
- Memory = stable identity, structure, preferences only.

## Living Document Policy

All documents in `projects/cic/docs/` are regenerated to DOCX by the DocGen engine.
Version numbers are maintained in YAML frontmatter.
DOCX outputs are for distribution.
Git is backup and diff history.
