-- CIC v3.0 Schema
-- File: schema.sql | Version: 1.0.0 | Date: 2026-05-15

CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id              TEXT    PRIMARY KEY,
    source_type     TEXT    NOT NULL,
    payload_type    TEXT    NOT NULL,
    payload         TEXT    NOT NULL,   -- JSON
    metadata        TEXT,               -- JSON
    enqueued_at     INTEGER NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'pending',
    created_at      INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

-- status values: pending | processing | done | failed

CREATE TABLE IF NOT EXISTS dlq_entries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id          TEXT    NOT NULL,
    job_snapshot    TEXT    NOT NULL,   -- JSON
    error_message   TEXT    NOT NULL,
    failed_at       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS drift_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id          TEXT,
    reason          TEXT    NOT NULL,
    recorded_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS dags (
    id              TEXT    PRIMARY KEY,
    nodes           TEXT    NOT NULL,   -- JSON
    edges           TEXT    NOT NULL,   -- JSON
    created_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS dag_runs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    dag_id          TEXT    NOT NULL REFERENCES dags(id),
    results         TEXT,               -- JSON
    started_at      INTEGER NOT NULL,
    completed_at    INTEGER,
    status          TEXT    NOT NULL DEFAULT 'running'
);

-- status values: running | done | failed

CREATE TABLE IF NOT EXISTS agent_registry (
    name            TEXT    PRIMARY KEY,
    version         TEXT    NOT NULL,
    registered_at   INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_name   TEXT    NOT NULL,
    input           TEXT    NOT NULL,   -- JSON
    output          TEXT,               -- JSON
    error           TEXT,
    started_at      INTEGER NOT NULL,
    completed_at    INTEGER,
    status          TEXT    NOT NULL DEFAULT 'running'
);

-- status values: running | done | failed
