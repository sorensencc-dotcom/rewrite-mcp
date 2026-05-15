# CIC Ingestion v1.0.0

Semantic versioned ingestion subsystem for Castironforge CIC.

## Layout

- `queue/` — core queue, DLQ, drift, schemas, types
- `producer/` — job production API
- `ingest/` — multi-stage ingestion pipeline
  - `sources/` — file, URL, drive sources
  - `stages/` — validate, normalize, enqueue
- `telemetry/` — telemetry, metrics, events
- `tests/` — queue and schema tests

## Invariants

- All public APIs are pure or idempotent where possible.
- All queue operations are explicit and typed.
- All telemetry calls are non-blocking and best-effort.
