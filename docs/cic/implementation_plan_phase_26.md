# Phase 26 — CIC Runtime Orchestrator (CRO)

## Overview
Phase 26 introduces the CIC Runtime Orchestrator (CRO) layer. CRO operationalizes the plans produced by the Autonomous Planner & Multi-Agent Reasoning (APR) layer (Phase 25) by executing them autonomously in a multi-agent environment.

Goal: CIC can execute plan tasks autonomously, handle failures, parallelize, and monitor agent runs.

---

## 26.1 — Execution Model & Data Shapes (CRO‑Spec)

### Objectives
- Define the data model for task execution, execution episodes, and agent runners.
- Maintain execution audit trails for historical analysis.

### Tasks
- Define `TaskExecution`, `ExecutionEpisode`, `ExecutionStats`, and `AgentRunner` TypeScript interfaces.
- Store execution logs in a Git-versioned JSONL log (`projects/cic/.cro/executions.jsonl`).

---

## 26.2 — Runtime Executor (CRO‑Executor)

### Objectives
- Process and schedule planning tasks produced by APR.

### Tasks
- Implement `RuntimeExecutor`:
  - Maintains an in-memory execution queue.
  - Controls concurrency (max 2-4 workers, configurable via `CIC_CRO_MAX_WORKERS`).
  - Implements bounded queue lengths (max 100) with backpressure controls.
  - Executes dry-runs by default unless explicitly requested otherwise.

---

## 26.3 — Agent Runner (CRO‑Runner)

### Objectives
- Execute individual tasks mapping to specific agents.

### Tasks
- Implement `AgentRunner`:
  - Resolves active agents using the Skill Graph/APR task owner.
  - Standardizes raw execution results into generic `TaskExecution` outputs.

---

## 26.4 — Agent Supervisor (CRO‑Supervisor)

### Objectives
- Supervise active workers and execute retry/recovery strategies.

### Tasks
- Implement `AgentSupervisor`:
  - Tracks task execution status (pending, running, failed, completed).
  - Handles transient errors with configured retry and backoff parameters.
  - Emits telemetry events and logs results directly to the memory substrate.

---

## 26.5 — CRO Control‑Plane API (CRO‑API)

### Objectives
- Expose runtime execution status and metrics as REST routes.

### Tasks
- Add routes:
  - `POST /v1/cro/execute` — start executing plan (dry-run or commit)
  - `GET /v1/cro/episodes` — list execution history episodes
  - `GET /v1/cro/episodes/:id` — fetch execution logs and outcomes
- Register CRO routes in the core router.

---

## 26.6 — Execution Console UI (CRO‑UI)

### Objectives
- Provide a cockpit console for running and observing autonomous tasks.

### Tasks
- Add `ExecutionConsole` React view:
  - Queue statistics (running, pending, idle, active workers).
  - Execution history logs and outcomes.
  - Active retry alerts and safeguard events.
- Integrate into Command Center sidebar and routing.

---

## 26.7 — CRO Integration & Safety

### Objectives
- Form a closed execution loop: Plan $\rightarrow$ Execute $\rightarrow$ Observe $\rightarrow$ Plan.

### Tasks
- APR:
  - Ingest tasks produced by APR planning loops directly.
- Memory:
  - Append execution outcomes, latencies, and failures as `cro.execution` events.
- Skill Graph:
  - Respect agent capabilities and routing rules before allocating tasks to runners.

---

## Verification

### Automated
- `cro.test.ts`:
  - Queue ordering and execution.
  - Concurrency bounds enforcement.
  - Retry and supervisor recovery checks.
  - API endpoint response payloads.

### Manual
- Run:
  - `node projects/cic/dist/cro/cli.js --dry-run`
- Verify:
  - Multi-agent tasks are loaded and run.
  - Concurrency does not exceed limits.
  - History logs appear in execution console UI.
