# MEE Phase Executor (45.1)

## Purpose
Execute MEE phases (43–45) with state tracking, resumable execution, and progress visibility.

Orchestrates complex multi-phase Meta-Evolution Engine workflows with automatic checkpointing, cost tracking, timeout handling, and resumable execution. Supports both sequential and parallel phase execution with comprehensive error handling and rollback capabilities.

## Input

```javascript
{
  "phaseList": ["43", "44", "45"],        // Required: phases to execute
  "mode": "sequential",                    // Optional: "sequential" or "parallel" (default: sequential)
  "resumeFromStep": "phase-45-step-12",   // Optional: resume from checkpoint
  "costBudget": 5000,                     // Optional: max spend in USD (default: 5000)
  "timeout": 3600000,                     // Optional: max time in ms (default: 1h)
  "checkpointInterval": 300000,           // Optional: checkpoint every 5m (default: 5m)
  "rollbackOnError": true                 // Optional: auto-rollback on failure (default: true)
}
```

## Output

### Success Response
```javascript
{
  "success": true,
  "executionId": "exec-1717762800000-abc12345",
  "state": "completed",
  "phaseList": ["43", "44", "45"],
  "mode": "sequential",
  "totalSteps": 3,
  "completedSteps": 3,
  "totalCost": 187.50,
  "elapsedMs": 245000,
  "results": {
    "allPassed": true,
    "phasesExecuted": 3,
    "averageCostPerPhase": "62.50",
    "checkpointsCreated": 3
  }
}
```

### Paused Response (Budget/Timeout)
```javascript
{
  "success": false,
  "reason": "Cost budget approaching",
  "executionId": "exec-abc12345",
  "state": "paused",
  "completedSteps": 2,
  "totalSteps": 3,
  "totalCost": 4500,
  "lastCheckpoint": "phase-44-step-2",
  "message": "Paused at step 2. Resume with resumeFromStep: 'phase-44-step-2'",
  "checkpoint": "phase-44-step-2"
}
```

### Rollback Response (Error)
```javascript
{
  "success": false,
  "reason": "Phase failed, rolled back to checkpoint",
  "executionId": "exec-abc12345",
  "rollbackTo": "phase-44-step-2",
  "completedSteps": 2,
  "totalSteps": 3,
  "totalCost": 125.00
}
```

## Examples

### Execute Three Phases Sequentially
```javascript
const result = await skill.invoke('mee-phase-executor', {
  phaseList: ['43', '44', '45'],
  mode: 'sequential',
  costBudget: 5000,
  timeout: 3600000
});
// → Executes phases in order, saves checkpoints every 5 minutes
```

### Execute with Custom Checkpoint Interval
```javascript
const result = await skill.invoke('mee-phase-executor', {
  phaseList: ['45'],
  mode: 'sequential',
  checkpointInterval: 120000,  // Save checkpoint every 2 minutes
  costBudget: 2000,
  timeout: 1800000
});
// → Checkpoints more frequently for long-running phase
```

### Resume from Checkpoint
```javascript
const result = await skill.invoke('mee-phase-executor', {
  phaseList: ['43', '44', '45'],
  resumeFromStep: 'phase-44-step-2',  // Resume from previous checkpoint
  costBudget: 5000,
  timeout: 3600000
});
// → Skips completed phases, continues from phase-44-step-2
```

### Execute Phases in Parallel
```javascript
const result = await skill.invoke('mee-phase-executor', {
  phaseList: ['43', '44', '45'],
  mode: 'parallel',  // Run all 3 phases concurrently
  costBudget: 5000,
  timeout: 1800000
});
// → All phases execute in parallel, faster overall completion
```

### Execute with Aggressive Timeout
```javascript
const result = await skill.invoke('mee-phase-executor', {
  phaseList: ['45'],
  mode: 'sequential',
  timeout: 600000,  // 10 minute hard limit
  costBudget: 3000,
  rollbackOnError: true
});
// → Pauses if timeout exceeded; can resume later
```

## Integration Points

### Dependencies
- **context-memory-manager** — Stores checkpoint state, execution metadata, results
- **cost-optimizer** — Tracks phase execution costs, alerts on budget overages
- **session-boundary-manager** — Detects session overflow (frequent checkpointing)
- **approvals-audit** — Logs each phase execution for compliance

### Data Flow
```
Input Validation
    ↓
Load/Create Execution Context (context-memory-manager)
    ↓
Enter State Machine (PENDING → RUNNING)
    ↓
For Each Phase:
    ├─→ Check timeout
    ├─→ Check cost budget
    ├─→ Execute phase
    ├─→ Capture results + costs
    ├─→ Save checkpoint (context-memory-manager)
    └─→ Handle error (rollback if enabled)
    ↓
Finalize State (COMPLETED/PAUSED/FAILED/ROLLED_BACK)
    ↓
Return Results + Checkpoint
```

## State Machine

```
IDLE
  ↓
PENDING (input validation, context setup)
  ↓
RUNNING (executing phases, checkpointing)
  ├─→ Phase error + rollback enabled → ROLLED_BACK → (can resume)
  ├─→ Phase error + no rollback → FAILED → (terminal)
  ├─→ Budget exhausted → PAUSED → (can resume)
  ├─→ Timeout exceeded → PAUSED → (can resume)
  └─→ All phases completed → COMPLETED → (terminal)
```

## Checkpointing Strategy

**Frequency:** Every 5 minutes (configurable)

**What's Saved:**
- Current step index
- Phase ID
- Execution state (RUNNING, PAUSED, etc.)
- Costs to date
- Results of completed phases
- Errors encountered

**Resume Behavior:**
- Skips all completed phases
- Resumes from checkpoint step
- Maintains cost/state continuity
- Continues with same budget/timeout

## Error Handling

| Error | Cause | Rollback Behavior |
|-------|-------|------------------|
| Phase execution fails | MEE phase error | Rollback to checkpoint, return rollback-state |
| Cost budget exceeded | Spend approaching limit | Pause execution, save checkpoint, allow resume |
| Timeout exceeded | Execution time limit reached | Pause execution, save checkpoint, allow resume |
| Context not found | Checkpoint corrupted/lost | Re-initialize from phase list |
| Invalid mode | Bad input | Reject immediately |

## Performance

- **Single phase:** ~30-90 seconds (simulated)
- **Three phases sequential:** ~2-4 minutes
- **Three phases parallel:** ~45 seconds-2 minutes
- **Checkpoint overhead:** <100ms per checkpoint
- **State memory per execution:** ~5-10KB

## Monitoring

Check execution state via execution ID (stored in context-memory-manager):

```javascript
// After execution completes or pauses
const execution = await contextMemory.retrieve('executions', executionId);
console.log(execution.state);      // "completed", "paused", "failed", etc.
console.log(execution.costs.total);  // Aggregate cost
console.log(execution.checkpoints);  // Array of checkpoint keys
console.log(execution.errors);       // Array of errors encountered
```

## Notes

- **State persistence:** All execution state saved to context-memory-manager (survives session restart)
- **Cost tracking:** Integrated with cost-optimizer; costs aggregated hourly
- **Concurrency:** Sequential execution is safer; parallel is faster but needs conflict handling
- **Budget enforcement:** 90% threshold triggers pause before hard 100% limit
- **Timeout handling:** Pauses cleanly, allows resumption with same configuration
- **Rollback safety:** Only rollbacks if checkpoint exists and is valid
