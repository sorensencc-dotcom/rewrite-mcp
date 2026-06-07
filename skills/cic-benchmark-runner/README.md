# CIC Benchmark Runner (45.2)

## Purpose
Automate RL benchmark pipeline with cost tracking, credit balance checking, and resumable runs.

Orchestrates multi-model, multi-dataset benchmarks against the Rewrite Labs pipeline, integrates with cost-optimizer for spend tracking, and supports resumable execution for long-running benchmarks.

## Input

```javascript
{
  "benchmarkSuite": "rewrite-labs-v2.3",      // Required: Suite identifier
  "model": "claude-opus-4",                    // Required: Model to benchmark
  "datasetSize": "full",                       // Required: "full", "sample", or "smoke"
  "parallelCount": 2,                          // Optional: 1-10 concurrent runs (default: 2)
  "creditLimit": 5000,                         // Optional: Max spend in USD (default: 5000)
  "resumeFromStep": "phase-3-run-5",           // Optional: Resume from checkpoint
  "outputPath": "/benchmarks/results/2026-06-07" // Required: Output directory
}
```

## Output

### Success Response
```javascript
{
  "success": true,
  "runId": "benchmark-1717762800000-abc12345",
  "benchmarkSuite": "rewrite-labs-v2.3",
  "model": "claude-opus-4",
  "datasetSize": "full",
  "status": "completed",
  "totalSteps": 5,
  "totalCost": 342.67,
  "elapsedMs": 1234567,
  "outputFile": "/benchmarks/results/2026-06-07/benchmark-abc12345.json",
  "results": {
    "passes": 5,
    "costPerStep": "68.53",
    "averageStepDuration": "246913"
  }
}
```

### Paused Response (Credit Limit)
```javascript
{
  "success": false,
  "reason": "Credit limit approaching",
  "runId": "benchmark-abc12345",
  "completedSteps": 3,
  "totalSteps": 5,
  "totalCost": 4500,
  "checkpoint": "phase-1-run-3",
  "message": "Paused at step 3. Resume with resumeFromStep: 'phase-1-run-3'"
}
```

### Error Response
```javascript
{
  "success": false,
  "error": "Invalid input: datasetSize must be one of: full, sample, smoke",
  "elapsedMs": 45
}
```

## Examples

### Run Full Benchmark Suite
```javascript
const result = await skill.invoke('cic-benchmark-runner', {
  benchmarkSuite: 'rewrite-labs-v2.3',
  model: 'claude-opus-4',
  datasetSize: 'full',
  creditLimit: 5000,
  outputPath: '/benchmarks/results/2026-06-07'
});
// → Runs all phases, tracks costs, writes results to JSON file
```

### Run Smoke Test (Quick Validation)
```javascript
const result = await skill.invoke('cic-benchmark-runner', {
  benchmarkSuite: 'rewrite-labs-v2.3',
  model: 'claude-opus-4',
  datasetSize: 'smoke',
  outputPath: '/benchmarks/results/quick-check'
});
// → Runs minimal dataset (10% of full), completes in ~2-3 minutes
```

### Resume Interrupted Benchmark
```javascript
const result = await skill.invoke('cic-benchmark-runner', {
  benchmarkSuite: 'rewrite-labs-v2.3',
  model: 'claude-opus-4',
  datasetSize: 'full',
  resumeFromStep: 'phase-2-run-4',  // Resumes from step 4
  creditLimit: 5000,
  outputPath: '/benchmarks/results/2026-06-07'
});
// → Skips completed phases, continues from phase-2-run-4
```

### Run with Parallel Execution
```javascript
const result = await skill.invoke('cic-benchmark-runner', {
  benchmarkSuite: 'rewrite-labs-v2.3',
  model: 'claude-sonnet-4',
  datasetSize: 'sample',
  parallelCount: 4,  // Run 4 benchmarks concurrently
  creditLimit: 2000,
  outputPath: '/benchmarks/results/parallel-run'
});
// → Executes 4 benchmarks in parallel, tracks aggregate cost
```

## Integration Points

### Dependencies
- **cost-optimizer** — Tracks benchmark execution costs, alerts on budget overages
- **rewrite-labs-orchestrator** — Monitors RL pipeline, detects stalls/failures
- **context-memory-manager** — Stores checkpoint state for resumable runs
- **environment-validator** — Pre-flight health check before benchmark start
- **approvals-audit** — Logs each benchmark run for compliance

### Data Flow
```
Input Validation
    ↓
Credit Balance Check (cost-optimizer)
    ↓
Load/Create Benchmark Run (context-memory-manager)
    ↓
Execute Phases (rewrite-labs-orchestrator)
    ├─→ Check cost budget (cost-optimizer)
    ├─→ Execute phase with parallelism
    ├─→ Track metrics (latency, success rate)
    └─→ Log costs
    ↓
Store Checkpoint (context-memory-manager)
    ↓
Write Results (outputPath)
    ↓
Return Summary
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|-----------|
| `Required field missing: X` | Input validation failed | Provide all required fields: benchmarkSuite, model, datasetSize, outputPath |
| `datasetSize must be one of...` | Invalid dataset size | Use "full", "sample", or "smoke" |
| `parallelCount must be between 1 and 10` | Invalid parallelism | Set parallelCount to 1-10 |
| `Insufficient credits` | Budget exhausted before start | Increase creditLimit or run with smaller datasetSize |
| `Credit limit approaching` | Budget exhausted mid-run | Resume with resumeFromStep at returned checkpoint |

## Performance

- **Smoke test:** ~2-3 minutes, $25-50
- **Sample benchmark:** ~20-30 minutes, $150-300
- **Full benchmark:** ~2-4 hours, $300-600
- **Parallel scaling:** 4 parallel runs reduce time by ~40% (cost scales linearly)

## Resumability

Benchmarks are fully resumable via checkpoints:

1. **Interruption detected** — skill detects credit limit or timeout
2. **Checkpoint saved** — step index and results stored in context-memory-manager
3. **Resume token generated** — e.g., "phase-3-run-5" returned in response
4. **Next invocation** — Pass resumeFromStep to restart from that point
5. **Continue execution** — Skips completed phases, continues to completion

## Monitoring

Check `/benchmarks/results/[date]/benchmark-[id].json` for detailed results:

```json
{
  "runId": "benchmark-...",
  "status": "completed",
  "totalCost": 342.67,
  "steps": [
    { "stepIndex": 0, "phaseId": "phase-0", "cost": 48.50, "duration": 245000 },
    { "stepIndex": 1, "phaseId": "phase-1", "cost": 65.30, "duration": 251000 }
  ],
  "results": {
    "phase-0": { "averageScore": "87.3", "averageLatency": "1234" },
    "phase-1": { "averageScore": "91.2", "averageLatency": "1456" }
  }
}
```

## Notes

- **Cost tracking:** Integrated with cost-optimizer; costs aggregated hourly
- **Concurrent limits:** Up to 10 parallel runs; rate limiting handled by RL API
- **Model support:** Tested with Opus 4, Sonnet 4; other models require validation
- **Dataset sizes:** "full" = 100% of data, "sample" = 10%, "smoke" = 1% (for quick validation)
