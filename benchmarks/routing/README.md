# Usage-Aware Routing Layer — Phase 47

This layer sits on top of Phase 48 (Cost Intelligence) and makes **cost-aware, usage-aware routing decisions** for all LLM API calls in Rewrite Labs and CIC.

## Overview

Phase 47 = **three sublayers**:

1. **47A — Model Router** (`router.ts`): Chooses the best model for a task given cost + quality constraints.
2. **47B — Request Interceptor** (`interceptor.ts`): Wraps API calls to enforce budgets and log costs via Phase 48.
3. **47C — Cost Agent** (`agent.ts`): Background worker that monitors spend, adjusts preferences, and emits budget alerts.

## Quick Start

### Select a model for a task

```typescript
import { selectModel } from "./benchmarks/routing/router";

const decision = await selectModel({
  taskType: "rewrite",
  qualityTarget: 8.0,       // 1–10, min quality acceptable
  maxCostUsd: 0.10,         // max per request
  dailyBudgetUsd: 5.00,     // max per day
});

console.log(decision.chosen.model);      // "claude-sonnet-4-6" or "gemini-2.0-pro"
console.log(decision.reason);            // "quality=8.5 penalty=0.00 score=8.50 cost=$0.0045"
console.log(decision.alternatives);      // [ { provider, model, estimatedQuality }, ... ]
```

### Routed API call

```typescript
import { routedAnthropicCall } from "./benchmarks/routing/interceptor";
import { Anthropic } from "@anthropic-ai/sdk";

const client = new Anthropic();

const result = await routedAnthropicCall({
  client,
  routing: {
    taskType: "rewrite",
    qualityTarget: 8.0,
    maxCostUsd: 0.10,
    dailyBudgetUsd: 5.00,
  },
  messages: [{ role: "user", content: "Rewrite this HTML..." }],
  source: "api:direct",
  metadata: { site: "example.com" },
});

console.log(result.decision.chosen.model);        // routed model
console.log(result.content);                      // API response
```

### Start background cost agent

```typescript
import { startCostAgent } from "./benchmarks/routing/agent";

const stop = startCostAgent({
  checkIntervalMs: 60_000,      // check every 60s
  dailyBudgetUsd: 5.00,
  hourlyBudgetUsd: 1.00,
  shiftToLocalThreshold: 0.7,   // 70% of budget → prefer Ollama
  onEvent: (event) => {
    if (event.type === "budget-warning") {
      console.warn(`Budget alert: $${event.spendUsd.toFixed(2)} spent`);
    } else if (event.type === "prefer-local") {
      console.log(event.reason);
    }
  },
});

// Later, stop the agent
stop();
```

## How it Works

### 47A — Model Router

1. **Read today's spend** from Phase 48's `helm.json`.
2. **Get task candidates**: task-specific model options (Opus, Sonnet, Gemini, Ollama).
3. **Estimate cost** for each candidate (input + output tokens × pricing).
4. **Apply budget penalties**:
   - Per-request cost exceeds `maxCostUsd` → hard penalty (-2.0)
   - Daily spend would exceed `dailyBudgetUsd` → penalty (-1.5)
   - Daily budget running low (< 20%) → penalty (-0.5)
5. **Score each model**: `quality - penalty`
6. **Return best option** + alternatives and reasoning.

### 47B — Request Interceptor

1. **Call router** to get routing decision.
2. **Execute API call** with chosen model/provider.
3. **Log cost** via Phase 48 system (logAnthropicCall, logGeminiCall, etc.).
4. **Return result** with decision metadata attached.

Helper for Anthropic:
```typescript
await routedAnthropicCall({
  client,              // Anthropic client instance
  routing: {...},      // RoutingContext (taskType, qualityTarget, budgets)
  messages: [...],     // API messages
  source: "...",       // "api:direct" | "cli:claude-code" | "benchmark"
  metadata: {...},     // Custom metadata (site, command, etc.)
  dryRun: false,       // If true, return decision without executing call
});
```

### 47C — Cost Agent

Runs in background (configurable interval):

1. **Regenerate Phase 48 reports** (daily, weekly).
2. **Read today's spend** from Helm.
3. **Check against budgets**:
   - If over daily → emit `budget-warning` + set `preferLocal = true`
   - If 70%+ of daily → emit `switch-to-cheaper` + set `preferCheaperModels = true`
4. **Save preferences** to `.agent-prefs.json`.
5. **Wait and repeat**.

Preferences are consumed by router/interceptor to adjust candidate ordering.

## Files

```
benchmarks/routing/
├── policy.ts         # Types, task configs, defaults
├── router.ts         # 47A — model selection logic
├── interceptor.ts    # 47B — API call wrapper
├── agent.ts          # 47C — background cost monitor
├── .agent-prefs.json # Generated; agent preferences (gitignore)
└── README.md         # This file
```

