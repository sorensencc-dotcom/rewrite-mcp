# CIC_AGENT_CONTRACTS.md
# Version: 1.0.0 | Date: 2026-05-15

## Agent Interface

All CIC agents must satisfy `AgentContract`:

```
{
  name:    string                          — unique registry key
  version: string                          — semver
  execute: async (context: Object) => Object
}
```

Failure mode: `execute` must throw on error. Silent returns are not permitted.

## Registered Agents

### HarvesterAgent
- **File:** `cic/agents/HarvesterAgent.js`
- **Version:** 1.0.0
- **Input context:** `{ type: "web"|"file"|"sidecar", config: Object }`
- **Output:** `HarvesterPayload` — see CIC_DATA_CONTRACTS.md
- **Error codes:** `HARVESTER_UNKNOWN_TYPE`

### IngestorAgent
- **File:** `cic/agents/IngestorAgent.js`
- **Version:** 1.0.0
- **Input context:** `{ sourceType: "file"|"url"|"drive", sourceConfig: Object }`
- **Output:** `{ jobId: string }`
- **Error codes:** `INGESTION_UNKNOWN_SOURCE_TYPE`, `INGESTION_VALIDATE_EMPTY_PAYLOAD`

## Registration Pattern

```js
import { createAgentRegistry, registerAgent } from './cic/agents/index.js';
const registry = createAgentRegistry();
registerAgent(registry, HarvesterAgent);
registerAgent(registry, IngestorAgent);
```

## Invariants

- `execute` must be async.
- `name` is immutable after registration.
- Duplicate `name` overwrites prior registration; callers must guard if needed.
- `execute` receives a plain context object; shape is agent-defined.
