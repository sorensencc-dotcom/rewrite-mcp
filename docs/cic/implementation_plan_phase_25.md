# Phase 25 — Autonomous Planner & Multi‑Agent Reasoning (APR)

## Overview
Phase 25 introduces the Autonomous Planner & Multi‑Agent Reasoning (APR) layer. APR uses:
- ARPS (Phase 22) for roadmap deltas
- Memory Layer (Phase 23) for history and trends
- Skill Graph (Phase 24) for capabilities and gaps

Goal: CIC can propose roadmap changes, allocate work to agents, detect missing skills, and run multi‑agent reasoning loops to self‑improve.

---

## 25.1 — Planning Model & Data Shapes (APR‑Spec)

### Objectives
- Define the core planning entities and constraints.
- Make planning decisions auditable and replayable.

### Tasks
- Define `PlanningGoal`, `PlanningTask`, `PlanningPlan`, `PlanningEpisode` TypeScript interfaces.
- Define `PlannerDecision` and `PlannerCritique` shapes for multi‑agent loops.
- Store planning episodes in a Git‑versioned JSONL log (`projects/cic/.apr/episodes.jsonl`).

---

## 25.2 — Autonomous Planner Engine (APR‑Planner)

### Objectives
- Turn ARPS + Memory + Skill Graph into concrete plans.

### Tasks
- Implement `AutonomousPlanner`:
  - Ingests:
    - Latest ARPS roadmap deltas
    - Memory trends (failures, stagnation, drift)
    - Skill Graph hotspots (orphans, unused agents, dense nodes)
  - Produces:
    - Ranked `PlanningGoal[]`
    - Decomposed `PlanningTask[]` with owners (agents/skills)
  - Writes:
    - Proposed roadmap updates (Phase 22 fences)
    - Suggested new skills (Phase 24 Skill Graph nodes)

---

## 25.3 — Multi‑Agent Reasoning Loop (APR‑Loop)

### Objectives
- Let multiple “roles” reason over the same plan: Planner, Critic, Operator.

### Tasks
- Implement `MultiAgentCoordinator`:
  - Roles:
    - `planner` — proposes plan
    - `critic` — checks risk, feasibility, conflicts
    - `operator` — checks against current roadmap + constraints
  - Loop:
    - `planner` → `critic` → `operator` → converge or abort
  - Persist each loop as a `PlanningEpisode` in APR log.

---

## 25.4 — Task Allocation & Agent Routing (APR‑Routing)

### Objectives
- Map tasks to concrete CIC agents and external systems.

### Tasks
- Implement `TaskAllocator`:
  - Uses Skill Graph to map `PlanningTask` → `agent/tool`
  - Marks tasks as:
    - `AUTO_EXECUTABLE` (CIC can run)
    - `OPERATOR_REQUIRED` (human needed)
  - Emits a `TaskAssignment` list for:
    - CIC agents (internal)
    - Operator handoff (docs/tasks)

---

## 25.5 — APR Control‑Plane API (APR‑API)

### Objectives
- Expose planning as a first‑class control‑plane feature.

### Tasks
- Add routes:
  - `POST /v1/apr/plan` — run a planning episode (dry‑run or commit)
  - `GET /v1/apr/episodes` — list planning episodes
  - `GET /v1/apr/episodes/:id` — inspect a specific episode
- Wire APR into the existing control‑plane router.

---

## 25.6 — APR UI: Planner Console (APR‑UI)

### Objectives
- Give operators a cockpit for CIC’s autonomous planning.

### Tasks
- Add `PlannerConsole` React view:
  - Latest goals and tasks
  - Assigned agents and systems
  - Episode history and critiques
  - “Run planning (dry‑run)” and “Apply plan” controls
- Integrate into Command Center sidebar and routing.

---

## 25.7 — APR Integration with ARPS, Memory, Skill Graph (APR‑Integration)

### Objectives
- Close the loop: CIC plans → executes → observes → updates roadmap.

### Tasks
- ARPS:
  - Allow APR to propose roadmap edits via fenced Phase 22/23/24 blocks.
- Memory:
  - Log each planning episode and outcome as `apr.episode` events.
  - Feed failures/successes back into future planning.
- Skill Graph:
  - Add new skills proposed by APR.
  - Mark underused skills and suggest deprecation.

---

## Verification

### Automated
- `apr-planner.test.ts`:
  - Goal extraction from ARPS + Memory + Skill Graph
  - Multi‑agent loop convergence
  - Task allocation correctness
- `apr-api.test.ts`:
  - Control‑plane endpoints
  - Episode retrieval and filtering
- `apr-ui.test.tsx`:
  - Planner Console renders and loads data

### Manual
- Run:
  - `node projects/cic/dist/apr/cli.js --dry-run`
- Verify:
  - Generated goals and tasks match current CIC state
  - No invalid roadmap edits
  - Planning episodes appear in UI and logs

---

## Deliverables
- APR data shapes and log format
- Autonomous Planner engine
- Multi‑agent reasoning coordinator
- Task allocator and routing
- APR control‑plane API
- Planner Console UI
- Integration with ARPS, Memory, Skill Graph
- Passing tests and updated docs
