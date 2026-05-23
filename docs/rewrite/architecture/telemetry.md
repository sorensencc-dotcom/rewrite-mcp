# Prompt Telemetry System

The Prompt Telemetry system provides real-time monitoring and observability for the Cast Iron Charlie (CIC) intelligence pipeline.

## Overview

Telemetry is captured at critical points in the LLM lifecycle:
- **Pack Usage**: Tracking which versions of prompt packs are active.
- **Drift Detection**: Automatic hash-based monitoring to ensure prompt integrity.
- **Model Performance**: Capturing latency and success rates for every LLM call.
- **Pipeline Visibility**: Visualizing the multi-agent orchestration flow.

## Components

### 1. Telemetry Service (`tools/prompt-telemetry`)
A standalone Node.js service that ingests events via a REST API and serves live telemetry data.

### 2. CIC Observability Dashboard (`apps/operator-ui/dashboard`)
A real-time, high-fidelity monitoring interface for the entire CIC pipeline.
- **Agent Grid**: Live status monitoring for all agents (INGEST, ENRICH, ORCHESTRATE, SYNTHESIZE, AUDIT, MCP).
- **Pipeline Diagram**: Animated visualization of the data flow through the system.
- **Event Log**: A 50-entry rolling log of system events and state changes.
- **Manual Overrides**: Integrated circuit breakers (RESET/KILL) for granular agent control.

### 3. Telemetry Client (`apps/cic-pms/src/telemetryClient.js`)
A shared library used by Harvester and Orchestrator to emit events.

### 4. Operator UI Integration
A specialized panel in the CIC Control Room that pulls data from the telemetry service via the Control Plane proxy.

### 5. Intelligence Timeline
A unified, global stream of events surfaced in the Observability Dashboard. It aggregates Model Calls, Drift Events, Pipeline Progress, and Manual Overrides into a single, filterable view.

## Data Points

### Drift Events
Captured during the `detectDrift` phase. It compares the `currentHash` of a prompt pack against the `expectedHash` defined in the manifest.

### Model Calls
Captured in the `runWithFallback` and `geminiClient` wrappers. Includes:
- `model`: The specific model name.
- `subsystem`: `harvester` or `orchestrator`.
- `pack`: The name of the prompt pack used.
- `latencyMs`: Total turn-around time for the request.
- `success`: Boolean indicating if the call returned correctly.
- **Correlation ID**: Unique identifier for tracking a single job across multiple parallel agents.

### Manual Overrides
Captured when an operator triggers a `RESET` or `KILL` action from the Agent Grid.
- `agent`: The ID of the targeted agent (e.g., INGEST, ENRICH).
- `action`: The action performed (RESET or KILL).
- `correlationId`: A unique `op-` prefixed ID generated for the manual intervention.

### Phase 26 Hardening: Advanced Tracing
As part of the Runtime Hardening phase, telemetry now supports:
- **Waterfall Visualization**: Tracing the retry and fallback chain (e.g., Gemini → Retry 1 → Retry 2 → Claude Fallback).
- **Parent-Child Mapping**: Identifying the relationship between the main orchestration job and the concurrent sub-agent tasks.
- **Checkpoint Integration**: Telemetry events are correlated with on-disk checkpoints in the `checkpoints/` directory.

### Pipeline Events
Captured during high-level orchestration jobs, tracking the sequence of agents and prompt packs used to fulfill a user request.

### MAS Rerun Telemetry

Three events emitted by the `runAgentWithMAS` loop in `orchestrator.js` whenever the MAS Synergy Analyzer issues a `rerunAgent` directive:

| Event | Emitted | Key fields |
| --- | --- | --- |
| `mas_rerun_attempt` | Before each rerun execution | `agent`, `attempt`, `maxAttempts`, `backoffMs`, `reason` |
| `mas_rerun_backoff` | Immediately before the backoff sleep | `agent`, `attempt`, `backoffMs` |
| `mas_rerun_final_state` | After the rerun loop exits | `agent`, `finalState` (`success`\|`failed`), `attempts`, `maxAttempts` |

All three events carry `correlationId` for cross-event linking and are ingested via:

- `POST /ingest/mas_rerun_attempt`
- `POST /ingest/mas_rerun_backoff`
- `POST /ingest/mas_rerun_final_state`

They are included in both `GET /telemetry/timeline` and `GET /telemetry/trace/:correlationId`, and rendered by the **MAS Intelligence Timeline** and **MAS Rerun Waterfall** panels in the dashboard.

### MAS Blackboard Signals

Emitted by the MAS Fusion Layer (`src/mas/mas.js`) after every agent execution step. Each signal entry contains:

- `agent`: MAS agent ID (`INGEST`, `ENRICH`, `ORCHESTRATE`, `SYNTHESIZE`, `AUDIT`, `MODELS`).
- `drift`: Drift score from the most recent telemetry packet.
- `confidence`: Confidence score from the most recent telemetry packet.
- `directive`: The routing directive issued by the Synergy Analyzer (`{ action, reason, correlationId }`).
- `ts`: ISO-8601 timestamp of the signal.

Signals are persisted to `data/mas-blackboard.json` alongside facts, entities, hypotheses, and notes. They are surfaced in the Observability Dashboard MAS Blackboard panel via `GET /mas/blackboard`.
