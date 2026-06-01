# CIC Package Structure — Runtime v1.0.0

## Overview

The CIC runtime uses a **scoped monorepo** architecture with clean boundaries between apps and reusable packages.

```
apps/
  control-plane/          — HTTP server, request routing, runtime initialization
    src/
      server.mjs          — Express app factory and startup
      routes/
        api/              — /api/v1/* endpoint definitions
        health.mjs        — /health, /healthz public endpoints
      runtime/
        config.mjs        — Configuration, env vars, validation
        install.mjs       — Orchestrator engine initialization
    index.mjs             — Entry point: node index.mjs

packages/
  orchestrator/           — @cic/orchestrator (orchestration engines)
    src/
      regions/            — Region registry, lookup, status
      rollout/            — Deployment orchestration (stub)
      arbitration/        — Decision making (stub)
      drift/              — Divergence detection (stub)
      expansion/          — Scaling orchestration (stub)
      federation/         — Multi-agent coordination (stub)
      cognition/          — Reasoning & evolution (stub)

  agents/                 — @cic/agents (agent implementations)
    src/
      extractors/         — Data extraction agents (stub)
      redesign/           — Redesign agent (stub)
      outreach/           — Outreach agent (stub)

  shared/                 — @cic/shared (common utilities)
    src/
      logging/            — Structured logging
      config/             — Configuration helpers (stub)
      types/              — Shared type definitions (stub)
```

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start the control plane

```bash
# Development
cd apps/control-plane
pnpm dev

# Production
pnpm start
```

### 3. Verify it works

```bash
# Health check
curl http://localhost:8080/health

# List regions
curl http://localhost:8080/api/v1/regions

# Check a specific region
curl http://localhost:8080/api/v1/regions/us-east-1

# Update region status
curl -X PATCH http://localhost:8080/api/v1/regions/us-east-1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"degraded"}'
```

## Configuration

All config via environment variables:

```bash
# Port (default: 8080)
PORT=3000

# Host (default: 0.0.0.0)
HOST=localhost

# Regions (default: us-east-1,eu-central-1)
REGIONS=us-east-1,eu-central-1,ap-southeast-1

# Node environment
NODE_ENV=development

# Auth disabled (for local dev, default: false)
AUTH_DISABLED=true
```

## Import patterns

Import services directly from scoped packages:

```js
// From control-plane/src/runtime/install.mjs
import { initRegions } from '@cic/orchestrator/regions';
import { logger } from '@cic/shared/logging';

// From any route handler
import { listRegions, getRegion } from '@cic/orchestrator/regions';
```

## Refactor checklist

The runtime refactor is **locked** once these are true:

- [x] Package structure (@cic/orchestrator, @cic/agents, @cic/shared)
- [x] `apps/control-plane/src/server.mjs` is single HTTP entrypoint
- [x] Regions service extracted to `@cic/orchestrator/regions`
- [x] `/api/v1/regions` and `/health` working
- [ ] Runtime install flow tested end-to-end
- [ ] CI runs tests against new layout
- [ ] Old control-plane code fully removed
- [ ] Legacy UI routes removed

Once locked, the **unified Phase 5 dashboard** can be dropped into:

```
apps/control-plane/
  dashboard/           — new unified UI (React/Vite)
    src/
    dist/
  public/
    index.html         — served from / and /dashboard
```

## Next steps

1. Test the server boots cleanly: `pnpm dev`
2. Test `/health` and `/api/v1/regions` endpoints
3. Confirm runtime config loads from env vars
4. Extract remaining orchestrator engines (rollout, arbitration, drift, etc.)
5. Finalize dashboard consolidation once this is stable
