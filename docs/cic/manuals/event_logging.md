# 🎞️ EVENT LOGGING SUBSYSTEM (Operator Manual)

## 1. Purpose
The **Event Logging Subsystem** (The Black Box Recorder) provides a deterministic, append-only narrative of system actions. It records every significant decision made by the ingestion pipeline, enabling traceability, post-mortem analysis, and replay debugging.

## 2. Log Model

### 2.1 Log Destination
All logs are written to Joplin under the following hierarchy:
`System/Events/YYYY/MM/YYYY-MM-DD.md`

### 2.2 Event Format
Logs are human-scanable, single-line entries:
`TIMESTAMP | COMPONENT | EVENT_TYPE | key1=val1 key2=val2`

- **TIMESTAMP**: ISO 8601 (UTC).
- **COMPONENT**: The subsystem emitting the event (e.g., `IngestionWorker`).
- **EVENT_TYPE**: Semantic label (e.g., `POLL_COMPLETE`).
- **PAYLOAD**: Key-value pairs with sorted keys and compact array rendering.

## 3. Core Components
- **Logger (`blackbox.js`)**: The primary interface for subsystems.
- **Formatter (`formatter.js`)**: Pure logic for converting events to text.
- **Writer (`writer.js`)**: Handles the append-only persistence to Joplin.

## 4. Key Events

### IngestionWorker
- `STARTUP`: System boot metadata.
- `POLL_START`: Polling cycle initiation.
- `POLL_COMPLETE`: Memos fetched and cursor updated.

### TaskExtractor
- `CREATED_TASK`: New to-do created in Joplin.
- `SKIPPED_DUPLICATE`: Memo skipped due to idempotency.

### IdeaClusterer
- `CREATED_IDEA`: New idea note created in a thematic cluster.

### DigestConsumer
- `DIGEST_GENERATED`: Daily briefing successfully created.

## 5. Testing
Run the unit tests for the logging formatter:
```bash
node --test projects/cic/ingestion/tests/logging.test.js
```

## 6. Troubleshooting
- **Missing Logs**: Logs are written as best-effort. Check `stderr` for `EVENT_LOG_WRITE_FAILED` or `BLACK_BOX_LOGGER_INTERNAL_ERROR`.
- **Latency**: Logging is non-blocking (not awaited) to ensure pipeline performance.
- **Uninitialized Logger**: If you see `UNINITIALIZED_LOGGER` in `stderr`, ensure `blackBox.init(joplinClient)` is called during startup.
