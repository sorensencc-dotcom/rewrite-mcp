# Phase 7.10 — Operator Dashboard Integration

## Overview

Phase 7.10 exposes the ARL reasoning pipeline through the Operator Dashboard (CognitionPanel) with three data sections:

1. **ARL Reasoning Trace** — 8-step deterministic reasoning narrative from Phase 7.9
2. **Composite Reasoning** — aggregated scores across the 5 core subsystems
3. **Drift Vector** — divergence signals across temporal, semantic, narrative, and causal dimensions

## Architecture

```
┌─────────────────┐
│   Phase 7.9     │
│   (Formatter)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  arlStore (in-memory)   │
│  - storeArlTrace()      │
│  - storeArlComposite()  │
│  - storeArlDrift()      │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────────┐
│   cognitionArlRoutes         │
│  /api/v1/cognition/arl/*     │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│    CognitionPanel (React)    │
│  - Trace Section             │
│  - Composite Section         │
│  - Drift Vector Section      │
└──────────────────────────────┘
```

## Backend Setup

### 1. Wire Routes into Express Server

In `src/server.ts`:

```typescript
import cognitionArlRoutes from './api/cognitionArlRoutes';

app.use('/api/v1/cognition', cognitionArlRoutes);
```

### 2. Populate ARL Store

After running `runArl()`, store results:

```typescript
import { storeArlTrace, storeArlComposite, storeArlDrift } from './services/arlStore';

const verdict = await runArl(input);
const runId = generateRunId(); // uuid or similar

storeArlTrace(runId, verdict.reasoningTrace || []);
storeArlComposite(runId, compositeScores); // from Phase 7.8
storeArlDrift(runId, driftVector); // from Phase 7.8
```

### 3. Return Run ID to Frontend

Include `runId` in verdict response so dashboard knows which data to fetch:

```json
{
  "verdict": { ... },
  "runId": "abc-123-def"
}
```

## Frontend Setup

### 1. Mount CognitionPanel

In your dashboard layout:

```tsx
import { CognitionPanel } from './CognitionPanel';

export function Dashboard() {
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();

  return (
    <div>
      {/* other dashboard sections */}
      <CognitionPanel selectedId={selectedRunId} />
    </div>
  );
}
```

### 2. Update selectedId on Verdict

When a new verdict completes, set `selectedRunId` to trigger data fetch:

```tsx
const handleVerdictComplete = (runId: string) => {
  setSelectedRunId(runId);
};
```

## Data Flow Example

1. **Backend:** User initiates an ARL reasoning run
2. **Phase 7.9:** `runArl()` returns a `Verdict` with `reasoningTrace`
3. **arlStore:** Results are stored with a unique `runId`
4. **API Response:** Server returns verdict + runId to frontend
5. **Frontend:** CognitionPanel receives `selectedId={runId}`
6. **Fetch:** Panel makes 3 parallel requests to `/api/v1/cognition/arl/*`
7. **Render:** Three sections populate with trace steps, composite scores, drift vectors

## Stub Persistence

Currently, `arlStore` uses in-memory Maps. For production:

- Replace with database (PostgreSQL, MongoDB, etc.)
- Add TTL or cleanup for old runs
- Index by `runId` for fast retrieval
- Consider timeline views (last 24h, last week, etc.)

## Testing

Run test suite:

```bash
npm test -- tests/api/cognitionArlRoutes.test.ts
npm test -- tests/services/arlStore.test.ts
```

## Next Steps

- Phase 7.11: Weighting Model (assigns importance coefficients to each subsystem based on historical outcomes)
- Phase 7.12: Historical comparison (compare current run against baseline runs)
- Phase 7.13: Trend analysis (detect drift patterns over time)
