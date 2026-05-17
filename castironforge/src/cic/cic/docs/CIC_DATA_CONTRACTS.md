# CIC_DATA_CONTRACTS.md
# Version: 1.0.0 | Date: 2026-05-15

## IngestionJob
**Defined in:** `cic/ingestion/v1.0.0/queue/types.js`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | yes | Unique job identifier |
| `sourceType` | `string` | yes | `"file"` \| `"url"` \| `"drive"` |
| `payloadType` | `string` | yes | `"generic"` or domain-specific |
| `payload` | `Object` | yes | Arbitrary job payload |
| `metadata` | `Object` | no | Arbitrary metadata |
| `enqueuedAt` | `number` | set by queue | Unix ms; added on enqueue |

## QueueConfig
**Defined in:** `cic/ingestion/v1.0.0/queue/types.js`

| Field | Type | Required |
|---|---|---|
| `maxRetries` | `number` | yes |
| `visibilityTimeoutMs` | `number` | yes |
| `retentionMs` | `number` | yes |

## HarvesterPayload
**Defined in:** `cic/harvester/v2.0.0/normalizers/payload.js`

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | `harvest-{timestamp}` |
| `type` | `"web"` \| `"file"` \| `"sidecar"` | Source type |
| `content` | `string` | Raw harvested content |
| `metadata.harvestedAt` | `number` | Unix ms |

## DagNode
**Defined in:** `cic/orchestrator/v3.0.0/dag/createDag.js`

| Field | Type | Required |
|---|---|---|
| `id` | `string` | yes |
| `type` | `string` | yes — must match a key in registry |
| `config` | `Object` | yes |

## DagEdge
**Defined in:** `cic/orchestrator/v3.0.0/dag/createDag.js`

| Field | Type |
|---|---|
| `from` | `string` (node id) |
| `to` | `string` (node id) |

## Dag
**Defined in:** `cic/orchestrator/v3.0.0/dag/createDag.js`

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | `dag-{timestamp}` |
| `nodes` | `DagNode[]` | |
| `edges` | `DagEdge[]` | |
| `createdAt` | `number` | Unix ms |

## AgentContract
**Defined in:** `cic/agents/registry.js`

| Field | Type | Required |
|---|---|---|
| `name` | `string` | yes — unique registry key |
| `version` | `string` | yes |
| `execute` | `async (context) => Object` | yes |

## DlqEntry
**Defined in:** `cic/ingestion/v1.0.0/queue/dlq.js`

| Field | Type |
|---|---|
| `job` | `Object` |
| `errorMessage` | `string` |
| `failedAt` | `number` |

## DriftEvent
**Defined in:** `cic/ingestion/v1.0.0/queue/drift.js`

| Field | Type |
|---|---|
| `jobId` | `string \| null` |
| `reason` | `string` |
| `recordedAt` | `number` |
