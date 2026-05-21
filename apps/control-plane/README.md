# CIC Control Plane

**Version:** 2.3.0 | **Port:** 3000 | **Runtime:** Node.js 20+, CommonJS

Operator-facing HTTP service for the CIC pipeline. Serves the Operator UI and proxies all authenticated API routes.

## Routes

| Route | Description |
| --- | --- |
| `GET /health` | Service status (unauthenticated) |
| `GET /` | Control Room UI |
| `GET /dashboard` | Observability Dashboard (auth required) |
| `GET/POST /pipelines/*` | Pipeline management |
| `GET /pipelines/cic/*` | Intelligence pipeline proxy |
| `GET /agents/*` | Agent management |
| `GET /runs/*` | Run history |
| `GET /metrics/*` | Operational metrics |
| `GET /telemetry/*` | Prompt telemetry proxy |
| `GET /mas/blackboard` | MAS blackboard state |
| `GET/POST /docgen/*` | Documentation engine (Subsystem D) |

## Auth

Google ID Token by default. Set `AUTH_DISABLED=true` for local dev.

## Env

```sh
PORT                  # default 3000
GOOGLE_CLIENT_ID      # required unless AUTH_DISABLED=true
AUTH_DISABLED         # "true" for local dev only
CIC_INTELLIGENCE_URL  # default http://localhost:4000
INTELLIGENCE_TOKEN    # shared secret for intelligence service
ALLOWED_EMAILS        # comma-separated operator emails
OPERATOR_UI_ORIGIN    # allowed CORS origin (default: http://localhost:8080)
```

## MAS Blackboard

`GET /mas/blackboard` reads `projects/cic/orchestrator/data/mas-blackboard.json` directly from disk — a file-system bridge between the ESM orchestrator process and this CJS service.
