---
skill_name: evaluate-muse-wonder-active-focus
version: 1.0.0
name: Evaluate Muse Wonder Active Focus
category: evaluation
description: Evaluates Meta Muse Wonder API latency, retry behavior, token economics, and enforces Active Focus loop guardrails
author: soren
tags: ["evaluation", "benchmarking", "loop-guard", "active-focus", "muse-wonder"]
---
# Evaluate Muse Wonder Active Focus

Evaluates Meta Muse Wonder latency, retry behavior, token economics, and loop prevention fidelity across structured and unconstrained workflows.

## Metadata

- **ID:** evaluate-muse-wonder-active-focus
- **Version:** 1.0.0
- **Category:** evaluation
- **Runtime:** node
- **Entrypoint:** [src/index.mjs](file:///C:/dev/.worktrees/eval-muse-wonder/toolforge/skills/evaluate-muse-wonder-active-focus/src/index.mjs)

## Core Components

- [`ActiveFocusLoopGuard`](file:///C:/dev/.worktrees/eval-muse-wonder/toolforge/skills/evaluate-muse-wonder-active-focus/src/loop-guard.mjs) monitors tool invocations, detects repeating cycles of length 1 through 5, bounds consecutive retries, and halts runaway iteration at turn thresholds.
- [`MuseWonderEvaluationEngine`](file:///C:/dev/.worktrees/eval-muse-wonder/toolforge/skills/evaluate-muse-wonder-active-focus/src/evaluation-engine.mjs) runs standard multi-turn workloads, computes latency distributions, calculates pricing arbitrage across four model profiles, and validates privacy compliance.
- [`calculateCost`](file:///C:/dev/.worktrees/eval-muse-wonder/toolforge/skills/evaluate-muse-wonder-active-focus/src/types.mjs) evaluates exact transaction costs based on token consumption, cache hits, and search queries.

## Usage

Programmatic execution:

```javascript
import { MuseWonderEvaluationEngine, ActiveFocusLoopGuard } from './src/index.mjs';

const engine = new MuseWonderEvaluationEngine();
const report = engine.runBenchmark({
  workloads: 'all',
  useGuard: true
});

console.log(report.recommendation.verdict);
```

Command line execution:

```bash
node src/index.mjs --workload=all --guard=true
```

## Workload Scenarios

1. `customer_support_multi_turn`: 4 turn customer inquiry, order retrieval, policy evaluation, and refund execution.
2. `constrained_scheduling`: 5 turn calendar slot query, conflict check, resource booking, invite dispatch, and notification.
3. `ecommerce_order_fulfillment`: 4 turn inventory reservation, tax calculation, payment authorization hold, and shipping label generation.
4. `unconstrained_wander_adversarial`: Multi-turn open exploration loop demonstrating runaway risk without guardrail interception.
