# Phase 47 Integration Guide

This guide shows how to integrate Phase 47 (routing layer) into existing code.

## Quick Integration

### 1. In opusSonnetBenchmark.ts

Replace direct model selection with routing:

**Before:**
```typescript
const sonnet = await runRewrite("claude-sonnet-4-6", html, context);
const opus = await runRewrite("claude-opus-4-8", html, context);
```

**After:**
```typescript
import { selectModel } from "../routing/router";

const decision = await selectModel({
  taskType: "rewrite",
  qualityTarget: 8.0,
  maxCostUsd: 0.15,
  dailyBudgetUsd: 10.00,
});

const result = await runRewrite(decision.chosen.model, html, context);
console.log(`[routing] Selected ${decision.chosen.model}: ${decision.reason}`);
```

### 2. In CIC Orchestrator

Use routed calls for all agent API invocations:

**Before:**
```typescript
const response = await anthropicClient.messages.create({
  model: "claude-opus-4-8",
  messages: agentMessages,
});
```

**After:**
```typescript
import { routedAnthropicCall } from "../benchmarks/routing/interceptor";

const response = await routedAnthropicCall({
  client: anthropicClient,
  routing: {
    taskType: "analysis", // or "generation", "chat", etc.
    qualityTarget: 8.0,
    dailyBudgetUsd: 10.00,
  },
  messages: agentMessages,
  source: "cli:claude-code",
  metadata: { agentName: "search-agent", phase: 47 },
});

console.log(`Routed to ${response.decision.chosen.model}`);
```

### 3. Start Cost Agent (app startup)

In your main app file:

```typescript
import { startCostAgent } from "../benchmarks/routing/agent";

// On app startup
const stopCostAgent = startCostAgent({
  checkIntervalMs: 60_000,      // Check spend every 60 seconds
  dailyBudgetUsd: 10.00,
  hourlyBudgetUsd: 2.00,
  shiftToLocalThreshold: 0.7,   // Prefer Ollama when 70%+ spent
  onEvent: (event) => {
    if (event.type === "budget-warning") {
      console.warn(`⚠️ Budget alert: $${event.spendUsd.toFixed(2)} ${event.level}`);
      // Send to monitoring system, Slack, etc.
    } else if (event.type === "prefer-local") {
      console.log(`🔄 ${event.reason}`);
      // Update routing preferences in UI
    }
  },
});

// On app shutdown
process.on("SIGTERM", () => {
  stopCostAgent();
});
```

## Advanced: Custom Routing Policies

### Override task candidates

Edit `policy.ts` to customize which models are available for each task:

```typescript
export const TASK_CONFIG = {
  rewrite: {
    estimatedInputTokens: 3000,
    estimatedOutputTokens: 3000,
    candidates: [
      // Your custom list
      { provider: "anthropic", model: "claude-opus-4-8", estimatedQuality: 9.5 },
      // ...
    ],
  },
  // ...
};
```

### Override budget constraints

```typescript
const decision = await selectModel({
  taskType: "generation",
  qualityTarget: 7.0,          // Lower = cheaper models OK
  maxCostUsd: 0.02,            // Strict per-request limit
  dailyBudgetUsd: 2.00,        // Tight daily budget
});
```

### Manual preference overrides

Force a specific model for testing:

```typescript
import { setTaskTypeOverride, clearTaskTypeOverride } from "../routing/agent";

// During development: always use Sonnet for rewrite tests
setTaskTypeOverride("rewrite", "claude-sonnet-4-6");

// Later: back to automatic routing
clearTaskTypeOverride("rewrite");
```

## Observability

### Check routing decisions in logs

Each routed call logs to Phase 48's `costLog.json`:

```bash
npm run cost:reports    # Generate reports with routing metadata
npm run cost:helm       # Check today's costs and model distribution
```

### View helm.json for live dashboard

```bash
cat benchmarks/costs/reports/helm.json | jq '.today'
```

Example output:
```json
{
  "totalRealUsd": 2.50,
  "totalImpliedUsd": 8.75,
  "byProvider": {
    "anthropic": { "realUsd": 2.50, "impliedUsd": 8.75 }
  }
}
```

### Monitor cost agent preferences

```bash
cat benchmarks/routing/.agent-prefs.json | jq .
```

Example:
```json
{
  "preferLocal": true,
  "preferCheaperModels": true,
  "taskTypeOverrides": {
    "rewrite": "",
    "analysis": "",
    "generation": "claude-haiku-4-5",
    "chat": "claude-haiku-4-5"
  }
}
```

## Testing

### Dry run (no API call)

Test routing decisions without incurring costs:

```typescript
const { decision } = await routedAnthropicCall({
  client,
  routing: { taskType: "rewrite", qualityTarget: 8.0 },
  messages: [...],
  dryRun: true, // Don't execute API call
});

console.log(`Would route to: ${decision.chosen.model}`);
console.log(`Cost estimate: $${decision.costEstimateUsd.toFixed(4)}`);
```

### Unit test helper

```typescript
import { selectModel } from "../benchmarks/routing/router";

describe("Phase 47 routing", () => {
  it("selects cheaper model when budget is tight", async () => {
    const decision = await selectModel({
      taskType: "generation",
      qualityTarget: 7.0,
      dailyBudgetUsd: 0.50, // Very tight
    });

    // Expect cheaper model (Haiku, not Opus)
    expect(decision.chosen.model).toBe("claude-haiku-4-5");
  });

  it("selects high-quality model when budget allows", async () => {
    const decision = await selectModel({
      taskType: "rewrite",
      qualityTarget: 9.0,
      dailyBudgetUsd: 100.0, // Generous
    });

    // Expect premium model (Opus)
    expect(decision.chosen.model).toBe("claude-opus-4-8");
  });
});
```

## Troubleshooting

### Router returns same model regardless of budget

**Cause:** No Phase 48 cost data yet. Helm.json doesn't exist.

**Fix:** Generate some costs first:
```bash
npm run bench:opus-sonnet   # Run benchmark
npm run cost:helm           # Generate helm.json
```

### Cost agent not emitting events

**Cause:** Agent preferences file (.agent-prefs.json) may be stale.

**Fix:** Delete and restart:
```bash
rm benchmarks/routing/.agent-prefs.json
# Restart app; agent will recreate it
```

### Routed calls not being logged

**Cause:** Phase 48 cost directory doesn't exist.

**Fix:** Create it manually:
```bash
mkdir -p benchmarks/costs
```

## Migration Checklist

- [ ] Install Phase 47 files (policy.ts, router.ts, interceptor.ts, agent.ts)
- [ ] Update opusSonnetBenchmark.ts to use routing
- [ ] Add cost agent startup to app main()
- [ ] Update CIC orchestrator to use routedAnthropicCall()
- [ ] Configure budget constraints in policy.ts
- [ ] Add cost reporting to CI/CD pipeline
- [ ] Monitor Helm dashboard during test runs
- [ ] Tune task candidates based on quality observations
- [ ] Document custom routing policies for team

## Performance Impact

Phase 47 adds minimal overhead:

- **Router decision:** ~1ms (reads helm.json, scores candidates)
- **Logging:** ~2ms (appends to costLog.json)
- **Agent check:** Runs in background; configurable interval

Total per-request: ~3ms overhead.

## Cost Savings Potential

Based on typical usage patterns:

- **Routing low-stakes tasks to cheaper models:** 30–40% savings
- **Deferring to Ollama when budget tight:** 50–70% savings
- **Avoiding overage charges:** 100% savings on exceeding allocations

Expected outcome: **20–30% reduction in LLM API spend** while maintaining quality targets.
