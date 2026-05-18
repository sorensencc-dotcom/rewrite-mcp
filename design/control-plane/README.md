# Control Plane — BOB Sandwich Architecture
# File: design/control-plane/README.md | Version: 1.0.0 | Date: 2026-05-15

## Overview

The Control Plane is the operator-facing surface that unifies CIC v3.0 and Rewrite Labs MCP
into a single, auditable API + UI layer. It is implemented as a three-layer "BOB Sandwich":

```
┌─────────────────────────────────────────────────────┐
│  OUTER BOB — Design / UX Layer                      │
│  design/control-plane/{tokens,layout,wireframes}    │
├─────────────────────────────────────────────────────┤
│  MIDDLE BOB — Operator Console Layer                │
│  operator-ui/control-room.html                      │
│  operator-ui/js/control-plane-api.js                │
│  operator-ui/js/{pipelines,agents,runs,metrics}…   │
│  operator-ui/css/control-room.css                   │
├─────────────────────────────────────────────────────┤
│  CORE BOB — Control-Plane API Layer                 │
│  services/control-plane/index.js                    │
│  services/control-plane/routes/{pipelines,          │
│    agents,runs,metrics}.js                          │
└─────────────────────────────────────────────────────┘
```

---

## Layer 1 — Design / UX

| File              | Purpose                                               |
|-------------------|-------------------------------------------------------|
| `tokens.json`     | Single source of truth for all UI design tokens       |
| `layout.md`       | Layout primitives, shell structure, responsive rules  |
| `wireframes.txt`  | ASCII wireframes for every major view                 |

Consumers: `operator-ui/css/control-room.css` (reads token values), any future build pipeline.

---

## Layer 2 — Operator Console

Static, no-framework, DOM-driven HTML application served from `operator-ui/`.

| File                          | Purpose                                        |
|-------------------------------|------------------------------------------------|
| `control-room.html`           | Shell: tab bar + panel containers              |
| `js/control-plane-api.js`     | Typed fetch wrappers for all API endpoints     |
| `js/pipelines-panel.js`       | Pipelines list, detail, trigger action         |
| `js/agents-panel.js`          | Agent list, capabilities, pipeline refs        |
| `js/runs-panel.js`            | Run table, filters, detail drawer              |
| `js/metrics-panel.js`         | Latency / throughput / error-rate charts       |
| `css/control-room.css`        | Implements layout.md + tokens.json             |

All API calls go through `control-plane-api.js`. No panel module calls `fetch` directly.

---

### Layer 3 — Control-Plane API

HTTP service mounted at `/api/control-plane`. Standalone Node ESM process, no external deps.
Also serves Layer 2 static assets from `operator-ui/` when accessed at non-API paths.

| File                              | Routes                                             |
|-----------------------------------|----------------------------------------------------|
| `services/control-plane/index.js` | HTTP server, router, static server, response envelope |
| `routes/pipelines.js`             | GET /pipelines, GET /pipelines/:id, POST /pipelines/:id/runs |
| `routes/agents.js`                | GET /agents, GET /agents/:id                       |
| `routes/runs.js`                  | GET /runs, GET /runs/:id                           |
| `routes/metrics.js`               | GET /metrics                                       |
| `(static)`                        | GET /healthz, GET /version, GET / (serves UI)      |


### Response Envelope (invariant)

Every response is wrapped:

```json
{
  "requestId": "<uuid>",
  "timestamp": "<ISO-8601>",
  "source": "control-plane/v1.0.0",
  "data": { ... }
}
```

Error responses add `"error": "<message>"` and omit `"data"`.

### Mutating Endpoints

Only `POST /pipelines/:id/runs` mutates state (triggers a pipeline run). All other endpoints
are read-only. This invariant is enforced in `services/control-plane/index.js`.

---

## BOB Targeting Rules

- A BOB targeting this stack must apply patches in order: OUTER → MIDDLE → CORE.
- No CIC/Rewrite internal business logic may be modified by a control-plane BOB.
- All new surfaces must be deterministic, auditable (requestId + timestamp + source),
  and backward-compatible where possible.
- SHA-256 checksums for every delivered file are recorded in `BOB_MANIFEST.json`.
