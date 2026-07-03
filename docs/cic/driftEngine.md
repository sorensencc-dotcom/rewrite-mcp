# Drift Engine

The **Drift Engine** evaluates performance metrics against predefined service-level objective (SLO) thresholds to calculate degradation scores.

This document describes the implementation details of the drift scorer.

---

## ⚙️ Drift Scorer Implementation

The engine is located at:

```
C:\dev\cic-ingestion\src\drift\driftEngine.ts
```

It exposes the `updateDriftScores` function:

```typescript
export interface DriftSignals {
  latency?: number;
  tokens?: number;
  backend: string;
}

export interface DriftEvent {
  driftSignals: DriftSignals;
}

export function updateDriftScores(
  event: DriftEvent,
  driftState: Record<string, number>
): void {
  const { backend, latency = 0, tokens = 0 } = event.driftSignals;

  // 1. Calculate penalty score
  const score =
    (latency > 1500 ? 0.3 : 0) +
    (tokens > 3000 ? 0.3 : 0);

  // 2. Initialize drift key if missing
  if (driftState[backend] === undefined) {
    driftState[backend] = 0;
  }

  // 3. Accumulate score, capped at 1.0
  driftState[backend] = Math.min(1, driftState[backend] + score);
}
```

---

## ⚡ Performance Penalty Triggers

The scoring logic targets two performance metrics:

### 1. Latency Penalty
*   **Threshold**: Latency exceeds `1500 ms`.
*   **Penalty**: `+0.3` added to the drift score.
*   **Rationale**: Indicates that the local engine is resource-constrained or swapping context.

### 2. Large Token Payload Penalty
*   **Threshold**: Total token count exceeds `3000 tokens`.
*   **Penalty**: `+0.3` added to the drift score.
*   **Rationale**: Prevents overloading small local context windows, keeping routing responsive.

---

## 🔒 State Boundary Invariants

1.  **Lower Bound**: The drift score cannot drop below `0.0`.
2.  **Upper Bound**: The drift score is capped at `1.0` via `Math.min(1, ...)`.
3.  **Default Initialization**: Any backend not previously evaluated is initialized to `0.0` drift.
4.  **No Side Effects**: The function operates directly on the passed reference object, modifying it in-place to prevent unnecessary state copies.
