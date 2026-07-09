# reconcile-vector-store

Verify Qdrant is in sync with PostgreSQL extraction state.

## Usage

```bash
reconcile-vector-store [check | repair]
```

- `check`: Compare counts, detect drift (default)
- `repair`: Re-index missing vectors

## Output (check mode)

```
PostgreSQL extraction state: 45,000 records
Qdrant vectors indexed: 45,000 vectors
Status: ✓ IN SYNC

Last sync: 2026-07-02 19:35:00Z
Drift: 0%
```

## Output (repair mode)

```
Detected 23 missing vectors
Re-indexing from PostgreSQL...
✓ Completed (2m 14s)
Vectors now: 45,023
