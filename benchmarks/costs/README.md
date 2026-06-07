# Cost Intelligence System — Phase 48

This system tracks all LLM usage across providers and pricing models, computing both real costs and implied subscription-based costs for Phase 47 (usage-aware routing).

## Overview

- **Real cost:** What you actually pay (benchmarks + API overages)
- **Implied cost:** Estimated cost of dev usage under subscription allocation
- **Cost models:** subscription, direct, overage, free, local
- **Providers:** Anthropic, Google, Microsoft, Ollama

## Files

- **`system.ts`** — Central logger (`logCost()`, `logAnthropicCall()`, etc.)
- **`models.ts`** — Provider pricing constants + cost calculation
- **`subscriptions.ts`** — Subscription tiers + implied rate helpers
- **`reports/generate.ts`** — Daily/weekly/monthly report generation
- **`reports/helm.ts`** — Live Helm dashboard artifact

## Logging Usage

### In benchmark code:

```typescript
import { logAnthropicCall } from "./benchmarks/costs/system";

const res = await client.messages.create({ /* ... */ });

logAnthropicCall({
  model: "claude-sonnet-4-6",
  source: "benchmark",
  inputTokens: res.usage.input_tokens,
  outputTokens: res.usage.output_tokens,
  costModel: "direct",
  metadata: { site: "hvac_fl", taskType: "rewrite", phase: 48 },
});
```

### For dev usage:

```typescript
logAnthropicCall({
  model: "claude-opus-4-8",
  source: "api:direct",  // or "cli:claude-code", "cli:copilot"
  inputTokens: 1500,
  outputTokens: 2400,
  costModel: "subscription",  // or "direct" if pay-per-token
  metadata: { command: "anthropic-api-test" },
});
```

## Reports

Reports are generated automatically at the end of benchmark runs, or manually:

```bash
npm run cost:reports   # daily + weekly + monthly
npm run cost:helm      # live dashboard artifact
```

### Report locations:

```
benchmarks/costs/reports/
├── daily/2026-06-04.json         # Today's breakdown
├── weekly/2026-06-04.json        # Last 7 days
├── monthly/2026-06.json          # Current month
└── helm.json                      # Live dashboard (today)
```

### Report structure:

```json
{
  "date": "2026-06-04",
  "totalRealUsd": 2.34,
  "totalImpliedUsd": 12.56,
  "byProvider": {
    "anthropic": { "realUsd": 2.34, "impliedUsd": 10.50 },
    "google": { "realUsd": 0.00, "impliedUsd": 2.06 }
  },
  "dev": { "realUsd": 0.00, "impliedUsd": 4.25 },
  "prod": { "realUsd": 2.34, "impliedUsd": 8.31 }
}
```

## Phase 47 Integration

Phase 47 (usage-aware router) consumes:

- `costLog.json` — raw transaction log
- `reports/helm.json` — today's aggregated costs
- `reports/daily/*.json` — historical trends

Signals exposed:
- `costPerProvider` — real spend by provider
- `costPerModel` — real spend by model
- `devVsProdSpend` — dev allocation vs production overage
- `localSavingsEstimate` — Ollama vs cloud cost delta

Use these to:
- Prefer cheaper models when quality acceptable
- Avoid overage when spend spikes
- Route low-stakes to Ollama/local
- Enforce daily caps

## Configuration

Edit `subscriptions.ts` to adjust:
- Monthly subscription fees
- Monthly token allocations
- Subscription tier assignment

Edit `models.ts` to update:
- Provider pricing (per MTok)
- New models

## Notes

- All timestamps are ISO8601 (UTC)
- Cost log is append-only (immutable audit trail)
- Reports regenerate on each run (idempotent)
- Ollama "implied cost" = what cloud equivalent would cost (savings = implied - local compute)
