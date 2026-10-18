# Deployment Recommendation: Meta Muse Wonder with Active Focus

Catalog recommendation for Rewrite Labs client automation catalog regarding Meta Muse Wonder and Active Focus integration.

## Recommendation Verdict

**DROP / DO NOT DEPLOY** to general unconstrained client workflows.

Restrict Meta Muse Wonder usage exclusively to supervised developer sandboxes and deterministic narrow-domain tasks protected by external loop-prevention middleware.

## Evaluation Findings and Risk Analysis

### 1. Uncontrolled Iteration and Runaway Token Burn

In unconstrained environments, Active Focus exhibits strong tendencies toward cycle repetition and wandering exploration. Developer test runs observed an agent continuing for 792 turns before manual operator termination. In client production environments with usage-based billing, such runaway execution causes severe cost inflation.

### 2. Unfavorable Cost Arbitrage

At $4.00 per 1M input tokens, $20.00 per 1M output tokens, and $2.50 per 1,000 web search calls, Meta Muse Wonder is significantly more expensive than alternative frontier models:
- Claude Sonnet 5.5 delivers equivalent multi-turn agentic task completion at 59% lower total cost ($4.50 vs $11.10 per benchmark standard run).
- Claude Haiku 5.5 executes structured transactional lookups at 98% lower cost ($0.14 vs $11.10).

Deploying Muse Wonder to standard client automations degrades operating margins without delivering superior task completion quality.

### 3. Data Privacy Defaults

Meta API defaults enable Contributor Mode unless explicit opt-out headers are supplied on every request. Allowing client data to enter foundation training sets violates enterprise data governance standards.

## Production Gate Requirements

Clients requesting Meta Muse Wonder must meet three mandatory architectural prerequisites before activation:

1. **Middleware Deployment**: The [`ActiveFocusLoopGuard`](file:///C:/dev/.worktrees/eval-muse-wonder/toolforge/skills/evaluate-muse-wonder-active-focus/src/loop-guard.mjs) must be mounted in the invocation pipeline with `maxTurns` set to 30 or fewer and cycle detection active.
2. **Privacy Enforcement**: The gateway must inject `X-Meta-Contributor-Mode: bypass` and `X-Meta-Data-Retention: zero` headers on all outbound requests as verified by [`MuseWonderEvaluationEngine.auditPrivacy`](file:///C:/dev/.worktrees/eval-muse-wonder/toolforge/skills/evaluate-muse-wonder-active-focus/src/evaluation-engine.mjs).
3. **Restricted Scope**: Workflows must be confined to bounded transactional scenarios such as customer support inquiries or appointment scheduling, where tool state spaces are finite.
