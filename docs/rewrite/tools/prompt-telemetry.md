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

- `POST /ingest/pack-usage`: Record a prompt pack call.
- `POST /ingest/drift`: Record a drift event.
- `POST /ingest/model-call`: Record an LLM call with latency.
- `POST /ingest/pipeline`: Record a pipeline orchestration event.
- `GET /telemetry/*`: Retrieval endpoints for the dashboard.
