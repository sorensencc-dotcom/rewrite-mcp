# CIC Prompt Telemetry

Minimal telemetry service and dashboard for monitoring prompt usage, drift, model calls, and pipeline events.

## Features

- **Pack Usage**: Track which prompt packs and versions are being used.
- **Drift Detection**: Monitor hash-based drift between expected and actual prompt content.
- **Model Calls**: Track latency and success rates for LLM calls.
- **Pipelines**: Visualize high-level orchestration flows.

## Quick Start

1. **Install dependencies**:
   ```bash
   cd tools/prompt-telemetry
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   ```
   Default port: `4310`

3. **Open the dashboard**:
   Open `dashboard.html` in your browser or serve it from a local web server.

## Integration

The system is integrated via `apps/cic-pms/src/telemetryClient.js`.

### Environment Variables

- `PROMPT_TELEMETRY_URL`: URL of the telemetry server (default: `http://localhost:4310`)
- `PROMPT_TELEMETRY_PORT`: Port for the telemetry server (default: `4310`)

## Endpoints

### Ingest

- `POST /ingest/pack-usage` — Record a prompt pack call.
- `POST /ingest/drift` — Record a drift event.
- `POST /ingest/model-call` — Record an LLM call with latency.
- `POST /ingest/pipeline` — Record a pipeline orchestration event.
- `POST /ingest/override` — Record a manual agent override.
- `POST /ingest/prp` — Record a PRP lifecycle event.
- `POST /ingest/mas_rerun_attempt` — Record a MAS rerun attempt (`agent`, `attempt`, `maxAttempts`, `backoffMs`, `reason`, `correlationId`).
- `POST /ingest/mas_rerun_backoff` — Record the backoff pause before a rerun (`agent`, `attempt`, `backoffMs`, `correlationId`).
- `POST /ingest/mas_rerun_final_state` — Record the outcome of a rerun sequence (`agent`, `finalState`, `attempts`, `maxAttempts`, `correlationId`).

### Retrieval

- `GET /telemetry/packs` — Pack usage counts.
- `GET /telemetry/drift` — Recent drift events.
- `GET /telemetry/model-calls` — Recent LLM calls.
- `GET /telemetry/pipelines` — Recent pipeline events.
- `GET /telemetry/timeline` — Unified event stream (all types, newest-first, max 200).
- `GET /telemetry/trace/:correlationId` — All events for a single job, oldest-first for waterfall rendering.

## Dashboard Panels

| Panel | Data source | Description |
| --- | --- | --- |
| Packs · Usage | `/telemetry/packs` | Pack call counts by version. |
| Drift · Recent | `/telemetry/drift` | Hash-mismatch drift events. |
| Model Calls · Recent | `/telemetry/model-calls` | LLM latency and success. |
| Pipelines · Recent | `/telemetry/pipelines` | High-level orchestration runs. |
| Meta · Status | all | Live counts and server URL. |
| MAS Intelligence · Timeline | `/telemetry/timeline` | MAS rerun events with icons: ⚡ attempt, … backoff, ✓/✕ final state. |
| MAS Rerun · Waterfall | `/telemetry/timeline` | Proportional bar chart of rerun events per sequence. |