## Task Types & Candidates

Defined in `policy.ts`:

### `rewrite` (website/HTML redesign)
- Quality target: typically 8–9
- Token estimate: 3000 input + 3000 output
- Candidates: Opus (9.5) → Sonnet (8.5) → Gemini (8.0) → Ollama (6.5)

### `analysis` (document understanding, data extraction)
- Quality target: typically 8–9
- Token estimate: 2000 input + 1500 output
- Candidates: Opus (9.5) → Sonnet (8.5) → Gemini (8.0) → Ollama (6.0)

### `generation` (content creation, synthesis)
- Quality target: typically 7–8
- Token estimate: 500 input + 2000 output
- Candidates: Sonnet (8.5) → Gemini Flash (7.5) → Haiku (7.0) → Ollama (5.5)

### `chat` (conversation, Q&A)
- Quality target: typically 7–8
- Token estimate: 800 input + 500 output
- Candidates: Sonnet (8.5) → Gemini Flash (7.5) → Haiku (7.0) → Ollama (5.0)

## Pricing & Cost Estimates

Uses Phase 48's `PROVIDER_PRICING` constants:

- **Anthropic**: Opus $15/$60 MTok, Sonnet $3/$15 MTok, Haiku $0.8/$4 MTok
- **Google**: Gemini 2.0 Pro $10/$40 MTok, 1.5 Pro $7/$28, Flash $0.75/$3
- **Microsoft**: GPT-4o $5/$15 MTok, GPT-4-turbo $10/$30
- **Ollama**: local compute (estimated as free; Helm tracks cloud equivalent for comparison)

## Integration Points

### With Phase 48

- **Read**: `helm.json` (today's spend) and `daily/YYYY-MM-DD.json` (historical)
- **Write**: Cost logs via `logAnthropicCall()`, `logGeminiCall()`, `logOllamaCall()`
- Cycle: Router reads costs → Interceptor logs new costs → Agent refreshes reports

### With Rewrite Labs / CIC

Replace direct API calls with `routedAnthropicCall()`:

```typescript
// Before
const res = await client.messages.create({ model: "claude-opus-4-8", ... });

// After
const res = await routedAnthropicCall({
  client,
  routing: { taskType: "rewrite", qualityTarget: 8.0, ... },
  messages: [...],
});
```

Router will automatically select best model; cost is logged; budget is enforced.

## Configuration

### Edit `policy.ts` to adjust:

- Task candidates and token estimates
- Quality scores per model
- Default budget constraints

### Start cost agent in main app:

```typescript
import { startCostAgent } from "./benchmarks/routing/agent";

// In app startup
const stopAgent = startCostAgent({
  checkIntervalMs: 60_000,
  dailyBudgetUsd: 10.00,
  onEvent: (event) => {
    if (event.type === "budget-warning") {
      // Send alert to monitoring system
    }
  },
});

// On app shutdown
stopAgent();
```

## Examples

### Example 1: Smart model selection

```typescript
const decision = await selectModel({
  taskType: "generation",
  qualityTarget: 7.0,       // Lower threshold = cheaper models OK
});

// Might return: claude-sonnet-4-6 if budget is tight
// Or: claude-opus-4-8 if budget allows
```

### Example 2: Per-request budget

```typescript
const result = await routedAnthropicCall({
  client,
  routing: {
    taskType: "rewrite",
    qualityTarget: 8.0,
    maxCostUsd: 0.05,       // Don't spend more than 5¢ per site
    dailyBudgetUsd: 5.00,
  },
  messages: [...],
});

// If best model would cost > $0.05, router picks cheaper alternative
```

### Example 3: Dry run (test routing decision without API call)

```typescript
const { decision } = await routedAnthropicCall({
  client,
  routing: { ... },
  messages: [...],
  dryRun: true,    // Don't execute
});

console.log("Would use:", decision.chosen.model);
console.log("Cost estimate:", decision.costEstimateUsd);
```

## Notes

- All timestamps are UTC / ISO8601
- Cost estimates use token counts from Phase 48's PROVIDER_PRICING
- Ollama is always "free" (no API cost); Helm tracks cloud equivalent for comparison
- Agent preferences (`.agent-prefs.json`) persist across runs; cleared when spend drops below threshold
- Router scores are deterministic; no randomness (reproducible decisions)

## Next Steps

1. Wire Phase 47 into rewrite labs benchmark (opusSonnetBenchmark.ts)
2. Integrate into CIC orchestrator for all agent API calls
3. Add Helm dashboard view showing routing decisions + budget status
4. Monitor performance: does cost-aware routing save money without sacrificing quality?
