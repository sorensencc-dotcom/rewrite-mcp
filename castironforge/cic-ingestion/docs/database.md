<!-- file: docs/database.md | created: 2026-05-03 | version: 1.0.0 -->

# Database Schema

**Engine:** SQLite via `better-sqlite3`, WAL mode enabled.  
**Location:** `data/cic.db` (always relative to project root — never relative to CIC_ROOT).  
**Bootstrap:** `src/db/migrate.js` — idempotent, safe to run multiple times.

---

## Queue Tables

### `harvester_queue`

Files discovered in inbox. Primary deduplication point.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | auto-increment |
| `filename` | TEXT | original filename |
| `source_dir` | TEXT | inbox dir path |
| `doc_hash` | TEXT UNIQUE | SHA-256 of file content |
| `category` | TEXT | documents \| photos \| notes \| data \| other |
| `size_bytes` | INTEGER | |
| `status` | TEXT | pending → running → completed \| failed |
| `error_msg` | TEXT | populated on failure |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | |

### `sweeper_queue`

Files moved to `CIC_Processed/`. References `harvester_queue`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `harvester_id` | INTEGER FK | → harvester_queue.id |
| `source_path` | TEXT | original file path |
| `dest_path` | TEXT | processed destination path |
| `status` | TEXT | pending → completed \| failed |
| `moved_at` | TEXT | |
| `created_at` | TEXT | |

### `indexer_queue`

Metadata extraction + sidecar. Unique on `doc_hash`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `harvester_id` | INTEGER FK | |
| `doc_hash` | TEXT UNIQUE | dedup key |
| `sidecar_path` | TEXT | path to sidecar JSON |
| `mime_type` | TEXT | |
| `entity_count` | INTEGER | |
| `topic_count` | INTEGER | |
| `status` | TEXT | pending → completed \| failed |
| `indexed_at` | TEXT | |
| `created_at` | TEXT | |

### `corpus_queue`

Bundle creation tracking. References `indexer_queue`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `indexer_id` | INTEGER FK | → indexer_queue.id |
| `bundle_id` | TEXT | e.g. `batch-2026-05-03-documents` |
| `corpus_name` | TEXT | people \| locations \| events \| documents \| photos |
| `status` | TEXT | pending → completed \| failed |
| `bundled_at` | TEXT | |
| `created_at` | TEXT | |

---

## Supporting Tables

### `pipeline_runs`

Full pipeline execution tracking.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `run_id` | TEXT UNIQUE | e.g. `pipeline-2026-05-03T09:00:00.000Z` |
| `run_type` | TEXT | full \| daily \| harvester \| sweeper \| indexer \| corpus |
| `started_at` | TEXT | |
| `completed_at` | TEXT | |
| `status` | TEXT | running → completed \| failed |
| `files_processed` | INTEGER | |
| `files_failed` | INTEGER | |
| `error_summary` | TEXT | JSON array of error objects |

### `corpus_entries`

Aggregated entity data across all indexed files.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `corpus_name` | TEXT | |
| `entity_type` | TEXT | PERSON \| LOCATION \| EVENT \| DATE \| FILE |
| `value` | TEXT | entity value string |
| `mention_count` | INTEGER | cumulative across files |
| `file_ids` | TEXT | JSON array of file IDs |
| `first_seen` | TEXT | |
| `last_seen` | TEXT | |

UNIQUE constraint on `(corpus_name, entity_type, value)`.

---

## WAL Mode

WAL is enabled on every `migrate()` call:

```js
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
```

This allows concurrent readers while the pipeline writes, making it safe to run status checks and read corpus data while an ingestion run is in progress.

---

## Useful Queries

```sql
-- Queue depth by status
SELECT status, COUNT(*) AS n FROM harvester_queue GROUP BY status;

-- Files processed today
SELECT COUNT(*) FROM harvester_queue
WHERE DATE(created_at) = DATE('now') AND status = 'completed';

-- Top entities across all corpora
SELECT entity_type, value, SUM(mention_count) AS total
FROM corpus_entries
GROUP BY entity_type, value
ORDER BY total DESC LIMIT 20;

-- Pipeline run history
SELECT run_id, run_type, status, started_at, completed_at,
       files_processed, files_failed
FROM pipeline_runs ORDER BY started_at DESC LIMIT 10;

-- Failed files in sweeper
SELECT s.id, h.filename, s.error_msg, s.created_at
FROM sweeper_queue s
JOIN harvester_queue h ON h.id = s.harvester_id
WHERE s.status = 'failed';
```

---

## Reset

```bash
# Wipe and rebuild DB schema (destructive — requires --confirm)
npm run reset:db -- --confirm

# Reset status JSON files only
npm run reset:status -- --confirm
```
