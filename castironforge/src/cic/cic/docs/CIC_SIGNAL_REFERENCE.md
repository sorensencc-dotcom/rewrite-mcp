# CIC_SIGNAL_REFERENCE.md
# Version: 1.0.0 | Date: 2026-05-15

## Signals

All signals are emitted via the MCP bus (`createMcpBus` from `cic/orchestrator/v3.0.0/mcp/index.js`).

| Signal | Emitter | Payload |
|---|---|---|
| `ingestion.start` | telemetry/telemetry.js | `{ sourceType, sourceConfig }` |
| `ingestion.success` | telemetry/telemetry.js | `{ jobId: string }` |
| `ingestion.failure` | telemetry/telemetry.js | `{ error: string }` |
| `harvester.start` | HarvesterAgent | `{ type: string }` |
| `harvester.success` | HarvesterAgent | `{ id: string }` |
| `harvester.error` | HarvesterAgent | `{ error: string }` |
| `orchestrator.dag.run` | runDag.js | `{ dagId: string, nodeCount: number }` |
| `orchestrator.node.execute` | runDag.js | `{ nodeId: string, type: string }` |
| `orchestrator.node.error` | runDag.js | `{ nodeId: string, error: string }` |
| `orchestrator.replay.dump` | replay.js | `{ eventCount: number }` |

## Usage

```js
import { createMcpBus } from './cic/orchestrator/v3.0.0/mcp/index.js';
const bus = createMcpBus();
bus.on('ingestion.start', (payload) => { /* handle */ });
bus.emit('ingestion.start', { sourceType: 'file' });
```

## Invariants

- All signal handlers are non-blocking; exceptions are caught and discarded.
- Signal names are dot-separated lowercase strings.
- Payload shape is fixed per signal; extra fields are ignored.
