# Evaluate Muse Wonder Active Focus

Evaluation framework and loop-prevention middleware for Meta Muse Wonder and Active Focus autonomous workflows.

## Overview

Meta Muse Wonder with Active Focus introduces autonomous tool exploration. In unconstrained agentic trajectories, models can enter repeating cycles, generating hundreds of redundant turns and unexpected token burn. This package benchmarks latency and economics while providing strict deterministic guardrails to halt runaway execution.

## Key Capabilities

- Windowed cycle detector halts repeating sequences of lengths 1 through 5.
- Hard turn ceilings prevent deep runaway iteration.
- Token cost arbitrage benchmarks compare Muse Wonder against Claude Sonnet 5.5, GPT-6.1 Sol, and Claude Haiku 5.5.
- Privacy compliance checks verify Contributor Mode bypass and zero retention headers.

## Quick Start

Run the test suite:

```bash
npm test
```

Execute the evaluation benchmark via CLI:

```bash
node src/index.mjs --workload=all --guard=true
```

Import programmatically:

```javascript
import { MuseWonderEvaluationEngine, ActiveFocusLoopGuard } from './src/index.mjs';

const guard = new ActiveFocusLoopGuard({ maxTurns: 30, maxCycleRepetitions: 2 });
const engine = new MuseWonderEvaluationEngine({ guardConfig: { maxTurns: 30 } });

const benchmarkResult = engine.runBenchmark({ workloads: 'all', useGuard: true });
```

## Structure

- [src/types.mjs](file:///C:/dev/.worktrees/eval-muse-wonder/toolforge/skills/evaluate-muse-wonder-active-focus/src/types.mjs): Domain models, pricing profiles, and validation routines.
- [src/loop-guard.mjs](file:///C:/dev/.worktrees/eval-muse-wonder/toolforge/skills/evaluate-muse-wonder-active-focus/src/loop-guard.mjs): Deterministic cycle and turn limit guardrail implementation.
- [src/evaluation-engine.mjs](file:///C:/dev/.worktrees/eval-muse-wonder/toolforge/skills/evaluate-muse-wonder-active-focus/src/evaluation-engine.mjs): Scenario execution, latency profiling, and cost analysis engine.
- [tests/evaluation-engine.test.mjs](file:///C:/dev/.worktrees/eval-muse-wonder/toolforge/skills/evaluate-muse-wonder-active-focus/tests/evaluation-engine.test.mjs): Test suite verifying cycle detection, turn limits, arbitrage, and privacy checks.
