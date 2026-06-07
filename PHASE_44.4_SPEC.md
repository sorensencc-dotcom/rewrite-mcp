# Phase 44.4 — Autonomous Orchestrator

**Status:** ✅ **APPROVED** — Ready to implement (Tier 2, after Skills Policy Agent)  
**Timeline:** 4-6 hours (on approval)  
**Owner:** Claude Code Engineering  
**Date Blocked:** 2026-06-05

---

## Overview

Autonomous orchestrator that runs workflows on schedule and in response to triggers (alerts, metrics, events). Enables self-healing, proactive maintenance, and unattended operation.

---

## Sub-Phases

### 44.4.0 — Scheduler Module

**Objective:** Time-based workflow invocation

**Deliverables:**
- `skills-runtime/scheduler.js` (150 lines)
  - Cron expression parsing (via cron-parser npm)
  - Interval-based scheduling
  - Timezone support
  - Pause/resume/skip capabilities

**API:**
```javascript
scheduler.schedule(workflowId, schedule, { timezone, metadata })
scheduler.unschedule(workflowId, scheduleId)
scheduler.listSchedules(workflowId)
scheduler.trigger(scheduleId) // manual run
```

**Example:**
```javascript
// Run phase summary every Monday at 9 AM UTC
scheduler.schedule('phase-summary-roadmap', '0 9 * * 1', { timezone: 'UTC' })

// Run environment check every 6 hours
scheduler.schedule('environment-check-procedure', '0 */6 * * *')
```

**Tests:** 12 tests
- Valid cron expressions
- Invalid schedule rejection
- Schedule execution triggering
- Timezone handling
- Pause/resume state

---

### 44.4.1 — Trigger Engine

**Objective:** Event-driven workflow invocation

**Deliverables:**
- `skills-runtime/trigger-engine.js` (200 lines)
  - Alert triggers (error, warning, critical)
  - Metric triggers (health score drops below threshold)
  - Event triggers (custom event emissions)
  - Context triggers (memory usage, time since last run)

**API:**
```javascript
triggerEngine.onAlert(severity, handler) // 'error' | 'warning' | 'critical'
triggerEngine.onMetric(metric, operator, value, handler) // 'health', '<', 0.5
triggerEngine.onEvent(eventName, handler)
triggerEngine.onContext(condition, handler) // { type: 'memory', threshold: 80 }
triggerEngine.emit(eventName, data)
```

**Example:**
```javascript
// Run recovery workflow when health drops below 70%
triggerEngine.onMetric('health', '<', 0.7, async () => {
  await runtime.invokeSkill('recovery-workflow', {})
})

// Run diagnostics on any error alert
triggerEngine.onAlert('error', async (alert) => {
  await runtime.invokeWorkflow('environment-check-procedure', {
    logs: [alert]
  })
})

// Custom event
triggerEngine.onEvent('drift-detected', async (drift) => {
  await runtime.invokeSkill('agent-drift-detector', drift)
})
```

**Tests:** 14 tests
- Alert triggering
- Metric threshold detection
- Event emission
- Handler execution
- Trigger deduplication (no duplicate runs in 5s)

---

### 44.4.2 — Decision Engine

**Objective:** Intelligent workflow selection based on context

**Deliverables:**
- `skills-runtime/decision-engine.js` (180 lines)
  - Workflow selection rules
  - Parameter inference from context
  - Conflict resolution (multiple triggers)
  - Priority ordering

**API:**
```javascript
decisionEngine.rule(condition, workflowId, parameterMapping)
decisionEngine.selectWorkflow(context) // → { workflowId, params, priority }
decisionEngine.execute(context) // → executes selected workflow
```

**Example:**
```javascript
// If environment check fails, run diagnostics
decisionEngine.rule(
  (ctx) => ctx.lastWorkflowStatus === 'failed' && ctx.workflowId === 'environment-check',
  'environment-diagnostics',
  (ctx) => ({ envConfig: ctx.envConfig, logs: ctx.diagnosticLogs })
)

// If drift detected, update roadmap
decisionEngine.rule(
  (ctx) => ctx.driftScore > 0.8,
  'cic-roadmap-updater',
  (ctx) => ({ phaseId: ctx.phaseId, driftDetails: ctx.drift })
)

// Priority: health recovery > roadmap update > routine check
decisionEngine.setPriority('environment-diagnostics', 1)
decisionEngine.setPriority('cic-roadmap-updater', 2)
decisionEngine.setPriority('phase-summary-roadmap', 3)
```

**Tests:** 11 tests
- Rule matching
- Parameter inference
- Priority resolution
- Conflict handling
- Fallback selection

---

### 44.4.3 — Recovery Manager

**Objective:** Handle failures, retries, rollbacks

**Deliverables:**
- `skills-runtime/recovery-manager.js` (140 lines)
  - Retry logic with exponential backoff
  - Rollback to previous state
  - Failure notification
  - Recovery workflows

