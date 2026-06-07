# Phase 29 — Rewrite Labs ↔ CIC Fusion Layer (RLF)

## Overview
RLF integrates CIC’s autonomous planning and execution with the Rewrite Labs redesign pipeline. CIC becomes the intelligence layer powering redesign discovery, planning, execution, and outreach.

---

## 29.1 — Fusion Schema (RLF‑Spec)
- Node types:
  - `redesign_target`, `redesign_plan`, `outreach_sequence`, `conversion_event`
- Edges:
  - `targets`, `plans`, `executes`, `converts`

---

## 29.2 — Fusion Harvester (RLF‑Harvester)
- Ingests:
  - Rewrite Labs project metadata
  - Redesign history
  - Outreach logs
  - Conversion metrics

---

## 29.3 — Redesign Planner (RLF‑Planner)
- Uses APR + CKG to:
  - Identify redesign opportunities
  - Generate redesign plans
  - Sequence outreach
  - Allocate tasks to CIC agents

---

## 29.4 — Redesign Executor (RLF‑Executor)
- Uses CRO to:
  - Run redesign tasks
  - Generate redesign artifacts
  - Trigger outreach
  - Track conversions

---

## 29.5 — Fusion API (RLF‑API)
- `/v1/rlf/targets`
- `/v1/rlf/plans`
- `/v1/rlf/outreach`
- `/v1/rlf/conversions`

---

## 29.6 — Fusion Console UI (RLF‑UI)
- Redesign target browser
- Outreach sequencer
- Conversion dashboard
- CIC‑powered redesign pipeline viewer

---

## 29.7 — Integration
- APR proposes redesign phases
- CRO executes redesign tasks
- CKG stores redesign knowledge
- Rewrite Labs pipeline becomes CIC‑driven

---

## Verification
- Unit tests for planner, executor, API, UI
- End‑to‑end redesign simulation
- Drift checks
