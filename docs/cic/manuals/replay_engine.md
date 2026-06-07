# ⚡ REPLAY ENGINE SUBSYSTEM (Operator Manual)

## 1. Purpose
The **Replay Engine** is a deterministic, side-effect-free simulation tool that allows you to re-run any memo through the ingestion pipeline. It is essential for debugging routing decisions, validating rule changes, and performing post-mortems without affecting your production data in Joplin.

## 2. Architecture
The engine is isolated from the live ingestion worker and consumers:

- **Loader**: Reconstructs a memo by first searching Joplin (using `memos-source-<id>`) and falling back to the Memos API.
- **Simulator**: Runs the pure logic of the Task Extractor, Idea Clusterer, and Digest Synthesizer.
- **Reporter**: Produces a human-readable summary of what *would* happen if the memo were ingested today.

## 3. How to Run

### Replay a specific memo
```bash
node scripts/replay.js 456
```

### Replay the latest memo
```bash
node scripts/replay.js latest
```

## 4. Interpreting the Report
A typical report includes:
- **Routing Decision**: Which consumers would handle the memo.
- **Task Extraction**: Titles, due dates, priorities, and whether a new to-do would be created.
- **Idea Clustering**: Assigned cluster path and title.
- **Digest Inclusion**: Which sections of the daily digest would include this memo.

## 5. Usage Scenarios

### Validating New Clustering Rules
When you modify `src/ideas/clusterer.js`, use the Replay Engine to verify that existing memos are still assigned to the expected clusters (or correctly assigned to new ones).

### Debugging Extraction Failures
If a memo wasn't converted to a task as expected, replay it to see the internal routing decisions and extraction output.

### Safe Staging
Before deploying changes to the core logic, run a suite of `replay` commands against representative memos to ensure no regressions.

## 6. Testing
Run the unit test suite:
```bash
node --test projects/cic/ingestion/tests/replay.test.js
```

## 7. Troubleshooting
- **Loader Fatal**: Ensure `MEMOS_API_TOKEN` and `JOPLIN_API_TOKEN` are correctly set in your `.env`.
- **Memo Not Found**: If a memo ID is invalid or has been deleted from both Memos and Joplin, the loader will fail.
- **Simulation Drift**: If the simulation behavior doesn't match past ingestion, check if your local rules have changed since the memo was originally processed.
