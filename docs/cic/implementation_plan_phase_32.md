# Phase 32 — CIC Multi-Agent Planning Engine (MAPE)

## Overview
The Multi-Agent Planning Engine (MAPE) allows Cast Iron Charlie (CIC) to decompose high-level natural language instructions into concrete development steps. It uses rule-based classification to divide requests into structured task nodes (e.g. features, refactors, fixes, tests, documentation, infrastructure), calculates topological dependencies, and outputs them as a plan tree. Each task is mapped to a `"planned"` proposal within the MEE ecosystem.

---

## 32A — Planning Schema Definitions
- **Objective**: Define plan and task interfaces.
- **Deliverables**:
  - [mee-schema.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/mee-schema.ts):
    - Added `PlanTask` type with dependencies.
    - Added `PlanTree` interface wrapping the initial request, task checklist, and summary.
    - Allowed `"planned"` status for `PhaseProposal`.

---

## 32B — Task Decomposers
- **Objective**: Extract tasks and deduce dependency ordering.
- **Deliverables**:
  - [task-extractor.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/planning/task-extractor.ts): Parser for partitioning instructions into distinct tasks.
  - [dependency-detector.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/planning/dependency-detector.ts): Dependency generator routing test or documentation updates behind the core functionality implementation tasks.

---

## 32C — Plan Coordinator
- **Objective**: Synthesize plan trees and spawn proposals.
- **Deliverables**:
  - [plan-to-proposal.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/planning/plan-to-proposal.ts): Mapper to instantiate `"planned"` proposals.
  - [planning-engine.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/planning/planning-engine.ts): System coordinator resolving planning requests.

---

## 32D — API Endpoints
- **Objective**: Expose planning functionality via REST.
- **Deliverables**:
  - [mee-routes.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/cic/control-plane/mee-routes.ts):
    - Registered `POST /mee/plan` to formulate planning trees and register their proposals.

---

## 32E — UI Planning Console
- **Objective**: Implement operator planning UI interface.
- **Deliverables**:
  - [MetaEvolutionConsole.tsx](file:///c:/dev/rewrite-mcp/projects/cic/ui/src/components/mee/MetaEvolutionConsole.tsx):
    - **Planning Studio** dashboard supporting text input requests, rendering plan lists, and displaying topological sequence arrows.

---

## Verification & Tests
- [mee-planning.test.ts](file:///c:/dev/rewrite-mcp/projects/cic/tests/mee/mee-planning.test.ts): Verifies task extraction rules, type mapping, and dependency graph generation.
