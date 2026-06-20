# Mock API Server — Console v3

Test the Console v3 dashboard layout without real backend endpoints.

## Quick Start

**Option A: Run mock server separately**

```bash
# Terminal 1: Start mock API server
node mock-api-server.js

# Terminal 2: Start Vite dev server
npm run dev
```

Then open http://localhost:5173/console-v3

**Option B: Run both together** (requires `concurrently` installed)

```bash
npm run dev:with-mock
```

Then open http://localhost:5173/console-v3

## What's Mocked

The mock server listens on `http://localhost:8080` and responds to all Console v3 API calls:

### CIC Core Endpoints

- **GET `/cic/health`** — System health status (green/yellow/red)
- **GET `/cic/pipelines`** — Running pipelines with progress & ETA
- **GET `/cic/alerts`** — System alerts (info/warning/error/critical)
- **GET `/cic/workspace`** — User info, permissions, activity log
- **POST `/cic/actions`** — Execute actions (start/pause/resume/reset)

### Agent Endpoints

- **GET `/agents`** — List all agents with status
- **GET `/agents/:agentId`** — Get agent detail (metadata, heartbeat, costs, logs)
- **POST `/agents/:agentId/invoke`** — Trigger agent execution
- **POST `/agents/:agentId/pause`** — Pause agent
- **POST `/agents/:agentId/restart`** — Restart agent
- **POST `/agents/:agentId/snapshot`** — Take agent snapshot

## Test Data

All responses are **deterministic but vary slightly on each request** to simulate live data:

- **Health status** cycles through mostly-green states with occasional yellow/red
- **Pipelines** progress updates randomly (+/- 5% per request)
- **ETAs** decrease realistically over time
- **Alerts** include info/warning states, with occasional critical alerts
- **Agent heartbeats** vary latency slightly (80–150ms range)
- **Cost timelines** show realistic 20-point cost graphs

## Development Workflow

1. **Mock server running?** Check http://localhost:8080/health

2. **Frontend dev server running?** Check http://localhost:5173 (Vite welcome page)

3. **Dashboard ready?** Navigate to http://localhost:5173/console-v3
   - Should see "✓ Backend ready" status indicator
   - All 6 panels rendering with mock data
   - Polling intervals working (Health: 10s, Pipelines: 5s, Alerts: 3s, Agents: 5s)

4. **Validate layout:**
   - Tier 1 (Health 60% / Pipelines 40%)
   - Tier 2 (Agents 33% / Alerts 33% / Workspace 33%)
   - Controls (100% width, bottom)
   - All text using CIC design tokens (no hardcoded colors)

## Environment Variables

If you need to point to a different API server:

```bash
# .env.local
VITE_CIC_API_URL=http://localhost:8000  # Changes mock server port
```

The Vite proxy (vite.config.ts) will forward `/api/*` requests to this URL.

## Common Issues

**Q: "Cannot find module 'express'"**
```bash
# Install mock server dependencies
npm install --save-dev express cors
```

**Q: "connect ECONNREFUSED 127.0.0.1:8080"**
- Mock server not running. Start it in a separate terminal: `node mock-api-server.js`

**Q: "Backend ready" shows as false**
- Mock server running but `/cic/health` failing
- Check mock server logs for errors
- Verify http://localhost:8080/health returns `{"status":"ok"}`

**Q: Data not updating on dashboard**
- Mock server is running, but frontend not polling
- Check browser console for fetch errors
- Verify Vite proxy config in `vite.config.ts` (should show `/api` → `localhost:8080`)

## Next Steps

When dashboard layout is validated:

1. **Connect real TorqueQuery feed** — Replace mock `/cic/agents` with live semantic logs
2. **Wire alert sources** — Connect to drift detection + governance queue
3. **Add WebSocket streaming** — Replace polling with real-time heartbeats

For wiring instructions, see `rewrite-mcp/HANDOFF.md`.
