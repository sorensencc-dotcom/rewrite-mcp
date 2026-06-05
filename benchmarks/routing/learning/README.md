# Autonomous Routing Policy Engine (ARPE) — Phase 50

ARPE is a self-evolving, self-optimizing intelligence layer for routing requests to LLM models in Rewrite Labs and Cast Iron Charlie (CIC). It learns optimal routing policies from historical logs of cost, quality, response latency, and provider reliability.

## Architecture & File Layout

```text
benchmarks/
  routing/
    learning/
      features.ts          # Feature extraction from cost/telemetry logs
      evaluator.ts        # Model performance evaluation and scoring
      optimizer.ts        # Gradient-free policy optimizer (hill climbing)
      policyStore.ts      # Policy persistence, versioning, and diffing
      trainer.ts          # Nightly training run coordinator
      README.md           # This documentation
```

---

## 1. Feature Extraction (`features.ts`)

ARPE processes raw entries from `costLog.json` to compute five classes of features:
- **Cost Features**: Average cost per model per task type, cost variance, spikes (cost > 1.5x average), and implied-to-real cost ratios.
- **Quality Features**: Average observed quality score per model per task type, variance, and base quality metrics.
- **Usage Features**: Average token counts per request, fallback rate (routing deviations), reliability (API call success rate), and volume.
- **Temporal Features**: Hour-of-day and day-of-week spending distributions.
- **Local Compute Features**: Local compute savings (actual Ollama spend vs cloud equivalent) and local quality penalty (cloud avg quality minus local avg quality).

---

## 2. Model Performance Evaluation (`evaluator.ts`)

Computes a performance score for each model under a specific task type using a weighted combination of quality, cost, and reliability:

$$\text{Score} = (\text{Avg Quality} \times W_Q) - (\text{Avg Cost} \times W_C) + (\text{Reliability} \times W_R)$$

*Default Weights*: $W_Q = 4.0$, $W_C = 100.0$, $W_R = 5.0$. Latency is tracked and averaged per model (falling back to provider-specific default latencies if log entries have no latency telemetry).

---

## 3. Policy Optimization (`optimizer.ts`)

Uses **gradient-free hill-climbing search** to optimize policy vectors per task type:
1. Replays historical logs on a simulated policy candidate to evaluate cost, quality, fallback events, and cost constraint violations.
2. Computes policy fitness:
   $$\text{Fitness} = (\text{Simulated Quality} \times 10) - (\text{Simulated Cost} \times 300) - (\text{Fallback Rate} \times 2) - (\text{Violation Rate} \times 15)$$
3. Iteratively mutates policy parameters (adjusting quality targets, request budget caps, local preference, provider weights, and swapping preferred model rank orders) to find the configuration maximizing fitness.

---

## 4. Policy Storage & Versioning (`policyStore.ts`)

- Stores versioned policies as `policy-v{1,2,...}.json` under `benchmarks/routing/learning/policies/`.
- Maintains a symlinked/copied `policy-active.json` which represents the latest learned policy configuration.
- Computes policy diffs and drift across versions to display drift metrics on the Helm Dashboard.

---

## 5. Nightly/Manual Trainer (`trainer.ts`)

The trainer orchestrates the nightly learning loop:
1. Loads cost logs via `readCostLog()`.
2. Extracts features and evaluates model performance.
3. Optimizes policy vectors for all task types (`rewrite`, `analysis`, `generation`, `chat`).
4. Saves new policy versions and active references.
5. Regenerates daily/weekly reports and updates the dashboard data.

### How to run training manually:
```bash
npx ts-node benchmarks/routing/learning/trainer.ts
```
Or use the HELM Command Bar: `routing-train`

---

## 6. Model Router Integration (`router.ts`)

The core router (`selectModel`) dynamically loads `policy-active.json`. If present:
- Applies learned provider weights to model candidate scores.
- Applies learned local preference boosts to Ollama models.
- Applies learned rankings (preferred order) to resolve score ties.
- Uses learned per-request maximum cost limits.
- Automatically falls back to static `TASK_CONFIG` rules if no active policies have been learned yet.
