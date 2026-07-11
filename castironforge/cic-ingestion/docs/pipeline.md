<!-- file: docs/pipeline.md | created: 2026-05-03 | version: 1.0.0 -->

# Pipeline Stages

The CIC pipeline runs as 8 sequential stages via `run-all.js`. The daily pipeline (`run-daily.js`) runs stages 2–6 plus status.

---

## Stage Overview

| # | Stage | Script | Description |
|---|-------|--------|-------------|
| 1 | **init** | `scripts/init-cic-folders.js` | Bootstrap folders, DB schema, status files |
| 2 | **folders-maintenance** | `scripts/cic-folders-maintenance.js` | Validate + heal folder structure, write `startup.json` |
| 3 | **harvester** | `src/harvester/harvester.js` | Scan inbox dirs, register files in `harvester_queue` |
| 4 | **sweeper** | `src/sweeper/daily-sweeper.js` | Move harvested files to `CIC_Processed/`, update `sweeper_queue` |
| 5 | **indexer** | `src/indexer/indexer.js` | Extract metadata, write sidecar JSON, update `indexer_queue` |
| 6 | **corpus** | `src/corpus/corpus-builder.js` | Build entity corpora, write bundle JSON, update `corpus_queue` |
| 7 | **pipeline** | `run-pipeline.js` | Pipeline coordination + summary |
| 8 | **status** | `scripts/print-status.js` | Print status report to stdout |

---

## Stage 1 — Init

Runs once to bootstrap the system.

```bash
npm run init
```

- Creates all required directories under `CIC_ROOT`
- Runs `migrate.js` to create SQLite schema
- Writes initial `startup.json` via `runMaintenance()`

---

## Stage 2 — Folders Maintenance

Runs as **Phase 0** of every pipeline execution. Zero-failure guarantee: if a required directory is missing, it is created before the pipeline proceeds.

```bash
npm run maintain
```

Outputs `CIC_Processed/_status/startup.json`:

```json
{
  "_schema": "cic-startup-v1.0.0",
  "generated_at": "2026-05-03T09:00:00.000Z",
  "node_version": "v20.x.x",
  "platform": "win32",
  "cic_root": "G:\\My Drive\\Cast Iron Charlie...",
  "db_path": "C:\\Users\\soren\\temp\\cic-ingestion\\data\\cic.db",
  "folders": { "checked": 8, "missing": 0, "created": 0, "ok": true },
  "status": "ready"
}
```

`status` is `"ready"` when all folders exist, `"degraded"` otherwise. The dashboard and health endpoints read this file.

---

## Stage 3 — Harvester

Scans two inbox directories:

- `CIC_ROOT/Daily Intake/`
- `CIC_ROOT/CIC_Daily_Search/`

For each file found:

1. Compute SHA-256 hash (deduplication key)
2. Classify by extension → category (`documents`, `photos`, `notes`, `data`, `other`)
3. Insert into `harvester_queue` with status `pending`
4. Skip duplicates (unique constraint on `doc_hash`)

```bash
node scripts/run-harvester.js
```

---

## Stage 4 — Sweeper

Moves pending files from inbox → `CIC_Processed/<category>/YYYY-MM-DD/`.

Key behaviour:
- Reads `sweeper.ignoreNames` from `config/paths.json` — skips `_archive`, `_Archive`, `Index`, `Search` entries
- `scanParentFolder: false` — sweeper does NOT recurse into parent folder
- Updates `sweeper_queue` (pending → completed)
- Writes `CIC_Processed/_status/sweeper.json`

```bash
node scripts/run-sweeper.js
# or via MCP:
POST /api/sweeper/pipeline
```

---

## Stage 5 — Indexer

For each file in `sweeper_queue` with status `completed`:

1. Extract metadata (MIME type, size, timestamps)
2. Run NLP extraction → entities (PERSON, LOCATION, EVENT, DATE, ORG) + topic tags
3. Write sidecar JSON to `CIC_Sidecars/<filename>.json`
4. Update `indexer_queue`

Bundle builder groups indexed files by `date_label + category` → `CIC_Bundles/batches/<bundle-id>.json`.

```bash
node scripts/run-indexer.js
```

---

## Stage 6 — Corpus Builder

Aggregates entities across all indexed files into 5 named corpora:

| Corpus | Entity Types | Category Filter |
|--------|-------------|-----------------|
| `people` | PERSON | all |
| `locations` | LOCATION | all |
| `events` | EVENT, DATE | all |
| `documents` | — | documents, notes |
| `photos` | — | photos |

Writes `CIC_Bundles/corpora/<corpus>.json` and upserts `corpus_entries` table.

```bash
node scripts/run-corpus.js
```

---

## Data Flow

```
Daily Intake/          CIC_Daily_Search/
      │                       │
      └──────── Harvester ────┘
                    │ harvester_queue (pending)
                  Sweeper
                    │ sweeper_queue (completed)
              CIC_Processed/<category>/
                    │ indexer_queue
                  Indexer ──→ CIC_Sidecars/<file>.json
                    │ corpus_queue
              Corpus Builder ──→ CIC_Bundles/corpora/*.json
                                  CIC_Bundles/batches/*.json
```

---

## Error Handling

Every stage is wrapped in try/catch in `run-pipeline.js`. A stage failure logs the error and **continues** the pipeline — no stage crash is fatal. Failures are captured in the `pipeline_runs` table and surfaced in `npm run status`.

Queue status lifecycle:

```
pending → running → completed
                 ↘ failed
```