**API:**
```javascript
recoveryManager.retry(workflowId, params, { maxRetries: 3, backoff: 'exponential' })
recoveryManager.rollback(workflowId, snapshot)
recoveryManager.onFailure(workflowId, handler)
recoveryManager.getLastSnapshot(workflowId)
```

**Example:**
```javascript
// Retry failed workflow up to 3 times with exponential backoff
try {
  await recoveryManager.retry('phase-summary-roadmap', params, {
    maxRetries: 3,
    backoffMs: 1000,
    backoffMultiplier: 2
  })
} catch (error) {
  // If all retries fail, rollback to previous snapshot
  const lastSnapshot = recoveryManager.getLastSnapshot('phase-summary-roadmap')
  await recoveryManager.rollback('phase-summary-roadmap', lastSnapshot)
  
  // Notify operators
  await notificationManager.alert('critical', {
    workflow: 'phase-summary-roadmap',
    error: error.message,
    snapshot: lastSnapshot
  })
}

// On failure, trigger recovery workflow
recoveryManager.onFailure('phase-summary-roadmap', async (error) => {
  await triggerEngine.emit('workflow-failed', {
    workflow: 'phase-summary-roadmap',
    error
  })
})
```

**Tests:** 11 tests
- Retry with backoff
- Rollback state restoration
- Failure notifications
- Last snapshot retrieval
- Idempotency

---

### 44.4.4 — Orchestrator Runtime

**Objective:** Main runtime integrating scheduler, triggers, decision engine, recovery

**Deliverables:**
- `skills-runtime/orchestrator.js` (200 lines)
  - Unified API for all 4 modules
  - State machine for workflow execution
  - Telemetry integration
  - Dashboard updates

**API:**
```javascript
orchestrator.start() // begin listening for schedules + triggers
orchestrator.stop()
orchestrator.getStatus() // → { activeWorkflows, nextScheduled, alertsActive }
orchestrator.getHistory() // → recent executions + outcomes
orchestrator.pause(workflowId)
orchestrator.resume(workflowId)
```

**Example:**
```javascript
const orchestrator = new Orchestrator({
  runtime,
  telemetry: extendedTelemetry,
  maxConcurrent: 3
})

await orchestrator.start()

// Set up schedules
orchestrator.schedule('phase-summary-roadmap', '0 9 * * 1') // Monday 9 AM
orchestrator.schedule('environment-check-procedure', '0 */6 * * *') // Every 6h

// Set up triggers
orchestrator.onAlert('critical', async (alert) => {
  const selected = orchestrator.selectWorkflow({
    alertSeverity: 'critical',
    context: orchestrator.getSystemContext()
  })
  await orchestrator.execute(selected.workflowId, selected.params)
})

// Get status for dashboard
const status = orchestrator.getStatus()
// → {
//   activeWorkflows: ['phase-summary-roadmap'],
//   nextScheduled: { id: 'env-check-1', runsIn: 3600000 },
//   alertsActive: [{ severity: 'warning', message: 'High memory usage' }],
//   history: [...]
// }
```

**Tests:** 16 tests
- Orchestrator startup/shutdown
- Schedule execution
- Trigger handling
- Decision engine integration
- Recovery on failure
- State persistence
- Dashboard data export

---

## Integration Points

1. **Skill Runtime** — `orchestrator.invokeWorkflow()` chains to `runtime.invokeSkill()`
2. **Extended Telemetry** — Record all orchestrator invocations, durations, success rates
3. **Unified Status** — Health snapshot includes orchestrator status
4. **Operator Console** — Display active schedules, recent triggers, execution history
5. **HTTP Gateway** — REST endpoints for schedule management

---

## Dependencies

- `cron-parser` (npm) — Parse cron expressions
- `luxon` (npm) — Timezone-aware scheduling

---

## Testing Strategy

- **Unit Tests:** Each module tested independently (54 tests total)
- **Integration Tests:** Modules working together (16 tests)
- **Simulation:** Run 1-week simulation with fake time (verify no collisions)
- **Manual Testing:** Observe real executions via dashboard

---

## Deployment

- Deploy same way as skills runtime
- Add 2 new npm scripts:
  - `npm run orchestrator:start` — Start autonomous orchestrator
  - `npm run orchestrator:stop` — Graceful shutdown

---

## Success Criteria

- ✅ All 70 tests passing
- ✅ Schedules execute within 5 seconds of scheduled time
- ✅ Triggers fire within 100ms of event
- ✅ No duplicate executions
- ✅ Graceful failure recovery (retry + rollback)
- ✅ Dashboard shows real-time orchestrator status
- ✅ Can pause/resume workflows via console

---

## Blockers & Prerequisites

- ✅ Phase 44.0-44.5 complete (all skills, workflows, telemetry)
- ⏳ Approval to proceed
- ⏳ Skills Policy Agent spec finalized (related requirement)

**Status:** 🔴 BLOCKED — Waiting for approval

---

**Next Step:** Approve Phase 44.4 to proceed with implementation
