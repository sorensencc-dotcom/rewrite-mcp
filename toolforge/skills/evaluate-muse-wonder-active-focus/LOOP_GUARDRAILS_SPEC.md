# Active Focus Loop-Detection Middleware Specification

Specification for runtime middleware designed to prevent infinite loops, cycle entrapment, and excessive token expenditure during autonomous agent execution.

## Specification Overview

The [`ActiveFocusLoopGuard`](file:///C:/dev/.worktrees/eval-muse-wonder/toolforge/skills/evaluate-muse-wonder-active-focus/src/loop-guard.mjs) operates as inline middleware positioned between model tool invocation recommendations and the Toolforge execution sandbox.

## State Model

The guard evaluates every prospective tool call against current execution history and assigns one of three statuses defined in [`GUARD_STATUS`](file:///C:/dev/.worktrees/eval-muse-wonder/toolforge/skills/evaluate-muse-wonder-active-focus/src/types.mjs).

- `HEALTHY`: Execution proceeds without restriction.
- `WARNING`: Turn count has crossed warning thresholds, but safety bounds remain intact.
- `TRIPPED`: Execution halts immediately. The pending action is blocked, and an escalation payload is dispatched to human review.

## Detection Rules

### 1. Windowed Cycle Detector

The guard canonicalizes tool arguments by sorting object keys alphabetically. It builds an execution signature string for each turn:

`actionKey = "${toolName}:${canonicalArgs}"`

The guard maintains an sliding window across historical invocations. For each cycle length $L \in [1, 2, 3, 4, 5]$:
- A cycle matches when the trailing $L \times R$ invocations match the pattern repeating $R$ times, where $R = \text{maxCycleRepetitions}$ (default 2).
- When a match is detected, the status transitions to `TRIPPED` with reason `CYCLE_DETECTED`.

### 2. Consecutive Failure Limiter

When an external tool invocation fails, the agent may attempt immediate retries.
- The guard inspects the trailing actions.
- If the identical tool and canonical arguments fail consecutively $\ge \text{maxConsecutiveRetries}$ (default 3), execution trips with reason `CONSECUTIVE_RETRY_LIMIT`.
- Transient failures under the limit are permitted to allow resilience against network fluctuations.

### 3. Hard Turn Ceiling

Autonomous agents must not run indefinitely without supervisor oversight.
- `warningTurnThreshold` (default 20): Emits `WARNING` status.
- `maxTurns` (default 30): Immediately transitions to `TRIPPED` status with reason `MAX_TURNS_EXCEEDED`.

## Escalation Payload Schema

When tripped, the guard generates an escalation object:

```json
{
  "escalationId": "esc-1729221000000-ab12cd",
  "timestamp": "2026-10-18T04:20:00.000Z",
  "status": "ESCALATED",
  "reason": "CYCLE_DETECTED",
  "turnCount": 4,
  "actionTrace": {
    "toolName": "fetch_reviews",
    "args": { "asin": "B001" },
    "canonicalArgs": "{\"asin\":\"B001\"}",
    "turnIndex": 4,
    "success": true,
    "timestamp": 1729221000000
  },
  "recentTraces": [],
  "recommendedAction": "HUMAN_APPROVAL_REQUIRED",
  "details": {
    "cycleLength": 2,
    "repetitions": 2,
    "pattern": [
      "search_catalog:{\"q\":\"wireless mouse\"}",
      "fetch_reviews:{\"asin\":\"B001\"}"
    ]
  }
}
```

The orchestrator halts model polling upon receipt of this payload and notifies the operator.
