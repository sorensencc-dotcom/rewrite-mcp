---
title: Phase 23 Days 8–9 Execution Plan
subtitle: Pipeline Orchestrator & Agent Telemetry Integration
date: 2026-06-08 (Start)
status: READY FOR EXECUTION
---

# Days 8–9 Execution Plan: Pipeline + Telemetry Integration

**Goal:** Wire memory ingest into Pipeline Orchestrator and Agent Monitor to emit PIPELINE_RUN and AGENT_TELEMETRY events.

**Timeline:** 2 days (Jun 8–9)

**Dependencies:** Days 1-7 complete (Memory Layer + ARPS integration)

---

## WHAT TO BUILD

### 1. Pipeline Orchestrator Integration (Day 8)

**File:** Wire pipeline orchestrator to emit PIPELINE_RUN events on completion

**Work Items:**
- Locate pipeline orchestrator (Stability Dashboard orchestration layer)
- On pipeline completion, emit:
  ```typescript
  {
    id: "pipeline-run-{timestamp}-{random}",
    type: "pipeline.run",
    timestamp: new Date().toISOString(),
    payload: {
      pipeline_name: "ingestion" | "classification" | "processing",
      pipeline_id: string,
      status: "success" | "partial" | "failed",
      items_processed: number,
      items_successful: number,
      items_failed: number,
      duration_ms: number,
      throughput_items_per_second: number,
      error_rate_percent: number,
      error_summary?: string
    }
  }
  ```
