# Phase 28 — CIC Knowledge Distillation Engine (KDE)

## Overview
KDE compresses, summarizes, and restructures CIC’s Knowledge Graph (CKG) into higher‑order abstractions. It prevents graph bloat, removes stale nodes, merges duplicates, and produces distilled knowledge artifacts for APR and CRO.

---

## 28.1 — KDE Schema (KDE‑Spec)
- Define distilled node types:
  - `concept`, `summary`, `cluster`, `abstraction`
- Define distillation edges:
  - `abstracts`, `clusters`, `summarizes`, `replaces`
- JSON schema: `kde-graph.schema.json`

---

## 28.2 — KDE Store (KDE‑Store)
- Persistent distilled graph: `projects/cic/kde/graph.json`
- APIs:
  - `distillRegion(nodeId)`
  - `getClusters()`
  - `getAbstractions()`

---

## 28.3 — KDE Harvester (KDE‑Harvester)
- Extracts:
  - High‑density CKG regions
  - Repetitive patterns
  - Redundant nodes
  - Stale or outdated nodes
- Emits:
  - `cluster` nodes
  - `abstraction` nodes

---

## 28.4 — KDE Synthesizer (KDE‑Synthesizer)
- Merges clusters
- Generates summaries
- Replaces low‑value nodes with abstractions
- Writes distilled graph

---

## 28.5 — KDE API (KDE‑API)
- `/v1/kde/graph`
- `/v1/kde/clusters`
- `/v1/kde/abstractions`
- `/v1/kde/distill/:id`

---

## 28.6 — Distillation Console UI (KDE‑UI)
- Cluster viewer
- Abstraction browser
- Distillation controls
- Drift‑vs‑distillation comparison

---

## 28.7 — Integration
- APR uses abstractions for planning
- CRO uses distilled execution context
- CKG syncs distilled nodes back into graph

---

## Verification
- Unit tests for store, harvester, synthesizer, API, UI
- Doc drift
- MkDocs build
