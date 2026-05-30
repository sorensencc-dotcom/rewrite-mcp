# ⚡ TASK EXTRACTOR SUBSYSTEM (Operator Manual)

## 1. Purpose
The **Task Extractor Subsystem** automatically identifies memos tagged with `#task` and converts them into structured Joplin to-dos. This allows for a seamless capture-to-execution workflow.

## 2. Architecture
The subsystem is a "fan-out" consumer on the Ingestion Bus:

- **Router**: Monitors the bus for `#task` memos.
- **Extractor**: Parses content for title (first line/sentence), due date (`due:YYYY-MM-DD`), and priority (`#urgent`=1, `#high`=2, default=3).
- **Writer**: Writes to the "Tasks" notebook in Joplin with idempotency (using `memos-source-<id>` tag).

## 3. Configuration
The Task Extractor uses the same Joplin credentials as the main ingestion pipeline:
- `JOPLIN_API_TOKEN`: Required for writing to Joplin.
- `JOPLIN_BASE_URL`: Default `http://localhost:41184`.

## 4. How it Works
1. A memo is captured in Memos with the tag `#task`.
2. The Ingestion Worker picks it up and publishes an `IngestionEvent` to the bus.
3. The `TaskConsumer` identifies the task.
4. A structured to-do is created in the Joplin **Tasks** notebook.
5. The original memo is still mirrored as a regular note in its respective notebook (dual-delivery).

## 5. Idempotency
To prevent duplicate tasks, the system tags every created Joplin to-do with a unique identifier: `memos-source-<memo_id>`. Before creating a new task, the system checks if a note with this tag already exists.

## 6. Testing
Run unit tests for the task subsystem:
```bash
node --test projects/cic/ingestion/tests/tasks.test.js
```

## 7. Troubleshooting
- **No tasks appearing**: Check if the memo has the exact `#task` tag. Check logs for `task_consumer_match`.
- **Duplicates**: Ensure the `memos-source-<id>` tags are not being manually removed in Joplin.
- **Wrong Title**: The extractor uses the first sentence or first line. Keep the first line of your memo concise for best results.
