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

### Health & Metrics

- `GET /health` — Server health check (returns `{status: 'ok', uptime_ms, timestamp}`)
- `GET /metrics` — System metrics snapshot
  ```json
  {
    "metrics": {
      "total_prompts": 0,
      "avg_latency_ms": 0,
      "completion_rate": 1.0,
      "error_rate": 0.0
    },
    "agents": {
      "claude": {"status": "ok", "uptime_ms": 12345},
      "copilot": {"status": "ok", "uptime_ms": 12345},
      "gemini": {"status": "ok", "uptime_ms": 12345}
    }
  }
  ```

- `GET /events` — Recent telemetry events (last 10, up to 1000 stored)

### Event Logging

- `POST /event` — Log a telemetry event
  ```json
  {
    "type": "prompt_call|model_call|error",
    "agent": "claude|copilot|gemini",
    "duration_ms": 1234,
    "status": "success|error"
  }
  ```

### Legacy Endpoints (Compatibility)

- `POST /ingest/pack-usage`: Record a prompt pack call.
- `POST /ingest/drift`: Record a drift event.
- `POST /ingest/model-call`: Record an LLM call with latency.
- `POST /ingest/pipeline`: Record a pipeline orchestration event.
- `GET /telemetry/*`: Retrieval endpoints for the dashboard.
