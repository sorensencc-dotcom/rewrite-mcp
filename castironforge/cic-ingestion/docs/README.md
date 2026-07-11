<!-- file: docs/README.md | created: 2026-05-03 | version: 1.0.0 -->

# CIC Ingestion Engine

Operator-grade research ingestion pipeline for the **Cast Iron Charlie Documentary Project**. Processes research files dropped into `CIC_ROOT/Daily Intake/` and `CIC_ROOT/CIC_Daily_Search/`, extracts metadata, builds entity corpora, and writes structured bundle JSON for downstream research tooling.

---

## Quick Start

```bash
# 1. Install dependencies
cd C:\Users\soren\temp\cic-ingestion
npm install

# 2. Initialize folders and DB schema
npm run init

# 3. Validate environment
npm run validate

# 4. Run full pipeline (all 8 stages)
npm run all

# 5. Run daily pipeline (stages 2–6 + status)
npm run daily:orchestrated
```

---

## System Requirements

| Requirement | Value |
|-------------|-------|
| Node.js     | >= 20 (ESM stable) |
| SQLite      | via `better-sqlite3` |
| OS          | Windows 10+ (primary), WSL2 supported |
| CIC_ROOT    | `G:\My Drive\Cast Iron Charlie — Documentary Project\Research` |
| Project root | `C:\Users\soren\temp\cic-ingestion\` |
| Database    | `data/cic.db` (relative to project root) |

---

## Directory Structure

```
cic-ingestion/
├── config/
│   └── paths.json          # Path + sweeper config (v1.3.0)
├── data/
│   └── cic.db              # SQLite WAL database
├── dashboard/
│   ├── dashboard.html      # Standalone operator dashboard
│   └── cic-health-widget.js # Drop-in traffic-light badge
├── docs/                   # This Docsify site
├── logs/                   # daily-YYYY-MM-DD.log
├── scripts/
│   ├── run-all.js          # 8-stage full pipeline
│   ├── run-daily.js        # Daily pipeline (stages 2–6)
│   ├── run-pipeline.js     # Core pipeline runner
│   ├── run-indexer.js      # Indexer + bundle builder CLI
│   ├── init-cic-folders.js # Folder init CLI
│   ├── validate-cic-folders.js
│   └── cic-folders-maintenance.js
└── src/
    ├── db/migrate.js       # Schema bootstrap
    ├── harvester/
    ├── sweeper/
    ├── indexer/
    ├── corpus/
    ├── server/health.js    # HTTP health handlers
    └── lib/
        ├── paths.js        # Path resolver (v1.1.1)
        ├── logger.js
        ├── status.js
        └── folder-validator.js
```

---

## Key Concepts

**CIC_ROOT** is the root of the documentary research drive. All ingestion source directories are derived from it. Set via `CIC_ROOT` env var, `config/paths.json`, or auto-detected fallback.

**Queue-based architecture** (v2026-05-04): each pipeline stage has its own DB queue (`harvester_queue`, `sweeper_queue`, `indexer_queue`, `corpus_queue`) with `pending → running → completed | failed` lifecycle tracking.

**Self-healing folders**: `cic-folders-maintenance.js` runs as Phase 0 of every pipeline execution. It validates all required directories exist and creates missing ones, then writes `startup.json` as the environment health source of truth.

**Castironforge MCP backend**: live WebSocket + REST backend at `http://localhost:3000`. Powers the operator dashboard, queue management, sweeper triggers, breaker control, and system metrics.
