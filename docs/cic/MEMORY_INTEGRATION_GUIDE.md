---
title: Memory Layer Integration Guide
version: 1.0.0
date: 2026-06-07
---

# Memory Layer Integration Guide

**For:** ARPS, Stability Dashboard, Pipeline Orchestrator, Approval Handler, APR, CRO

**Goal:** Wire memory ingest and query into CIC's subsystems.

---

## QUICK START

### 1. Set Up Memory Layer in Express App

```typescript
import express from 'express';
import {
  getMemoryStore,
  getMemoryHarvester,
  getMemorySynthesizer,
  createMemoryIngestRouter,
  createMemoryQueryRouter,
} from '@cic/memory';

const app = express();

// Initialize memory layer
async function setupMemory() {
  const store = await getMemoryStore();
  const harvester = await getMemoryHarvester();
  const synthesizer = await getMemorySynthesizer(store);

  // Mount ingest API
  app.use('/memory', createMemoryIngestRouter(harvester));

  // Mount query API
  app.use('/memory', createMemoryQueryRouter(store, synthesizer));

  return { store, harvester, synthesizer };
}

await setupMemory();
app.listen(3000);
```

---

## INTEGRATION POINTS

### 1. ARPS (Autonomous Reasoning & Prompt Synthesis)

**When:** After roadmap/prompt is rewritten

**What to emit:** ARPS_DELTA event

```typescript
import { getMemoryHarvester } from '@cic/memory';

async function synthesizePrompt(goal: string) {
  const harvester = await getMemoryHarvester();

  // ... existing ARPS logic ...

  // After rewriting roadmap
  await harvester.ingestEvent({
    event_type: 'ARPS_DELTA',
    source_agent: 'arps_synthesizer',
    payload: {
      change_type: 'phase_completion', // or 'prompt_rewrite', 'instruction_update'
      phase_id: '23.1',
      old_value: previousRoadmapState,
      new_value: newRoadmapState,
      git_commit: getLatestCommit(),
      confidence: 1.0,
      affected_subsystems: ['Roadmap', 'Phase Tracking'],
    },
    retention_days: 90,
  });
}
```

---

### 2. Stability Dashboard & Pipeline Orchestrator

**When:** Ingestion, classification, or processing pipeline completes

**What to emit:** PIPELINE_RUN event

```typescript
import { getMemoryHarvester } from '@cic/memory';

async function runPipeline() {
  const harvester = await getMemoryHarvester();
  const startTime = new Date();

  try {
    // ... run pipeline ...
    const processed = 150;
    const successful = 148;
    const failed = 2;

    const endTime = new Date();

    await harvester.ingestEvent({
      event_type: 'PIPELINE_RUN',
      source_agent: 'pipeline_orchestrator',
      payload: {
        pipeline_name: 'ingestion', // or 'classification', 'processing'
        pipeline_id: `run_${Date.now()}`,
        status: failed === 0 ? 'success' : 'partial',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_ms: endTime.getTime() - startTime.getTime(),
        items_processed: processed,
        items_successful: successful,
        items_failed: failed,
        error_summary: failed > 0 ? 'OCR confidence threshold failures' : null,
        metrics: {
          throughput_items_per_second: processed / ((endTime.getTime() - startTime.getTime()) / 1000),
          error_rate_percent: (failed / processed) * 100,
          resource_usage_mb: process.memoryUsage().heapUsed / 1024 / 1024,
        },
        failed_items: failedDocs.map(d => ({
          item_id: d.id,
          error: d.error,
          severity: 'medium',
        })),
      },
      retention_days: 90,
    });
  } catch (error) {
    // Log error to memory
  }
}
```

---

### 3. Agent Monitor (Telemetry)

**When:** Agent health check runs periodically

**What to emit:** AGENT_TELEMETRY event

```typescript
import { getMemoryHarvester } from '@cic/memory';

async function checkAgentHealth(agent: Agent) {
  const harvester = await getMemoryHarvester();

  const health = await agent.getHealth();

  await harvester.ingestEvent({
    event_type: 'AGENT_TELEMETRY',
    source_agent: 'agent_monitor',
    payload: {
      agent_name: agent.name,
      agent_class: agent.class, // 'ingestion', 'processing', 'reasoning', etc.
      status: health.errorRate < 0.05 ? 'healthy' : health.errorRate < 0.15 ? 'degraded' : 'failed',
      uptime_seconds: health.uptime,
      task_count: health.tasksProcessed,
      task_success_rate: health.successRate,
      last_error: health.lastError?.message || null,
      last_error_time: health.lastError?.timestamp || null,
      performance: {
        avg_task_duration_ms: health.avgDuration,
        p95_task_duration_ms: health.p95Duration,
        cpu_usage_percent: health.cpuUsage,
        memory_usage_mb: health.memoryUsage,
        error_rate_percent: health.errorRate * 100,
      },
      degradation_reason: health.reason || null,
    },
    retention_days: 90,
  });
}
```

