---
title: GitHub Actions Node.js 24 Compliance Guide
version: 1.0.0
date: 2026-06-03
---

# GitHub Actions Node.js 24 Compliance Guide

Complete guide to the GitHub Actions compliance enforcement system that ensures all workflows use Node.js 24 and latest GitHub Actions versions.

## System Overview

The compliance system has **four enforcement layers**:

1. **CLI Tools** — Scan and report compliance status
2. **Dashboard** — Real-time compliance metrics (React + Express)
3. **GitHub App** — Auto-fix non-compliant workflows
4. **Pre-commit Hooks** — Prevent non-compliant code locally

## What We Enforce

The system detects and prevents three violations:

### 1. Node.js Version 20

**Problem:** Workflows using `node-version: 20` instead of 24.  
**Detection:** Scan `.github/workflows/*.yml` for `node-version: 20`  
**Fix:** Auto-rewrite to `node-version: 24`

### 2. GitHub Actions v4

**Problem:** Workflows pinning to `@v4` instead of latest `@v5`.  
**Detection:** Scan for action refs matching `@v4` pattern  
**Fix:** Auto-upgrade to `@v5`

### 3. Missing Node.js Environment Variable

**Problem:** Workflows missing `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`.  
**Detection:** Check env section for the variable  
**Fix:** Add `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` to env

## Component Architecture

### Fleet Manifest

**Location:** `c:/dev/gh-actions-fleet.json`

```json
[
  { "name": "rewrite-mcp", "path": "./rewrite-mcp" },
  { "name": "cic", "path": "./projects/cic" }
]
```

Maps repository names to their local paths.

### CLI Scripts

#### `npm run gh-actions:check-manifest`

Scans all repos listed in fleet manifest.

```bash
cd c:/dev/rewrite-mcp
npm run gh-actions:check-manifest

# Output: Human-readable report
# For JSON: npm run gh-actions:check-manifest -- --json
```

#### `npm run gh-actions:slack-notify`

Posts compliance report to Slack via webhook.

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/... npm run gh-actions:slack-notify
```

**Requires:** Environment variable `SLACK_WEBHOOK_URL`

### Dashboard

**Location:** `apps/gh-actions-dashboard/`

- **Frontend:** React + Vite (Port 5173)
- **Backend:** Express (Port 3000)

**Endpoints:**
- `GET /api/gh-actions/compliance` — JSON array of repo compliance status
- `GET /api/gh-actions/summary` — Aggregated summary metrics

**Features:**
- Real-time status from fleet manifest
- Filter controls
- Compliance metrics
- 5-minute cache TTL

**Start dashboard:**
```bash
cd apps/gh-actions-dashboard
npm run dev
```

### GitHub App (Probot)

**Location:** `tools/github-app-compliance-bot.ts`

Listens to GitHub events and automatically opens PRs to fix violations.

**Capabilities:**
- Detects non-compliant workflows on `schedule.repository` and `workflow_run` events
- Generates auto-fix commits
- Opens PRs with clear descriptions
- Verifies fixes before merging

**Dependencies:** Probot 12.3.5+

## Deployment Phases (Roadmap)

### Phase 34: Compliance Framework ✅ COMPLETED

All components built, tested, installed.

### Phase 35: GitHub App Deployment (PENDING)

**Tasks:**
1. Register GitHub App on github.com
2. Configure webhook URL
3. Deploy Probot server
4. Add secrets: GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY
5. Enable on repositories

**Platforms:** Heroku, AWS Lambda, GCP Cloud Run

### Phase 36: Slack Integration (PENDING)

**Tasks:**
1. Create Slack webhook
2. Set SLACK_WEBHOOK_URL in environment
3. Schedule nightly/weekly compliance reports
4. Configure alert channels for violations

### Phase 37: CI/CD Compliance Gate (PENDING)

**Tasks:**
1. Add pre-merge compliance check to GitHub Actions
2. `npm run gh-actions:check-manifest` fails if violations found
3. Publishes report as workflow artifact
4. Blocks merge if non-compliant

### Phase 38: Monitoring & Drift (PENDING)

**Tasks:**
1. Track compliance metrics over time
2. Detect regressions (repos returning to Node 20)
3. Dashboard trends and forecasts
4. Annual audit reports

## Integration Checklist

- [ ] GitHub App registered on github.com
- [ ] Webhook URL configured
- [ ] GITHUB_APP_ID secret set
- [ ] GITHUB_APP_PRIVATE_KEY secret set
- [ ] Probot server deployed
- [ ] GitHub App enabled on rewrite-mcp
- [ ] GitHub App enabled on cic
- [ ] Slack webhook created
- [ ] SLACK_WEBHOOK_URL environment variable set
- [ ] CI/CD workflow updated with compliance gate
- [ ] Dashboard tested on localhost:3000 and localhost:5173
- [ ] Nightly compliance job scheduled
- [ ] Monitoring dashboard operational

## Testing

### Local Testing

```bash
# Test CLI scanner
cd rewrite-mcp
npm run gh-actions:check-manifest

# Test with JSON output
npm run gh-actions:check-manifest -- --json

# Test dashboard
cd apps/gh-actions-dashboard
npm run dev
# Visit http://localhost:5173
```

### GitHub App Testing

```bash
# Start Probot dev server
cd tools
npm run dev

# GitHub will send webhook events to your local server
# (requires ngrok or similar tunnel for webhook delivery)
```

## Troubleshooting

**Dashboard shows no repos**
- Check gh-actions-fleet.json exists at `c:/dev/gh-actions-fleet.json`
- Verify repo paths in manifest are correct
- Check dashboard server logs: `npm run dev` in apps/gh-actions-dashboard

**GitHub App not responding**
- Verify webhook URL is correct
- Check GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY are set
- Review GitHub App settings: Organization → Settings → Developer settings → GitHub Apps
- Check server logs for webhook delivery errors

**Slack notifications not posting**
- Verify SLACK_WEBHOOK_URL environment variable is set
- Test webhook with curl: `curl -X POST -H 'Content-type: application/json' --data '{"text":"Test"}' $SLACK_WEBHOOK_URL`
- Check webhook is for the correct Slack workspace/channel

## Files Reference

| File | Purpose |
|------|---------|
| `tools/github-app-compliance-bot.ts` | Probot GitHub App |
| `tools/package.json` | GitHub App dependencies |
| `scripts/gh-actions-check.ts` | CLI compliance scanner |
| `scripts/gh-actions-slack-notify.ts` | Slack notification sender |
| `scripts/gh-actions-manifest.ts` | Fleet manifest loader |
| `apps/gh-actions-dashboard/` | React+Express dashboard |
| `gh-actions-fleet.json` | Repository fleet manifest |

## Next Steps

1. **Phase 35:** Register the GitHub App on github.com
2. **Phase 36:** Set up Slack webhook integration
3. **Phase 37:** Add compliance gate to CI/CD
4. **Phase 38:** Enable long-term monitoring

See [CIC_MASTER_ROADMAP.md](./CIC_MASTER_ROADMAP.md#phase-34--github-actions-nodejs-24-compliance-system-complete) for phase details.
