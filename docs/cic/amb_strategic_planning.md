# AMB Strategic Planning Engine — Technical Specification

## Overview

The **Autonomous Meta-Brain (AMB) Strategic Planning Engine** enables CIC to evolve strategically across multiple runs rather than reacting to individual anomalies. It detects cross-run patterns, scores intents by strategic value, groups them into coherent bundles, and generates multi-step plans.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AMB Orchestrator (ambRunner.ts v1.1.0)          │
│                                                                     │
│  ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Priority  │→│  Intent     │→│   Policy      │→│  Governance   │ │
│  │ Engine    │  │ Synthesizer │  │ Interpreter   │  │  Gate        │ │
│  └──────────┘  └────────────┘  └──────────────┘  └──────────────┘ │
│        ↓                                                ↓          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  STRATEGIC LAYER (Milestone 4)                │  │
│  │                                                              │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │  │
│  │  │  Memory     │→│  Strategic  │→│  Intent    → Strategic  │ │  │
│  │  │  Store      │  │  Scorer    │  │  Bundler     Planner   │ │  │
│  │  └────────────┘  └────────────┘  └────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│        ↓                                                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │             Evolution Loop (loopRunner.ts)                    │  │
│  │  Audit → Proposals → Simulations → Ranking → Apply → Log    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Cross-Run Memory Store (`ambMemoryStore.ts`)

**Purpose:** Accumulate operational history across AMB runs.

**Data collected per run:**
- Intent records (type, risk, status, strategic score)
- Proposal outcomes (applied/failed, impact metrics)
- MAS health snapshot (error rate, timeout rate, backlog, agent health)
- Drift metrics (tenant drift index, graph entropy)
- RL impact metrics (lighthouse improvement, conversion rate)

**API:**
| Method | Returns | Description |
|--------|---------|-------------|
| `loadLatestSnapshot()` | `AmbMemorySnapshot \| null` | Most recent memory file |
| `recordRun(params)` | `AmbMemorySnapshot` | Merge new data and persist |
| `getIntentHistory(lookback?)` | `AmbMemoryIntentRecord[]` | Last N intent records |
| `getProposalSuccessRate()` | `number` | Applied / total ratio |
| `getDriftTrend(lookback?)` | `number[]` | Drift values over time |
| `getMasStabilityTrend(lookback?)` | `number[]` | Error rates over time |

**Storage:** `projects/cic/evolution/data/amb/memory/memory_<timestamp>.json`

---

### 2. Strategic Scoring Engine (`ambStrategicScorer.ts`)

**Purpose:** Rank intents by strategic value, not just raw signal priority.

**Formula:**
```
strategic_score = impact / (risk × operator_burden)
```

Where:
- **impact** = sum of `desired_outcomes.metrics` × historical boost factor
- **risk** = `{ low: 1, medium: 2, high: 3 }`
- **operator_burden** = `1 + required_operator_actions.length`

**Historical Boost:**
- Queries memory for past proposals of the same `intent_type`
- Computes success rate (applied and not failed / total)
- Boost range: `0.5` (all failed) → `1.5` (all succeeded)
- Default: `1.0` (no history)

**API:**
| Method | Returns | Description |
|--------|---------|-------------|
| `scoreIntent(intent)` | `number` | Strategic score for one intent |
| `scoreBundle(bundle, intents)` | `number` | Aggregate score for a bundle |
| `rankIntents(intents)` | `(AmbIntentArtifact & { strategic_score })[]` | Sorted desc |
| `computeHistoricalBoost(intentType)` | `number` | Boost factor from memory |

---

### 3. Intent Bundler (`ambIntentBundler.ts`)

**Purpose:** Group related intents into coherent execution bundles.

**Bundle Types:**

| Bundle Type | Domain Trigger | Description |
|------------|---------------|-------------|
| `graph_cleanup` | `ckg_graph` | CKG stale node reduction and entropy compression |
| `mas_stability` | `mas_topology` | Agent routing optimization and consensus improvement |
| `tenant_redesign` | `rl_fusion` | Rewrite Labs fusion and conversion optimization |
| `planner_tuning` | `cic_config` | Heuristic refinement and configuration optimization |

