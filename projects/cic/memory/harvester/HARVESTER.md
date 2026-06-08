# Memory Harvester (Phase 23.3)

Collects events from CIC agents and emits them to MemoryStore.

## Usage

```typescript
import { MemoryHarvester } from "./memory-harvester";

const harvester = new MemoryHarvester({
  sourceAgent: "harvester",
  sessionId: "session_20260608_001",
  autoFlushIntervalMs: 30000,
});

// Register pipeline run
await harvester.registerPipelineEvent("ingestion", {
  pipeline_name: "ingestion",
  pipeline_id: "run_001",
  status: "success",
  start_time: new Date().toISOString(),
  end_time: new Date().toISOString(),
  duration_ms: 5000,
  items_processed: 754,
  items_successful: 754,
  items_failed: 0,
  metrics: {
    throughput_items_per_second: 150.8,
    error_rate_percent: 0,
    resource_usage_mb: 512,
  },
});

// Register agent telemetry
await harvester.registerTelemetryEvent({
  agent_name: "harvester",
  agent_class: "ingestion",
  status: "healthy",
  uptime_seconds: 3600,
  task_count: 100,
  task_success_rate: 0.99,
  performance: {
    avg_task_duration_ms: 50,
    p95_task_duration_ms: 200,
    cpu_usage_percent: 25,
    memory_usage_mb: 512,
    error_rate_percent: 1,
  },
});

// Flush to disk (automatic every 30 seconds)
await harvester.flush();

// Cleanup
harvester.destroy();
```

## Event Types

| Event Type | Retention | Use Case |
|-----------|-----------|----------|
| PIPELINE_RUN | 90 days | Track ingestion/extraction runs |
| AGENT_TELEMETRY | 90 days | Monitor agent health/performance |
| GOVERNANCE_SIGNAL | 365 days | Approval decisions, policy violations |
| APR_PLAN | 365 days | Planning decisions and task decomposition |
| CRO_RUN | 90 days | Task execution and runtime results |
| ARPS_DELTA | 90 days | Roadmap and prompt evolution |

## Auto-Flush

Harvester automatically flushes every 30 seconds by default. Configure:

```typescript
const harvester = new MemoryHarvester({
  autoFlushIntervalMs: 60000, // 1 minute
  autoFlushThreshold: 100,    // force flush at 100 events
});
```

## Integration Points

- **CIC Ingestion Pipeline** → registerPipelineEvent()
- **Agent Monitor** → registerTelemetryEvent()
- **Approval System** → registerGovernanceSignal()
- **APR Planner** → registerPlanEvent()
- **CRO Executor** → registerExecutionEvent()
- **ARPS Roadmap** → registerDeltaEvent()

