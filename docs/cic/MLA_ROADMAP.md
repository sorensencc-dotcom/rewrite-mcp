# Phase 23 — CIC Memory Layer & Long‑Horizon Autonomy (MLA)

**Objective:** Give CIC a durable, queryable, self‑evolving memory substrate so agents can reason over historical deltas, long‑term patterns, doctrine evolution, and cross‑phase dependencies. This is the foundation for CIC becoming a *continuously learning system* rather than a stateless executor.

---

## 23.1 — Memory Substrate Specification (MLA‑Spec)

Define the CIC Memory Layer as a first‑class subsystem.

### Deliverables
- Memory schema (`memory/ledger.jsonl` or SQLite-backed store)
- Event types:
  - `roadmap.delta`
  - `pipeline.run`
  - `sandbox.decision`
  - `docs.build`
  - `agent.output`
  - `lane.progress`
- Retention rules
- Query API (read‑only for agents, append‑only for systems)
- Memory governance (who can write, who can read, who can summarize)

### Why
ARPS emits deltas, but they disappear after each run. Phase 23 gives CIC **temporal continuity**.

---

## 23.2 — Memory Harvester Agent (MLA‑Harvester)

Extend ARPS Harvester into a **Memory Harvester** that writes structured events into the memory substrate.

### Responsibilities
- Append every ARPS delta
- Append every docs build result
- Append every scheduler run
- Append every Command Center invocation
- Append every prompt sandbox decision
- Append CIC Stability Dashboard signals

### Why
This creates a **time series of CIC’s evolution**, enabling long‑horizon reasoning.

---

## 23.3 — Memory Synthesizer Agent (MLA‑Synthesizer)

A new agent that periodically compresses memory into:
- Summaries
- Trends
- Regressions
- Drift detection
- “State of CIC” snapshots

### Responsibilities
- Weekly memory condensation
- Monthly “CIC Evolution Report”
- Detect regressions (e.g., repeated failures in a subsystem)
- Detect long‑term drift (e.g., prompts trending toward lower similarity)
- Detect stale lanes or modules

### Why
This gives CIC the ability to **understand itself over time**, not just in the moment.

---

## 23.4 — Memory‑Aware Agents (MLA‑Integration)

Upgrade existing agents (Harvester, Synthesizer, ARPS, Stability Dashboard) to become **memory‑aware**.

### Examples
- ARPS can reference past deltas to detect repeated failures
- Stability Dashboard can show 7‑day and 30‑day trends
- Command Center can show “What changed in CIC this week”
- Roadmap Synthesizer can generate “Phase X historical context” sections

### Why
This is the first step toward **autonomous planning**.

---

## 23.5 — Memory Query API (MLA‑API)

Expose a read‑only API for agents and operators:

```
GET /v1/memory/events
GET /v1/memory/events?type=roadmap.delta
GET /v1/memory/trends
GET /v1/memory/snapshots
```

### Why
This makes memory a **platform**, not just a file.

---

## 23.6 — Memory Visualization in Command Center (MLA‑UI)

Add a new panel:

### CIC Memory Explorer
- Timeline of deltas
- Prompt drift graph
- Docs build history
- ARPS run history
- Lane progress over time
- “Hotspots” (subsystems with repeated issues)

### Why
Operators need to *see* CIC’s evolution.

---

## 23.7 — Memory‑Driven Autonomy (MLA‑Autonomy)

The final milestone: allow CIC to propose its own roadmap updates based on memory patterns.

### Examples
- “Phase 18 is stale — no commits in 45 days.”
- “Lane G shows repeated failures — propose Phase 24: Lane G Stabilization.”
- “Prompt drift trending upward — propose tightening similarity thresholds.”
- “Docs build failing weekly — propose restructuring docs pipeline.”

### Why
This is the first step toward CIC becoming a **self‑directing system**.
