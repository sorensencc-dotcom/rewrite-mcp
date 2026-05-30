# 🗞️ DAILY DIGEST SUBSYSTEM (Operator Manual)

## 1. Purpose
The **Daily Digest Subsystem** provides a high-signal brief of all activity ingested in the last 24 hours. It synthesizes raw memos, extracted tasks, and clustered ideas into a single, structured Joplin note.

## 2. Architecture
The subsystem is a downstream consumer that queries Joplin's state:

- **Collector**: Queries Joplin for all notes/to-dos created on the target date.
- **Synthesizer**: Formats the findings into a hierarchical Markdown report.
- **Writer**: Saves the report to `Daily/Digests/YYYY/MM/YYYY-MM-DD.md` in Joplin.

## 3. Sections Included
- **Operator Notes**: Memos containing `#operator-note`.
- **Tasks**: New to-dos, sorted by priority (P1-P3).
- **Ideas**: New ideas, grouped by their thematic clusters.
- **Memos**: A list of all raw memos ingested.
- **Cluster Summary**: Aggregate statistics for idea clusters.

## 4. How to Run
The digest is designed to be run as a daily scheduled task or manually by the operator.

### Manual Trigger
You can run the digest generation script (if configured) or call the `DailyDigestConsumer` from the codebase.
*Example*:
```bash
node scripts/generate-digest.js [YYYY-MM-DD]
```

## 5. Customization

### Adding Sections
Modify `src/digest/synthesizer.js` to add new Markdown blocks based on the data collected.

### Enhancing Collection
Modify `src/digest/collector.js` to change how it identifies memos vs ideas vs tasks.

## 6. Testing
Run the unit test suite:
```bash
node --test projects/cic/ingestion/tests/digest.test.js
```

## 7. Troubleshooting
- **Missing items**: Ensure the items were created on the target date. The collector uses Joplin's `created_time`.
- **Wrong classification**: Check the notebook names and `is_todo` status in Joplin.
- **Overwriting**: The writer is idempotent; it will overwrite the digest for the same day if re-run, ensuring the report is always up-to-date with the latest findings.