---

### 4. Approval Handler (Governance)

**When:** Approval decision is made

**What to emit:** GOVERNANCE_SIGNAL event

```typescript
import { getMemoryHarvester } from '@cic/memory';

async function handleApproval(request: ApprovalRequest, decision: 'approved' | 'rejected') {
  const harvester = await getMemoryHarvester();

  await harvester.ingestEvent({
    event_type: 'GOVERNANCE_SIGNAL',
    source_agent: 'approval_handler',
    payload: {
      signal_type: 'approval', // or 'rejection', 'escalation', 'threshold_crossed'
      entity_type: 'skill', // or 'extraction', 'phase_write', 'cli_command'
      entity_id: request.skillId,
      decision: decision,
      reason: `Auto-approved after 3rd occurrence`,
      operator: getCurrentOperator() || null,
      approval_count: 3,
      approval_threshold: 2,
      metadata: {
        skill_path: request.skillPath,
        permission_tier: request.tier,
        risk_level: request.riskLevel,
      },
    },
    retention_days: 365, // Governance signals kept longer
  });
}
```

---

### 5. Autonomous Planner (APR)

**When:** Planning engine generates a plan

**What to emit:** APR_PLAN event

```typescript
import { getMemoryHarvester } from '@cic/memory';

async function generatePlan(goal: string) {
  const harvester = await getMemoryHarvester();

  const plan = await planningEngine.createPlan({
    goal: goal,
    constraints: currentConstraints,
  });

  await harvester.ingestEvent({
    event_type: 'APR_PLAN',
    source_agent: 'autonomous_planner',
    payload: {
      plan_id: plan.id,
      goal: goal,
      plan_type: 'feature_development', // or 'bug_fix', 'optimization'
      status: 'generated',
      task_count: plan.tasks.length,
      task_graph: plan.tasks.map(t => ({
        id: t.id,
        name: t.name,
        depends_on: t.dependencies,
        estimated_effort_hours: t.effortEstimate,
      })),
      critical_path_hours: plan.criticalPath,
      risk_level: plan.riskLevel, // 'low', 'medium', 'high'
      risk_factors: plan.risks,
      agent_consensus_score: plan.consensusScore,
      agents_involved: plan.agentsInvolved,
    },
    retention_days: 365,
  });
}
```

---

### 6. Runtime Orchestrator (CRO)

**When:** Execution run completes

**What to emit:** CRO_RUN event

```typescript
import { getMemoryHarvester } from '@cic/memory';

async function executeRun(plan: Plan) {
  const harvester = await getMemoryHarvester();
  const startTime = new Date();

  const results = await executor.runPlan(plan, {
    onStepComplete: (step) => { /* ... */ },
  });

  const endTime = new Date();

  await harvester.ingestEvent({
    event_type: 'CRO_RUN',
    source_agent: 'runtime_orchestrator',
    payload: {
      run_id: `run_${Date.now()}`,
      plan_id: plan.id,
      status: results.succeeded ? 'completed' : results.partialSuccess ? 'partial' : 'failed',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_ms: endTime.getTime() - startTime.getTime(),
      step_count: results.steps.length,
      step_results: results.steps.map(s => ({
        step_id: s.id,
        task_id: s.taskId,
        agent_name: s.agentName,
        status: s.status,
        start_time: s.startTime.toISOString(),
        end_time: s.endTime.toISOString(),
        duration_ms: s.endTime.getTime() - s.startTime.getTime(),
        output_size_bytes: JSON.stringify(s.output).length,
        error: s.error?.message || null,
      })),
      failure_info: results.failure ? { reason: results.failure.reason } : null,
      recovery_action: results.recovery || null,
    },
    retention_days: 90,
  });
}
```

---

## READING FROM MEMORY

### From APR (Autonomous Planner)

Use historical task success rates to bias planning:

