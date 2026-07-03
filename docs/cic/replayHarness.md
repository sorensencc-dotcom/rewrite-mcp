# Replay Ingestion Harness

The **Replay Ingestion Harness** acts as the connector that feeds performance data back into the global state checked by the router.

This document describes the replay connector and state synchronization.

---

## ⚡ Replay Connector

The harness connector is located at:

```
C:\dev\cic-ingestion\src\harness\replayHarness.ts
```

It exposes the `processClientSession` function:

```typescript
import { updateDriftScores, DriftEvent } from "../drift/driftEngine.js";

export interface CICState {
  drift: Record<string, number>;
}

export function processClientSession(event: DriftEvent, cicState: CICState): void {
  // Ensure the drift state object exists
  if (!cicState.drift) {
    cicState.drift = {};
  }
  
  // Fold event signals into drift scores
  updateDriftScores(event, cicState.drift);
}
```

---

## 🔄 State Synchronization & Feedback

The feedback loop operates as follows:

```
+--------------------------------------------------------+
|                      Log Generated                     |
|           Gateway logs turn details to JSONL           |
+---------------------------+----------------------------+
                            |
                            v
+---------------------------+----------------------------+
|                       Log Ingested                     |
|         Bridge reads file and parses job lines         |
+---------------------------+----------------------------+
                            |
                            v
+---------------------------+----------------------------+
|                     Event Extracted                    |
|       clientSessionExtractor creates structured event  |
+---------------------------+----------------------------+
                            |
                            v
+---------------------------+----------------------------+
|                     State Synchronized                 |
|       processClientSession updates cicState.drift      |
+---------------------------+----------------------------+
                            |
                            v
+---------------------------+----------------------------+
|                     Next Routing Call                  |
|    route() reads cicState.drift and prunes degraded    |
+--------------------------------------------------------+
```

1.  **Read State**: The harness connector reads the current `cicState`.
2.  **Calculate Penalty**: It feeds the extracted event details to `updateDriftScores`.
3.  **Update Memory**: The global memory references (`cicState.drift`) are updated.
4.  **Bypass**: On the next inference request, the MAAL router checks `cicState.drift`. Runtimes exceeding the `0.7` threshold are bypassed, successfully closing the self-regulating control loop.
