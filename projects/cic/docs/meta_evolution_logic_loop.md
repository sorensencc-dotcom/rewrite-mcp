# Meta Evolution Logic Loop Specification (Phase 10)

## Overview
The **Meta Evolution Logic Loop** represents the brainstem of Cast Iron Charlie's self-evolving codebase. It coordinates safety, validation, and optimization over the system's own components. It enforces governed autonomy, ensuring that all proposed code modifications undergo strict validation, simulations, ranking, and manual operator approval before execution.

---

## Evolution Stages

```mermaid
graph TD
    Audit[1. Audit] --> Proposals[2. Proposals]
    Proposals --> Sims[3. Simulations]
    Sims --> Ranking[4. Ranking]
    Ranking --> Operator[5. Operator Decision Gated]
    Operator --> Apply[6. Apply & Validate]
    Apply --> Log[7. Ledger Log]
```

### 1. Audit Stage
- **Description**: Scans the active system state, CKG nodes, MAS performance logs, and drift metrics to identify anomalies, bottlenecks, complexity clusters, or test failures.
- **Inputs**: CKG state, MAS telemetry, test coverage, static analysis outputs.
- **Output**: `audit.json` (lists identified issues, current drift coefficient, bottlenecked paths, and system health status).

### 2. Proposals Stage
- **Description**: Formulates code changes, capability expansions, or configuration autotunes to resolve the issues found in the Audit stage.
- **Inputs**: `audit.json`, template heuristics, capability gap registry.
- **Output**: `proposals.json` (a list of patch sets containing file paths, modification type, and proposed code replacements).

### 3. Simulation Stage
- **Description**: Validates the proposed patches in a safe, isolated dry-run environment. Checks for basic compile ability, syntax correctness, and structural conflicts.
- **Inputs**: `proposals.json`.
- **Output**: `simulations.json` (simulation status, compilation status, syntax validation results).

### 4. Ranking Stage
- **Description**: Assigns scores to simulation-passing proposals based on expected utility, impact/risk ratios, alignment with current goals, and complexity changes.
- **Inputs**: `simulations.json`.
- **Output**: `ranked_proposals.json` (proposals prioritized by score, from highest-signal to lowest-signal).

### 5. Operator Decision Stage
- **Description**: Exposes the ranked list of proposals to the operator for review. Direct auto-application is prohibited.
- **Inputs**: `ranked_proposals.json`, existing decision files.
- **Output**: `decisions.json` (operator actions: `approved`, `rejected`, or `deferred`).

### 6. Apply Stage
- **Description**: Executes the changes for all proposals marked as `approved` in `decisions.json`. Employs automatic rollback safety if any post-apply checks or unit tests fail.
- **Inputs**: `decisions.json`, codebase.
- **Output**: `applied_changes.json` (the list of successfully written files, backup locations, and rollback logs if any failed).

### 7. Log Stage
- **Description**: Commits metadata, execution times, diff reports, and final metrics of the run into the persistent evolution ledger.
- **Inputs**: All stage outputs.
- **Output**: Writes final run receipt, updates CKG with evolution edges, and logs tracking metrics.

---

## Hard Rules & Constraints

1. **Veto-by-Default (No Direct Auto-Apply)**: The loop orchestrator will *never* write code changes to the live project files without an explicit `approved` decision status in the ledger.
2. **Ledger Immutability**: All run artifacts are saved under an isolated, timestamped run directory inside the evolution ledger.
3. **Rollback Integrity**: If applying an approved proposal breaks compilation or tests, the orchestrator must instantly restore the codebase snapshot.
4. **Lineage Tracing**: Every code modification must link back to a specific discovery, tenant request, or system bottleneck.

---

## Artifact Folder Structure

All evolution runs log data to:
`projects/cic/evolution/data/`

Under this root, runs are organized as follows:
```text
projects/cic/evolution/data/
├── runs/
│   └── run_<run_id>_<timestamp>/
│       ├── audit.json
│       ├── proposals.json
│       ├── simulations.json
│       ├── ranked_proposals.json
│       ├── decisions.json
│       └── applied_changes.json
```

---

## Data Schema Contracts

### `audit.json`
```json
{
  "runId": "string",
  "timestamp": 0,
  "systemDrift": 0.0,
  "anomalies": [
    {
      "id": "string",
      "type": "string",
      "description": "string",
      "severity": "low|medium|high|critical"
    }
  ]
}
```

### `proposals.json`
```json
{
  "runId": "string",
  "proposals": [
    {
      "proposalId": "string",
      "title": "string",
      "patches": [
        {
          "path": "string",
          "type": "create|modify",
          "content": "string"
        }
      ]
    }
  ]
}
```

### `decisions.json`
```json
{
  "runId": "string",
  "decisionTimestamp": 0,
  "decisions": {
    "proposal-id-1": "approved|rejected|deferred",
    "proposal-id-2": "approved|rejected|deferred"
  }
}
```