```typescript
import { getMemoryStore } from '@cic/memory';

async function planWithHistory(goal: string) {
  const store = await getMemoryStore();

  // Get recent CRO runs
  const recentRuns = await store.query({
    event_type: 'CRO_RUN',
    limit: 50,
  });

  // Calculate agent success rate
  const agentStats: Record<string, { success: number; total: number }> = {};
  for (const run of recentRuns) {
    const payload = run.payload as any;
    for (const step of payload.step_results) {
      const agent = step.agent_name;
      if (!agentStats[agent]) {
        agentStats[agent] = { success: 0, total: 0 };
      }
      agentStats[agent].total++;
      if (step.status === 'success') {
        agentStats[agent].success++;
      }
    }
  }

  // Use success rates to route tasks
  const plan = await planningEngine.createPlan({
    goal,
    agentSuccessRates: agentStats,
  });

  return plan;
}
```

### From CRO (Runtime Orchestrator)

Use trend data to detect failures:

```typescript
import { getMemorySynthesizer } from '@cic/memory';

async function monitorExecution(run: Run) {
  const synthesizer = await getMemorySynthesizer();

  const summaries = await synthesizer.getRecentWeeklySummaries(1);
  const weeklyTrend = summaries[0]?.trend;

  if (weeklyTrend === 'degrading') {
    // Alert operator, consider rollback
    console.warn('System trending degraded - execution high risk');
  }

  return run;
}
```

### From Command Center (Dashboard)

Display memory insights:

```typescript
import { createMemoryQueryRouter } from '@cic/memory';

// In your dashboard API:
const router = createMemoryQueryRouter(store, synthesizer);

// Use these endpoints:
// GET /memory/events - raw events
// GET /memory/summaries - weekly/monthly summaries
// GET /memory/trends - trend analysis
// GET /memory/insights - high-level insights
// GET /memory/stats - memory store stats
```

---

## SCHEDULING SYNTHESIS

### Weekly Summary (Every Monday 8am)

```typescript
import { CronJob } from 'cron';
import { getMemorySynthesizer } from '@cic/memory';

const job = new CronJob('0 8 * * 1', async () => {
  const synthesizer = await getMemorySynthesizer();
  const summary = await synthesizer.generateWeeklySummary();
  console.log('Weekly summary generated:', summary.id);
  // Optionally: notify operator, log to file, etc.
});

job.start();
```

### Monthly Summary (1st of month 9am)

```typescript
const job = new CronJob('0 9 1 * *', async () => {
  const synthesizer = await getMemorySynthesizer();
  const summary = await synthesizer.generateMonthlySummary();
  console.log('Monthly summary generated:', summary.id);
});

job.start();
```

---

## QUERY EXAMPLES

### Get all events from last 7 days

```typescript
const store = await getMemoryStore();
const events = await store.getRecent(7);
```

### Find events by correlation ID (trace)

```typescript
const events = await store.query({
  correlation_id: 'corr_phase23_kickoff',
});
```

### Get all ARPS deltas in current session

```typescript
const events = await store.query({
  event_type: 'ARPS_DELTA',
  session_id: 'session_20260607_001',
});
```

### Get agent performance stats

```typescript
const agentEvents = await store.query({
  event_type: 'AGENT_TELEMETRY',
  source_agent: 'mla_harvester',
  limit: 100,
});

const healthyCount = agentEvents.filter(
  (e: any) => e.payload.status === 'healthy'
).length;
```

---

## ERROR HANDLING

All ingest failures are logged but don't break the system:

```typescript
const result = await harvester.ingestEvent({
  event_type: 'PIPELINE_RUN',
  source_agent: 'test',
  payload: { /* ... */ },
});

if (result.status === 'error') {
  console.error('Memory ingest failed:', result.error);
  // Continue anyway - memory is optional, not critical
}
```

---

## PERFORMANCE TARGETS

| Operation | Target | Status |
|-----------|--------|--------|
| Append event | <10ms | ✅ |
| Query (date + type) | <100ms | ✅ |
| Weekly summarize | <30s | ✅ |
| Monthly summarize | <60s | ✅ |
| Store file size (90d) | <100MB | ✅ |

---

## NEXT STEPS (Days 6–12)

1. **Days 6–7:** Wire ARPS ingest + test feedback loop
2. **Days 8–9:** Wire pipeline + telemetry ingest
3. **Days 10–11:** Build Memory Explorer UI in Command Center
4. **Day 12:** Memory-driven autonomy (proposals)

---

**Status:** Phase 23 ready for system integration (Days 4–5 complete)

