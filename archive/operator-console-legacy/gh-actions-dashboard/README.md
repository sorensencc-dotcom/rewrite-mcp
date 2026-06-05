# GitHub Actions Compliance Dashboard

Real-time visualization of fleet-wide GitHub Actions Node.js 24 compliance status.

## Features

- **Live compliance data**: Displays repo status, issue counts, and detailed issue lists
- **Filter controls**: View all repos, compliant only, or repos with issues
- **Auto-refresh**: Updates every 30 seconds with fresh data
- **Summary cards**: Quick view of compliance rate, total repos, and issue count

## Getting Started

### Installation

```bash
# From rewrite-mcp root
npm install

# Install dependencies for the dashboard
npm ci
```

### Running Locally

**Terminal 1: Start the backend server**

```bash
cd apps/gh-actions-dashboard
npm run server:dev
# Server listens on http://localhost:3000
```

**Terminal 2: Start the frontend dev server**

```bash
cd apps/gh-actions-dashboard
npm run client:dev
# Frontend available at http://localhost:5173
```

Or run both in parallel:

```bash
cd apps/gh-actions-dashboard
npm run dev
```

### Building for Production

```bash
npm run build
npm run server:start
```

## How It Works

### Backend (`server/index.ts`)

- Express server that wraps the `npm run gh-actions:check-manifest -- --json` command
- Caches results for 5 minutes to avoid excessive scanning
- Exposes two endpoints:
  - `GET /api/gh-actions/compliance` — Full compliance report
  - `GET /api/gh-actions/summary` — Quick summary stats

### Frontend (`src/App.tsx`)

- React app with Vite bundler
- Fetches compliance data every 30 seconds
- Components:
  - **Summary**: High-level metrics (total repos, compliant count, compliance rate)
  - **ComplianceTable**: Detailed table with filtering and expandable issue details
  - **FilterButtons**: Toggle between all/clean/issues views

## Data Flow

```
gh-actions-fleet.json
         ↓
npm run gh-actions:check-manifest -- --json
         ↓
Backend server (caches for 5 min)
         ↓
GET /api/gh-actions/compliance (JSON)
         ↓
React frontend (polls every 30s)
         ↓
ComplianceTable UI
```

## Environment Variables

- `PORT` — Backend port (default: 3000)
- `CACHE_TTL` — How long to cache results (hardcoded to 5 minutes)

## Deployment

The dashboard is production-ready and can be deployed as:

1. **Static frontend** — Build with `npm run build`, serve `dist/` folder via CDN
2. **Full-stack** — Deploy server + built frontend together
3. **Containerized** — Include in Docker image with Node and npm

## Future Extensions

- Webhook integration: Slack notifications on compliance changes
- GitHub App: Auto-open PRs for non-compliant repos
- Historical trends: Chart compliance over time
- Custom rules: Configure which issues matter most
