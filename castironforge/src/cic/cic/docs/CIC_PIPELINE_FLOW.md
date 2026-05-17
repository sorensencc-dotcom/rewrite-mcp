# CIC_PIPELINE_FLOW.md
# Version: 1.0.0 | Date: 2026-05-15

## Pipelines

### harvestToIngest
**File:** `cic/pipelines/harvestToIngest.js`

```
Input  → { harvesterType, harvesterConfig, sourceType }
Step 1 → harvester/v2.0.0/bridge.harvest({ type, config }) → HarvesterPayload
Step 2 → ingestion/v1.0.0/ingest.ingest({ sourceType, sourceConfig }) → { jobId }
Output → { harvested: HarvesterPayload, jobId: string }
```

Error codes: `HARVESTER_UNKNOWN_TYPE`, `INGESTION_VALIDATE_EMPTY_PAYLOAD`

### ingestToOrchestrate
**File:** `cic/pipelines/ingestToOrchestrate.js`

```
Input  → { sourceType, sourceConfig, dagNodes, dagEdges, modules }
Step 1 → ingestion/v1.0.0/ingest.ingest() → { jobId }
Step 2 → orchestrator/v3.0.0/dag.createDag(nodes, edges) → Dag
Step 3 → orchestrator/v3.0.0/registry.createRegistry(modules) → frozen registry
Step 4 → orchestrator/v3.0.0/dag.runDag(dag, context) → results
Output → { jobId, dagId, results }
```

Error codes: `INGESTION_UNKNOWN_SOURCE_TYPE`, `ORCH_MISSING_NODE_TYPE`

## Signal Emission Order

### harvestToIngest
1. `harvester.start`
2. `harvester.success` | `harvester.error`
3. `ingestion.start`
4. `ingestion.success` | `ingestion.failure`

### ingestToOrchestrate
1. `ingestion.start`
2. `ingestion.success` | `ingestion.failure`
3. `orchestrator.dag.run`
4. `orchestrator.node.execute` (per node)
5. `orchestrator.node.error` (on node failure)

## Invariants

- Pipelines are stateless; all state is passed via options.
- Pipelines log at each stage via `cic/core/logger.js`.
- Pipelines propagate errors without swallowing; callers must handle.
