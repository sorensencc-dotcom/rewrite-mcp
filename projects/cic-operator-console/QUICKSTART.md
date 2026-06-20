# Console v3 Mock API — Quick Start

Get dashboard layout testing running in 2 minutes.

## 1. Install mock server dependencies

```bash
cd rewrite-mcp/projects/cic-operator-console
npm install --save-dev express cors
```

## 2. Start mock API server (Terminal 1)

```bash
node mock-api-server.js
```

Expected output:
```
🎯 Mock API Server running on http://localhost:8080

   Endpoints available:
   GET  /cic/health
   GET  /cic/pipelines
   GET  /cic/alerts
   GET  /cic/workspace
   ...
```

## 3. Start frontend dev server (Terminal 2)

```bash
npm run dev
```

Expected output:
```
  VITE v8.0.16  ready in 245 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

## 4. Open dashboard in browser

Navigate to: **http://localhost:5173/console-v3**

You should see:
- "✓ Backend ready" status indicator (top-left)
- 6 panels with mock data:
  - **Tier 1:** Health (60%) + Pipelines (40%)
  - **Tier 2:** Agents (33%) + Alerts (33%) + Workspace (33%)
  - **Bottom:** Controls (100% width)

## 5. Validate layout

Use **[LAYOUT-VALIDATION-CHECKLIST.md](LAYOUT-VALIDATION-CHECKLIST.md)** to verify:
- Grid alignment (60/40, 33/33/33)
- Panel styling (CIC design tokens only)
- Data polling (Health 10s, Pipelines 5s, etc.)
- User interactions work

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Cannot find module 'express'` | Run `npm install --save-dev express cors` |
| "• Connecting..." (API not ready) | Start mock server: `node mock-api-server.js` |
| Blank panels, no data | Check browser console (DevTools) for fetch errors |
| Network errors in DevTools | Verify mock server is running on localhost:8080 |
| Port 5173 already in use | Change Vite port in `vite.config.ts` → `server.port: 5174` |

## Next Steps

✅ **Mock layout validated?** → Proceed to real TorqueQuery feed

See [MOCK-API.md](MOCK-API.md) for detailed endpoint docs and [HANDOFF.md](../../HANDOFF.md) for wiring TorqueQuery integration.
