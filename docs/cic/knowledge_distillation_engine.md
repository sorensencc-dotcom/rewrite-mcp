# Knowledge Distillation Engine Specification (Phase 28)

## Overview
The **Knowledge Distillation Engine** prevents Cast Iron Charlie's Coherent Knowledge Graph (CKG) from degrading into an unmanageable data landfill. As the system runs autonomous cycles, it generates thousands of task, failure, proposal, and run logs. Without continuous distillation, query latency increases, and similarity searches lose precision. 

The distillation engine runs pre-proposal, identifying stale or redundant knowledge, proposing merges, and compressing graph paths without deleting critical information.

---

## Distillation Criteria

### 1. Stale Knowledge Node Definition
A CKG node is considered **stale** if it meets all of the following conditions:
- Created more than 14 days ago.
- Has no active connections to current tasks, runs, or active tenants.
- Type is transient (e.g., intermediate subtask steps, debug events, or expired metrics).
- Has not been queried or updated within the last 7 days.

### 2. Redundant Knowledge Node Definition
Nodes are identified as **redundant** if:
- **Capability Duplication**: Two capabilities describe the same functionality (e.g. overlap in title/description > 85%).
- **Repeated Failure Paths**: Identical failure types on the same file from different runs. These are compressed into a single failure count on the file node.
- **Overlapping Concepts**: High semantic similarity in tag arrays and meta-fields.

### 3. Protected Nodes (Never Prune)
The following nodes are explicitly protected and must *never* be suggested for deletion or structural compression:
- All core schema definition nodes (`type: "schema"`).
- Current system meta-rules (`type: "meta_rule"`).
- Active tenant profiles (`type: "tenant"`).
- Baseline performance benchmark nodes (`type: "benchmark"`).
- Explicitly flagged nodes containing `meta.protected: true`.

---

## Processing Engine Pipeline

```text
CKG State ──────┐
MAS Traces ─────┼──> [Scan & Classify] ──> Suggest Merges/Prunes ──> Write Reports
Timeline Logs ──┘
```

1. **Scan**: Read the CKG node lists and adjacency matrices.
2. **Classify**: Apply staleness rules, compute cluster distances for redundancy, check against protection lists.
3. **Resolve**:
   - For **stale** nodes: Propose removal and edge rerouting.
   - For **redundant** nodes: Propose merging nodes (combining meta fields and aggregation of references).
4. **Draft**: Output reports for the Evolution Loop Proposals stage.

---

## Artifact Schema Contracts

### `prune_candidates.json`
```json
{
  "timestamp": 0,
  "candidates": [
    {
      "nodeId": "string",
      "type": "string",
      "action": "delete|merge",
      "reason": "string",
      "mergeTargetId": "string"
    }
  ]
}
```

### `distillation_report.json`
```json
{
  "timestamp": 0,
  "metrics": {
    "originalNodesCount": 0,
    "originalEdgesCount": 0,
    "staleNodesFound": 0,
    "redundantNodesFound": 0,
    "estimatedCompressionRatio": 0.0
  }
}
```
