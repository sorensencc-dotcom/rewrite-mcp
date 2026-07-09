# rollback-phase

Revert CIC pipeline execution to a prior phase checkpoint.

## Usage

```bash
rollback-phase [target-phase]
```

- `target-phase`: Phase number or name (e.g., "18", "18-harvest-validation")

## Logic

1. Verify checkpoint exists
2. Stop current phase
3. Restore PostgreSQL state from checkpoint snapshot
4. Clear Qdrant partial vectors
5. Resume from target phase

## Output

```
Current phase: 19 (Extraction)
Rolling back to: 18 (Harvest Validation)

Verifying checkpoint 18-20260630-185900...
├─ PostgreSQL snapshot: ✓ exists (2.1GB)
├─ State hash: ✓ matches
└─ Timestamp: 2026-06-30 18:59:00Z

Rolling back...
├─ Stopping current phase...
├─ Restoring PostgreSQL state...
├─ Clearing Qdrant partial vectors...
└─ Phase 18 ready for resume

Next: run-cic-phase 18
```
