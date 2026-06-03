# Phase 24 Implementation Plan — CIC Skill Graph & Cross‑System Doctrine (SGD)

## Overview
Phase 24 introduces the CIC Skill Graph: an explicit, queryable model of CIC’s capabilities, agents, tools, lanes, and phases, plus cross‑system mappings to Claude, Copilot, and Antigravity.

---

## 24.1 — Skill Graph Schema (SGD‑Spec)
- Define node types:
  - `skill`, `agent`, `tool`, `lane`, `phase`, `doc`, `external_system`
- Define edge types:
  - `depends_on`, `implements`, `observes`, `controls`, `documents`, `mirrors`
- Create JSON schema for nodes and edges.
- Define storage format (JSONL or graph JSON).

---

## 24.2 — Skill Graph Store (SGD‑Store)
- Implement in‑repo store:
  - `projects/cic/skill-graph/graph.json`
- Provide APIs:
  - Load/save graph
  - Add/update nodes
  - Add/update edges
  - Query by type, tag, or relation

---

## 24.3 — Skill Harvester (SGD‑Harvester)
- Scan:
  - Prompts (PMS templates)
  - Agents (TypeScript files)
  - Tools/integrations
  - Lanes/phases (roadmap docs)
- Emit `SkillNode` + `SkillEdge` structures.
- Append to Skill Graph Store.

---

## 24.4 — Skill Synthesizer (SGD‑Synthesizer)
- Deduplicate nodes.
- Merge edges.
- Compute:
  - Orphan skills
  - Overlapping skills
  - Unused agents/tools
  - Critical dependency chains
- Write synthesized views back into graph.

---

## 24.5 — Skill Graph API (SGD‑API)
- Control‑plane routes:
  - `GET /v1/skills/graph`
  - `GET /v1/skills/nodes`
  - `GET /v1/skills/edges`
  - `GET /v1/skills/hotspots`

---

## 24.6 — Skill Explorer UI (SGD‑UI)
- Command Center panel:
  - Skill list + filters
  - Dependency view
  - Orphan/overlap view
  - Cross‑system mapping view

---

## 24.7 — Cross‑System Doctrine Sync (SGD‑Sync)
- Map CIC skills to:
  - Claude skills
  - Copilot tasks
  - Antigravity lanes
- Detect:
  - CIC skills with no external mapping
  - External skills with no CIC representation
- Generate “doctrine drift” reports.

---

## Verification
- Unit tests:
  - Skill Graph store
  - Harvester extraction
  - Synthesizer dedup/merge
  - API responses
- UI smoke tests:
  - Skill Explorer loads and renders
- Docs:
  - MkDocs build cleanly with Phase 24 sections.

---

## Deliverables
- Skill Graph schema + store
- Skill Harvester + Synthesizer
- Skill Graph API
- Skill Explorer UI
- Cross‑system sync logic
- Updated CIC docs
- Passing tests
