# Changelog

All notable changes to the CIC Ingestion Engine are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

---

## [1.2.0] — 2026-05-04

### Fixed

- **init.js** — Added `dirname(paths.db)` to directory creation list so `data/` folder
  exists before `migrate()` attempts to create `cic.db`. Previously failed on fresh clones.
- **init.js** — Status files now check `existsSync()` before writing. Re-running
  `npm run init` no longer nukes existing stage data (filesIngested, errors, etc.).
- **init.js** — Error handler switched from raw `console.error` to structured
  `log('error', 'init', ...)` for consistent JSON output.
- **init.js** — Status seeding refactored from 4 duplicate blocks to a loop over
  `Object.entries(paths.status)`.

### Updated

- init.js version bumped from 1.1.0 → 1.2.0.

---

## [1.1.0] — 2026-05-03

### Added

- **scripts/print-status.js** v1.0.0 — Full system status reporter.
  Reads stage JSON files, scans all configured folders, queries DB table counts.
  Supports `--json` for machine-readable output.
- **scripts/reset-db.js** v1.0.0 — Destructive database reset.
  Deletes DB file + WAL/SHM, re-runs `migrate()` to rebuild schema.
  Safety-gated with `--confirm`. Supports `--backup` and `--dry-run`.
- **scripts/reset-status.js** v1.0.0 — Status file and queue reset.
  Resets stage JSON files via `writeStatus()`. Optional `--db` flag resets
  queue rows. Scoped by `--all` or `--stage <name>`. Filters: `--failed-only`,
  `--stalled <mins>`. Safety-gated with `--confirm`.
- **scripts/run-daily.js** v1.0.0 — Daily pipeline orchestrator.
  Runs 6 stages sequentially as child processes (10-min timeout each):
  folders-maintenance → harvester → sweeper → indexer → corpus → status.
  Pre-flight validates inbox root and script existence. Supports `--skip`,
  `--stop-on-fail`, `--dry-run`.
- **scripts/run-all.js** v1.0.0 — Full pipeline wrapper.
  Runs 8 stages including init and pipeline bookends (15-min timeout).
  Adds `--parallel` flag for experimental harvester+sweeper concurrency.
- **run-daily.bat** — Windows Task Scheduler launcher. Logs output to
  `logs/daily-YYYY-MM-DD.log`.
- **.gitignore** — Excludes working directories (CIC_Processed, CIC_Sidecars,
  CIC_Bundles, CIC_Daily_Search,_Archive), data/, logs/, node_modules/.
- **Windows Task Scheduler** — "CIC Daily Pipeline" task registered for
  daily execution at 09:00 via `schtasks`.

### Changed

- All scripts wired to real architecture imports:
  `getPaths()` from `src/lib/paths.js`,
  `log()` from `src/lib/logger.js`,
  `writeStatus()` from `src/lib/status.js`,
  `migrate()` from `src/db/migrate.js`.

---

## [1.0.0] — 2026-05-03

## Added Stuff

- **Project scaffolding** — package.json, config/paths.json, folder structure.
- **src/lib/paths.js** v1.1.1 — Auto-rooting path resolver. Self-locates via
  `import.meta.url`. Resolves CIC_ROOT from env → config → fallback.
  Exports `getPaths()` singleton.
- **src/lib/logger.js** v1.1.0 — Deterministic structured JSON logger.
  Exports `log()`, `logError()`, `logWarn()`, `logInfo()`.
- **src/lib/status.js** v1.1.0 — Status file writer with builder functions.
  Exports `writeStatus()`, `buildHarvesterStatus()`, `buildIndexerStatus()`,
  `buildDailyStatus()`, `buildCorpusStatus()`.
- **src/db/migrate.js** — Schema migration runner. Creates all queue tables
  (harvester_queue, sweeper_queue, indexer_queue, corpus_queue, pipeline_runs)
  with indexes. Returns live better-sqlite3 handle.
- **scripts/init.js** v1.1.0 — System initializer. Creates all directories,
  applies DB migrations, seeds status files.
- **config/paths.json** — Path configuration with inboxRoot, relative paths,
  and categories (photos, documents, audio, video, notes).

---

## Notes

- **DB quirk:** `migrate.js` passes objects to logger callbacks, producing nested
  `message` fields in JSON output. Cosmetic — no functional impact.
- **Local dev:** When Google Drive (inboxRoot) is unavailable, paths fall back to
  PROJECT_ROOT. Working folders appear inside the project directory. This is
  expected for local dev/test environments.
