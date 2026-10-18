# Meta Muse Wonder API and Active Focus Evaluation Report

Detailed evaluation covering latency benchmarks, retry patterns, loop anomalies, and token economics across standard business workflows.

## Executive Summary

Meta Muse Wonder provides strong multi-turn reasoning and integrated tool orchestration via Active Focus. However, unconstrained agentic workflows reveal significant operational risks. Without external guardrails, exploratory trajectories can devolve into tight alternating loops or exhaustive search wander. In developer tests without termination limits, unconstrained wander reached 792 turns before manual cancellation.

## Latency Profile

Evaluation benchmarks measured Time to First Token (TTFT) and token generation velocity across four standard scenarios.

| Workload Scenario | TTFT (ms) | Tokens / Sec | Duration (ms) | Turn Count | Guard Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Customer Support Multi-Turn | 380 | 48.0 | 1200 | 4 | HEALTHY |
| Constrained Scheduling | 350 | 52.0 | 950 | 5 | HEALTHY |
| E-Commerce Order Fulfillment | 420 | 45.0 | 1400 | 4 | HEALTHY |
| Adversarial Wander (Guarded) | 440 | 42.5 | 2600 | 4 | TRIPPED |
| Adversarial Wander (Unguarded) | 440 | 42.5 | 39000+ | 60+ | RUNAWAY |

Structured, narrow-domain workflows complete within 950 to 1400 milliseconds. Open-ended exploration workflows experience dramatic latency inflation once cyclic loops form.

## Retry and Looping Behavior

Active Focus features internal retry logic when tool schemas fail or when retrieval yields partial matches. The evaluation revealed two failure modes.

### 1. Alternating 2-Cycle and 3-Cycle Traps

When search results return ambiguous results, the model alternates between query formulation and page fetching using equivalent query variants. The internal policy does not recognize the lack of epistemic progress, resulting in repeated identical requests.

### 2. High-Turn Runaway Exploration

When tasks lack explicit stop criteria, Active Focus attempts comprehensive domain coverage. The observed 792-turn runaway exploration occurred during open-ended research queries. The model continued to query related articles without terminating.

The [`ActiveFocusLoopGuard`](file:///C:/dev/.worktrees/eval-muse-wonder/toolforge/skills/evaluate-muse-wonder-active-focus/src/loop-guard.mjs) halts this failure mode at turn 4 for 2-cycles and turn 6 for 3-cycles. The hard ceiling terminates any process exceeding 30 turns.

## Token Economics and Cost Arbitrage

Pricing models evaluated:
- Meta Muse Wonder: $4.00 / 1M input, $20.00 / 1M output, $0.20 / 1M cache read, $2.50 / 1k web search
- Claude Sonnet 5.5: $3.00 / 1M input, $15.00 / 1M output
- GPT-6.1 Sol: $5.00 / 1M input, $25.00 / 1M output
- Claude Haiku 5.5: $0.10 / 1M input, $0.40 / 1M output

### Benchmark Economics Comparison

For a representative 1,000,000 input tokens, 100,000 output tokens, 500,000 cache reads, and 2,000 web searches workload:

| Model | Cost (USD) | Relative to Muse Wonder |
| :--- | :--- | :--- |
| Meta Muse Wonder | $11.10 | 1.00x (Baseline) |
| Claude Sonnet 5.5 | $4.50 | 0.41x (59% cheaper) |
| GPT-6.1 Sol | $7.50 | 0.68x (32% cheaper) |
| Claude Haiku 5.5 | $0.14 | 0.01x (98% cheaper) |

Web search surcharges ($2.50 per 1,000 requests) and higher output rates ($20.00 per 1M) significantly elevate Muse Wonder total transaction costs compared to Claude Sonnet 5.5.

## Data Privacy Audit

Meta API contracts include Contributor Mode defaults that may ingest client prompt data for foundation model training. Rewrite Labs privacy standards require explicit bypass flags.

Verification requirements:
- Header `X-Meta-Contributor-Mode: bypass` must be present on every API invocation.
- Header `X-Meta-Data-Retention: zero` must be present to ensure transient handling.

The [`MuseWonderEvaluationEngine.auditPrivacy`](file:///C:/dev/.worktrees/eval-muse-wonder/toolforge/skills/evaluate-muse-wonder-active-focus/src/evaluation-engine.mjs) routine confirms these headers before allowing tool calls to proceed.