**Bundle Properties:**
- `aggregate_priority_score` = max of member priorities
- `aggregate_risk_class` = max of member risk classes
- `estimated_impact` = sum of all member desired_outcomes metrics

**API:**
| Method | Returns | Description |
|--------|---------|-------------|
| `bundleIntents(runId, intents)` | `IntentBundleArtifact[]` | Grouped bundles sorted by priority |
| `classifyBundleType(intent)` | `BundleType` | Domain → bundle type mapping |

---

### 4. Strategic Planner (`ambStrategicPlanner.ts`)

**Purpose:** Generate multi-step plans across future evolution runs.

**Pattern Detection:**

| Pattern | Threshold | Severity |
|---------|----------|----------|
| `recurring_drift` | Avg drift > 0.2 over 5 runs | medium (> 0.5 = high) |
| `persistent_mas_instability` | Avg error rate > 0.03 over 5 runs | medium (> 0.06 = high) |
| `rl_plateau` | Flat RL metrics across 2+ runs | low |
| `stale_graph` | Graph intent block rate > 30% | medium |

**Step Sequencing (priority order):**
1. **Graph distillation** — address drift first
2. **MAS stabilization** — resolve infrastructure instability
3. **Planner tuning** — refine heuristics after cleanup
4. **Tenant redesign** — break RL plateau with fresh redesign

**Plan Horizon:** Up to 3 future runs (configurable).

**Impact Projection:**
- `drift_reduction` — from graph cleanup + planner tuning metrics
- `stability_gain` — from MAS consensus improvement metrics
- `rl_value` — from conversion rate lift metrics
- Applies conservative 0.8× factor when memory shows improving drift trend

**API:**
| Method | Returns | Description |
|--------|---------|-------------|
| `generatePlan(runId, intents, bundles, memory)` | `StrategicPlanArtifact` | Full strategic plan |
| `detectPatterns(memory)` | `DetectedPattern[]` | Cross-run pattern analysis |
| `sequenceSteps(patterns, bundles, intents)` | `PlannedIntent[]` | Ordered execution steps |

---

## Type Definitions

All types defined in `evolution/src/types/ambStrategic.ts`:

- **`AmbMemorySnapshot`** — Full cross-run memory with intent, proposal, MAS, drift, and RL histories
- **`AmbMemoryIntentRecord`** — Single intent entry with status and strategic score
- **`AmbMemoryProposalRecord`** — Proposal outcome (applied/failed/impact)
- **`IntentBundleArtifact`** — Domain-grouped bundle with aggregate priority/risk
- **`StrategicPlanArtifact`** — Multi-step plan with horizon, impact projections, and policy constraints
- **`PlannedIntent`** — Individual step in a strategic plan

---

## Artifact Outputs

| Artifact | Location | Written By |
|----------|----------|-----------|
| Strategic plan | `data/amb/strategic/strategic_plan_<run_id>.json` | ambRunner |
| Intent bundles | `data/amb/strategic/intent_bundles_<run_id>.json` | ambRunner |
| Memory snapshot | `data/amb/memory/memory_<timestamp>.json` | ambMemoryStore |
| Governance report | `data/evolution/amb/logs/amb_log_<run_id>.json` | ambRunner |
| Intent artifacts | `data/evolution/amb/intents/amb_intents_<run_id>.json` | ambRunner |

---

## Test Coverage

**File:** `tests/evolution/ambStrategic.test.ts` — 27 tests

| Describe Block | Tests | Coverage |
|---------------|-------|----------|
| AmbMemoryStore | 6 | Write/read, accumulation, lookback, success rate, trends |
| AmbStrategicScorer | 5 | Risk mapping, burden effect, impact scaling, historical boost, ranking |
| AmbIntentBundler | 5 | Domain classification (4 types), grouping, aggregates, empty input |
| AmbStrategicPlanner | 5 | Plan generation, drift detection, MAS detection, sequencing, impact fields |
| E2E Strategic Pipeline | 3 | Full pipeline, scoring influence, memory pattern accumulation |

**Additional evolution tests:** 48 (amb-gates: 10, evolutionPolicy: 38)

**Total evolution test suite: 75/75 passing**
