# 🛡️ DRY-RUN MODE (Operator Manual)

## 1. Purpose
**Dry-Run Mode** is a safety-first operational layer that allows you to run the entire ingestion pipeline without committing any destructive changes (creates, updates, or deletions) to Joplin. It is the "Safe Staging" environment for the CIC Control Plane.

## 2. How to Enable
Dry-Run mode is controlled via the `DRY_RUN` environment variable.

### Running with Dry-Run
```bash
DRY_RUN=true npm start
```

## 3. How it Works
The system uses an **Intercept Pattern** at the `JoplinClient` level. When Dry-Run is active, the following methods are intercepted:

- `createNote`
- `updateNote`
- `addTagToNote`
- `getOrCreateTag`
- `getOrCreateNotebook`

### Interception Behavior:
1. **Decision Logged**: The intended action is logged to the system console as `dry_run_intercept`.
2. **Event Recorded**: A `DRY_RUN_INTERCEPT` event is recorded in the Black Box Logger (traceability).
3. **Simulation Result**: The method returns a mock object with a `dry-run-*` ID, allowing the rest of the pipeline to continue execution normally.

## 4. Verification
To confirm you are in Dry-Run mode, look for the following indicator in the logs during startup:
`[DRY RUN ACTIVE] No data will be written to Joplin.` (Recorded in the Black Box)

You can also audit the `System/Events` log for `DRY_RUN_INTERCEPT` entries to see what the system *would* have done.

## 5. Limitations
Because notes aren't actually created, any logic that depends on the *real physical existence* of a note created earlier in the same cycle may behave slightly differently. However, because we return mock IDs and satisfy the data contracts, the vast majority of simulation is highly accurate.

## 6. Testing
Run the safety verification tests:
```bash
node --test projects/cic/ingestion/tests/dry-run.test.js
```
