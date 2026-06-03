# Phase 30 — CIC Meta‑Evolution Engine (MEE)

## Overview
The Meta‑Evolution Engine (MEE) enables CIC to autonomously design, propose, and validate new phases of its own architecture. MEE closes the loop between CIC’s knowledge (CKG), planning (APR), execution (CRO), and documentation (ARPS). MEE is the self-improvement substrate allowing CIC to safely evolve itself under operator supervision.

---

## 30A — MEE Schema & Base Generator
- **Objective**: Establish the core data shapes and design generator.
- **Deliverables**:
  - [mee-schema.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/mee-schema.ts): Structured data schemas for `PhaseProposal`, `PhasePlan`, `PhasePatchSet`, `PhaseValidationReport`, and `MeeTriggerEvent`.
  - [mee-generator.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/mee-generator.ts): The base generator class that accepts trigger events and translates them into architectural plans using APR planning slots.

---

## 30B — Trigger Engine Integration (MEE ↔ CKG)
- **Objective**: Establish traceability from CKG events to proposals.
- **Deliverables**:
  - [mee-trigger.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/mee-trigger.ts): The trigger detection engine that scans CKG neighborhoods, detects drift hotspots, capability gaps, or execution SLO bottlenecks, and emits serialized trigger events.

---

## 30C — Auto-Evolution Loop
- **Objective**: Orchestrate the continuous cycle of analysis and proposal synthesis.
- **Deliverables**:
  - [auto-evolution-engine.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/auto-evolution-engine.ts): Orchestration core that runs checks, builds dependency-resolved proposal trees, and invokes the patch generation and validation sequence.

---

## 30D — MEE Validation Pipeline
- **Objective**: Implement deep validation gates ensuring patch safety.
- **Deliverables**:
  - [mee-validator.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/mee-validator.ts): A full validation runner that executes:
    - **TypeScript Compilation**: Checks syntactic safety.
    - **Vitest Runner**: Verifies regression coverage.
    - **Doc-Drift Check**: Integrates with the repository's drift sentinel checks.

---

## 30E — Proposal Store & API Hardening
- **Objective**: Persistence and API exposure for MEE operations.
- **Deliverables**:
  - [mee-proposal-store.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/mee-proposal-store.ts): Durable file-based JSON store for managing the lifecycle of proposals.
  - **REST Endpoints**: Exposes endpoints for proposing, querying, validating, and applying patches.

---

## 30F — MEE Diff Viewer (Side-by-Side Patch Diff)
- **Objective**: Enable detailed visual review of changes.
- **Deliverables**:
  - [mee-diff-engine.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/mee-diff-engine.ts): Generates addition, deletion, and modification chunks to feed side-by-side or unified diff visualizations.

---

## 30G — Multi-Proposal Pipeline & Conflict-Gating
- **Objective**: Support parallel evolutions, topological ordering, and conflict prevention.
- **Deliverables**:
  - [mee-proposal-graph.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/mee-proposal-graph.ts): Builds a topological graph of active proposals.
    - **Dependency Ordering**: Orders proposals sequentially based on version or phase numbers (e.g. Phase 30 before Phase 31).
    - **Transactional Conflict-Gating**: Detects overlapping target paths and gates the transaction sequence to prevent compilation or runtime hazards.

---

## 30H — Agent-to-Agent Negotiation Engine
- **Objective**: Allow proposals to negotiate and resolve conflicts before operator review.
- **Deliverables**:
  - [mee-negotiation-engine.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/mee-negotiation-engine.ts) & [mee-negotiation-agent.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/mee-negotiation-agent.ts):
    - **Autonomous Agents**: Wraps each proposal in a negotiating agent.
    - **Conflict Resolution**: Resolves overlapping path writes using strategies like `reorder`.
    - **Transcripts**: Captures negotiation details in an auditable transcript log.
    - **Consensus Planning**: Produces a stable consolidated plan across all agent consensus outputs.

---

## Verification & Tests
Verify system integrity using MEE unit and integration test suites:
- `mee-diff.test.ts`: Validates correct diff chunk generation.
- `mee-graph.test.ts`: Verifies path conflict detection and topological dependency sorting.
- `mee-negotiation.test.ts`: Validates agent-to-agent negotiations, conflict resolutions, and consensus plans.
- `mee-proposal-store.test.ts`: Confirms file-based JSON persistence.
- `mee.test.ts`: Validates the end-to-end trigger-to-proposal flow.