- Integration point: After pipeline executor returns results
- Error handling: Non-critical (memory failure doesn't block pipeline)
- Test: 5 unit tests + 2 integration tests

**Definition of Done:**
- ✅ Pipeline orchestrator emits PIPELINE_RUN on completion
- ✅ Event payload includes: name, status, metrics
- ✅ Events persist to memory substrate
- ✅ 7 tests passing (unit + integration)

---

### 2. Agent Monitor Integration (Day 8)

**File:** Wire agent monitor to emit AGENT_TELEMETRY events on health checks

**Work Items:**
- Locate agent monitor/health check logic
- On periodic health check, emit:
  ```typescript
  {
    id: "agent-telemetry-{timestamp}-{random}",
    type: "agent.telemetry",
    timestamp: new Date().toISOString(),
    payload: {
      agent_name: string,
      agent_class: "ingestion" | "processing" | "reasoning" | "orchestration",
      status: "healthy" | "degraded" | "failed",
      uptime_seconds: number,
      task_count: number,
      task_success_rate: number,
      avg_task_duration_ms: number,
      p95_task_duration_ms: number,
      error_rate_percent: number,
      cpu_usage_percent: number,
      memory_usage_mb: number,
      last_error?: string
    }
  }
  ```
- Integration point: After agent health check completes
- Frequency: Hourly (or configurable)
- Error handling: Non-critical
- Test: 5 unit tests + 2 integration tests

**Definition of Done:**
- ✅ Agent monitor emits AGENT_TELEMETRY on health check
- ✅ Event payload includes: status, performance metrics, errors
- ✅ Events persist to memory substrate
- ✅ 7 tests passing (unit + integration)

---

### 3. Approval Handler Integration (Day 9)

**File:** Wire approval handler to emit GOVERNANCE_SIGNAL events

**Work Items:**
- Locate approval handler/decision logic
- On approval decision, emit:
  ```typescript
  {
    id: "governance-signal-{timestamp}-{random}",
    type: "governance.signal",
    timestamp: new Date().toISOString(),
    payload: {
      signal_type: "approval" | "rejection" | "escalation" | "policy_violation",
      entity_type: "skill" | "extraction" | "phase_write" | "cli_command",
      entity_id: string,
      decision: "approved" | "rejected" | "escalated",
      reason?: string,
      approval_count: number,
      approval_threshold: number,
      operator?: string,
      risk_level?: "low" | "medium" | "high"
    }
  }
  ```
- Integration point: After approval decision logic completes
- Error handling: Non-critical
- Test: 5 unit tests + 2 integration tests

**Definition of Done:**
- ✅ Approval handler emits GOVERNANCE_SIGNAL on decision
- ✅ Event payload includes: decision, reason, counts
- ✅ Events persist to memory substrate
- ✅ 7 tests passing (unit + integration)

---

### 4. Memory Query for Next Cycle (Day 9)

**File:** Enable queries for memory trends in decision-making

**Work Items:**
- Pipeline orchestrator can query: recent pipeline success rates
  - Query: `substrate.query({ type: 'pipeline.run' })`
  - Use: identify failing pipelines for alerting
  
- Agent monitor can query: agent degradation trends
  - Query: `substrate.query({ type: 'agent.telemetry' })`
  - Use: trigger escalation if agent failure rate spikes
  
- Approval handler can query: governance pattern trends
  - Query: `substrate.query({ type: 'governance.signal' })`
  - Use: auto-approve safe decisions if >90% historical approval rate

**Definition of Done:**
- ✅ Pipeline reads memory for success rate trends
- ✅ Agent monitor reads memory for degradation detection
- ✅ Approval handler reads memory for pattern-based decisions
- ✅ All query operations return results in <10ms

---

## FILE STRUCTURE

```
projects/cic/src/
├── pipeline-orchestrator/
│   └── memory-integration.ts         (NEW, ~80 lines)
├── agent-monitor/
│   └── memory-integration.ts         (NEW, ~80 lines)
├── approval-handler/
│   └── memory-integration.ts         (NEW, ~80 lines)
└── memory/
    └── [existing: MemorySubstrate, etc.]

projects/cic/tests/
└── agents/
    ├── pipeline-memory.integration.test.ts   (NEW, ~150 lines, 7 tests)
    ├── agent-telemetry.integration.test.ts   (NEW, ~150 lines, 7 tests)
    └── governance-signal.integration.test.ts (NEW, ~150 lines, 7 tests)
```

---

## SUCCESS CRITERIA

### Functional
- ✅ Pipeline orchestrator emits PIPELINE_RUN on any pipeline completion
- ✅ Agent monitor emits AGENT_TELEMETRY on health checks
- ✅ Approval handler emits GOVERNANCE_SIGNAL on decisions
- ✅ All events persist to memory substrate
- ✅ All events queryable via `substrate.query()`

### Quality
- ✅ All 21 tests passing (7 per integration)
- ✅ Code coverage >90%
- ✅ No integration regressions (existing tests still pass)
- ✅ Non-critical failure modes (memory issues don't break system)

### Performance
- ✅ Event emission: <1ms overhead
- ✅ Memory query: <10ms
- ✅ No observable latency increase in orchestrator/monitor

---

## TESTING STRATEGY

### Day 8 Tests (14 tests)

**Pipeline Integration (7 tests):**
1. ✅ Emit on successful pipeline completion
2. ✅ Emit on partial failure
3. ✅ Include metrics (throughput, error rate)
4. ✅ Handle pipeline errors gracefully
5. ✅ Query recent pipeline events
6. ✅ Calculate success rate from events
7. ✅ Non-critical failure (memory down)

**Agent Telemetry (7 tests):**
1. ✅ Emit on health check
2. ✅ Include performance metrics
3. ✅ Detect degradation signals
4. ✅ Handle missing metrics
5. ✅ Query agent history
6. ✅ Calculate uptime from events
7. ✅ Non-critical failure (memory down)

### Day 9 Tests (7 tests)

**Governance Signal (7 tests):**
1. ✅ Emit on approval decision
2. ✅ Emit on rejection
3. ✅ Include approval count/threshold
4. ✅ Query decision history
5. ✅ Calculate approval rate from events
6. ✅ Auto-approve pattern detection
7. ✅ Non-critical failure (memory down)

---

## EDGE CASES

1. **Pipeline with 0 items processed** → still emit, status="success", metrics valid
2. **Agent never checked before** → emit with uptime=0, no previous errors
3. **Approval handler first decision** → approval_count starts at 1
4. **Memory substrate file missing** → emit fails gracefully, logged as warning
5. **Query returns 0 events** → return empty array, don't error
6. **Event timestamp out of order** → store with provided timestamp, don't validate order

---

## INTEGRATION POINTS

### Pipeline Orchestrator
```typescript
// After pipeline execution completes
await orchestrator.emitPipelineRun({
  pipeline_name: orchestrator.name,
  status: results.success ? 'success' : 'failed',
  items_processed: results.count,
  items_successful: results.successful,
  items_failed: results.failed,
  duration_ms: endTime - startTime,
  // ... metrics
});

// Before next pipeline run
const trends = substrate.query({ type: 'pipeline.run' });
const successRate = trends.filter(t => t.payload.status === 'success').length / trends.length;
if (successRate < 0.95) {
  console.warn('Pipeline success rate degrading');
}
```

### Agent Monitor
```typescript
// On health check
await monitor.emitAgentTelemetry({
  agent_name: agent.name,
  status: health.errorRate < 0.05 ? 'healthy' : 'degraded',
  // ... performance metrics
});

// For alerting
const agentEvents = substrate.query({ type: 'agent.telemetry' });
const recentFailures = agentEvents.filter(e => e.payload.status === 'failed');
if (recentFailures.length > 2) {
  // Escalate
}
```

### Approval Handler
```typescript
// On decision
await handler.emitGovernanceSignal({
  signal_type: 'approval',
  decision: 'approved',
  // ... metadata
});

// For pattern-based decisions
const approvalHistory = substrate.query({ type: 'governance.signal' });
const approvalRate = approvalHistory.filter(e => e.payload.decision === 'approved').length / approvalHistory.length;
if (approvalRate > 0.9 && riskLevel === 'low') {
  // Auto-approve
}
```

---

## ROLLBACK PLAN

If any integration causes issues:

1. **Disable emission:** Comment out `emit*()` call in orchestrator/monitor/handler
2. **Clear memory log:** Delete `.artifacts/memory/ledger.jsonl`
3. **Revert commits:** `git revert` to pre-integration state
4. **Investigate:** Check error logs, fix, then re-integrate

---

## OWNER SIGN-OFF

Days 8-9 ready to begin. Memory layer (Days 1-7) provides stable foundation. ARPS integration (Days 6-7) validated feedback loop. Now ready to extend memory capture to pipeline, agents, governance.

**Confidence:** 95% (test infrastructure in place, patterns proven in Days 6-7)

---

**Status:** READY FOR EXECUTION TODAY
