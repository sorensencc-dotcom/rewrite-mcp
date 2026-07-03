# Feedback Loop Test Suite

The **Feedback Loop Test Suite** is an end-to-end integration test validating the closed-loop feedback pipeline, from log file creation to dynamic routing changes.

This document describes the integration test pipeline and execution logic.

---

## 🧪 Test Suite Specifications

The test suite is located at:

```
C:\dev\src\tests\feedback-loop.test.ts
```

---

## 🔄 Integration Pipeline Tested

The test validates the following execution steps:

```
+--------------------------------------------------------+
|             1. Generate Mock JSONL Logs                |
|      Creates a healthy log and a degraded log entry    |
+---------------------------+----------------------------+
                            |
                            v
+---------------------------+----------------------------+
|             2. Queue Ingestion Job                     |
|    Schedules a 'client_session' job in IngestionQueue  |
+---------------------------+----------------------------+
                            |
                            v
+---------------------------+----------------------------+
|             3. Resolve File Lines                      |
|      Bridge resolver reads and parses JSONL lines      |
+---------------------------+----------------------------+
                            |
                            v
+---------------------------+----------------------------+
|             4. Extract driftSignals                    |
|      Session extractor normalizes latency and tokens   |
+---------------------------+----------------------------+
                            |
                            v
+---------------------------+----------------------------+
|             5. Accumulate Penalty                      |
|      Replay harness updates cicState.drift values      |
+---------------------------+----------------------------+
                            |
                            v
+---------------------------+----------------------------+
|             6. Assert Routing Fallback                 |
|   Router bypasses degraded backend on next inference   |
+--------------------------------------------------------+
```

### 1. Mock Log Creation
The test generates a mock `client_sessions.jsonl` file with two entries:
*   **Entry 1**: Latency $400\text{ ms}$, Tokens $200$ (Optimal performance on `ollama`).
*   **Entry 2**: Latency $1800\text{ ms}$, Tokens $3500$ (Degraded performance on `ollama`).

### 2. Job Resolution & Extraction
*   Enqueues the job and verifies it resolves successfully.
*   Asserts that `clientSessionExtractor` parses latency and token count signals correctly.

### 3. Drift Accumulation
*   Folds the extracted events into `cicState.drift`.
*   Verifies that the drift score of `ollama` increments to `0.6` (+$0.3$ latency penalty and +$0.3$ token penalty).
*   Injects a third degraded run to push the drift score to `0.9`, exceeding the `0.7` bypass threshold.

### 4. Routing Validation
*   Calls `route()` with the updated `cicState`.
*   Asserts that the router **bypasses** `ollama` and selects the next candidate `localai`, confirming the feedback loop functions correctly.
