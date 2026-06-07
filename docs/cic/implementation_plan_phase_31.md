# Phase 31 — CIC Self-Refactoring Engine (SRE)

## Overview
The Self-Refactoring Engine (SRE) enables Cast Iron Charlie (CIC) to perform AST-based static analysis of its own typescript code modules. It scans for cyclomatic complexity, dead code, unused variables, unused imports, duplication, and module dependency violations (architectural drift). These insights are translated into concrete proposed file modifications (patches) and verified within the existing MEE (proposal &rarr; diff &rarr; validate &rarr; apply) framework.

---

## 31A — Schema & Types Configuration
- **Objective**: Define structured types representing refactor insights and patch plans.
- **Deliverables**:
  - [mee-schema.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/mee-schema.ts):
    - Added `RefactorInsight` representing specific file AST rules violated, code locations, and severity details.
    - Added `RefactorPlan` representing grouped insights mapped to patches.

---

## 31B — TypeScript AST Scanner
- **Objective**: Implement AST-based code analysis.
- **Deliverables**:
  - [static-analysis.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/self-refactor/static-analysis.ts):
    - Cyclomatic complexity calculator using TS compiler API nodes.
    - Dead-code scanner for local variables and imports.
    - Token-based duplication detector.
    - Module boundary drift validation.

---

## 31C — Refactor Coordinator
- **Objective**: Translate analysis insights into MEE patch proposals.
- **Deliverables**:
  - [self-refactor-engine.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/mee/self-refactor/self-refactor-engine.ts):
    - Scan coordinator accepting workspace directories.
    - Heuristics to build code corrections (patches) targeting quality hotspots.

---

## 31D — Control Plane Routing
- **Objective**: Register API endpoints.
- **Deliverables**:
  - [mee-routes.ts](file:///c:/dev/rewrite-mcp/projects/cic/src/cic/control-plane/mee-routes.ts):
    - `POST /mee/refactor/scan`: Scan files/workspace.
    - `POST /mee/refactor/propose`: Generate proposal from selected insights.
    - `GET /mee/refactor/plan/:id`: Retrieve refactoring plan details.

---

## 31E — UI Studio Tab
- **Objective**: Provide an interactive operator dashboard.
- **Deliverables**:
  - [MetaEvolutionConsole.tsx](file:///c:/dev/rewrite-mcp/projects/cic/ui/src/components/mee/MetaEvolutionConsole.tsx):
    - **Self-Refactor Studio** dashboard allowing scans, summary displays by severity, listing issues, and proposal generation.

---

## Verification & Tests
- [mee-static-analysis.test.ts](file:///c:/dev/rewrite-mcp/projects/cic/tests/mee/mee-static-analysis.test.ts): Verifies AST scanner calculations.
- [mee-self-refactor.test.ts](file:///c:/dev/rewrite-mcp/projects/cic/tests/mee/mee-self-refactor.test.ts): Verifies coordinator mappings and patch outputs.
