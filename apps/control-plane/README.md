# CIC Control Plane

Minimum viable control plane dashboard and strategic subsystem endpoints for CIC orchestration.

## Quick Start

1. **Install dependencies**:
   ```bash
   cd apps/control-plane
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   ```
   Default port: `3000`

3. **Open the dashboard**:
   - Navigate to `http://localhost:3000/dashboard`
   - Or access root health check: `http://localhost:3000/health`

## Endpoints

### Health & Dashboard

- `GET /health` — Server health check (returns `{status: 'ok', timestamp}`)
- `GET /dashboard` — HTML dashboard with system status and strategic endpoints

### Strategic Subsystem (Phase 5)

The Control Plane exposes strategic intent endpoints under `/mcp/strategic/`:

- `GET /mcp/strategic/intent` — Current system intent (SOE: State of Execution)
- `GET /mcp/strategic/foresight` — Predictive scenarios (PDM: Predictive Decision Model)
- `GET /mcp/strategic/consensus` — Agent consensus layer (SCL: Strategic Consensus Layer)
- `GET /mcp/strategic/aoc` — Agent observation & change detection (AOC: Agent Observation Circuit)
- `GET /mcp/strategic/dashboard` — Full strategic state snapshot
- `POST /mcp/strategic/alerts` — Push alerts from other subsystems

## Environment Variables

- `PORT` — Server port (default: `3000`)
- `CP_GOOGLE_CLIENT_ID` — Google OAuth client ID (optional)
- `CP_ALLOWED_EMAILS` — Comma-separated allowed email list
- `CP_TELEMETRY_URL` — Telemetry service URL (default: `http://localhost:4310`)
- `CP_REGION` — Deployment region (default: `us-east`)
- `CP_AUTH_DISABLED` — Skip auth for development (default: `false`)

## Architecture

- **Express.js** — HTTP server framework
- **CORS enabled** — Cross-origin requests allowed
- **JSON API** — RESTful strategic subsystem endpoints
- **Mock clients** — SOE, PDM, SCL, AOC subsystems return synthetic state

## Launching Both Services

Use the provided PowerShell launcher script:

```powershell
.\scripts\launch-cic.ps1
```

This starts:
1. **Telemetry Service** (port 4310)
2. **Control Plane** (port 3000)
3. Opens the dashboard in your default browser

## Related Services

- **Telemetry** (`tools/prompt-telemetry`) — Event tracking and metrics on port 4310
- **CIC Main** (`projects/cic`) — Full ingestion pipeline and strategic layer
