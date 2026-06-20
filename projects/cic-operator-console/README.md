# CIC Operator Console v2

**Production-grade observability and control console for CIC (Cast Iron Charlie).**

Single authoritative dashboard for:
- Flow execution monitoring
- Agent performance metrics
- Context latency tracking
- CRG health status
- Compliance metrics
- Settings + registries

## Quick Start

```bash
cd projects/cic-operator-console

# Install
npm install

# Development
npm run dev
# Visit http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

Set via `.env`:

```bash
VITE_CIC_API_URL=http://localhost:8080
```

Or via environment:

```bash
export VITE_CIC_API_URL=http://cic-service:8080
npm run dev
```

## Pages

| Page | Purpose | Source |
|------|---------|--------|
| **Dashboard** | Service health + request metrics | CIC `/health`, `/metrics` |
| **Flow Explorer** | Execute flows, view execution timeline | CIC `/flow/execute`, `/flow/:id` |
| **Agent Performance** | Latency + success rate by agent | CIC metrics |
| **Context Inspector** | Load and inspect code contexts | CIC `/context/:id` |
| **CRG Health** | Graph load status, cache metrics | CIC `/health` (backends) |
| **Metrics** | Raw Prometheus-style metrics | CIC `/metrics` |
| **Settings** | Flow registry, agent registry, config | CIC registry endpoints |

## Architecture

```
App (Router)
├── Dashboard (health + metrics)
├── FlowExplorer (execute + timeline)
├── AgentPerformance (latency chart)
├── ContextInspector (context loader)
├── CRGHealth (backend status)
├── Metrics (raw metrics)
└── Settings (registries)

Hooks (React Query)
├── useHealth() - CIC /health (30s refresh)
├── useContext(id) - CIC /context/:id
├── useMetrics() - CIC /metrics (60s refresh)
└── useFlowExecution(id) - CIC /flow/:id (2s during execution)

Client (Axios)
└── CIC API → http://localhost:8080
```

## Design System — CIC Gold (v1.0.0)

**All UI must import from CIC primitives. No exceptions.**

This console enforces the CIC Gold Design System at build time and runtime.

### Rules

1. **All components** must import from `src/components/cic-primitives/`
2. **No inline `style=` props** — use `className` with Tailwind + CIC token classes
3. **No hardcoded colors** — use `cic.color.*` tokens from `src/tokens/cic-tokens.ts`
4. **No raw spacing values** — use CIC spacing scale (multiples of 4px)
5. **No `@font-face` overrides** — CIC manages fonts globally

### Component Library

```ts
import {
  CICPanel, CICCard, CICGrid, CICDivider,  // Layout
  CICStat, CICMetric, CICBadge,             // Data display
  CICAlert, CICHealthPulse,                  // Status
  CICButton,                                 // Interactive
  CICTimeline, CICLogStream,                 // Streams
} from '@/components/cic-primitives';
```

### Design Tokens

```ts
import { cic, cicColor, cicSpacing } from '@/tokens/cic-tokens';

// Reference tokens by name, never by raw value:
cic.color.accent       // '#6366f1'
cic.color.bgPanel      // '#17171f'
cic.spacing['4']       // '16px'
```

### Enforcement

- **Pre-build**: `npm run prebuild` runs `scripts/validate-design-compliance.js`. Build fails on violations.
- **Lint**: `npm run lint` enforces no-inline-style and no-hardcoded-color ESLint rules.
- **Runtime**: `PanelValidator` (services/cic-governance) checks panels at mount; logs violations to governance vault; blocks non-compliant panels.

### Styling

- **Framework**: Tailwind CSS
- **Theme**: CIC Gold dark mode
- **Colors**: All from `src/tokens/cic-tokens.ts` — never raw hex
- **Font**: JetBrains Mono (mono) / Inter (sans) — CIC managed

## Dependencies

- **React 18** - UI framework
- **React Router 6** - Routing
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **React Query** - Data fetching
- **Axios** - HTTP client
- **TypeScript** - Type safety

## Deployment

### Local
```bash
npm install && npm run dev
```

### Docker
```bash
docker build -t cic-operator-console:1.0.0 .
docker run -p 5173:5173 \
  -e VITE_CIC_API_URL=http://cic-service:8080 \
  cic-operator-console:1.0.0
```

### Kubernetes
```bash
kubectl apply -f operator-console-deployment.yaml
kubectl port-forward svc/cic-operator-console 5173:5173
```

## Status

✅ **Production Ready**

All pages implemented and wired to CIC service API. Ready for deployment and integration testing.

## Next Steps

1. Deploy CIC service (projects/cic)
2. Configure VITE_CIC_API_URL
3. Start console: `npm run dev`
4. Test flow execution, metrics, context inspection
5. Deploy to staging/production via Docker/K8s
