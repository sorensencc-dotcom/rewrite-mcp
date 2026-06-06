# PHASE H ARCHITECTURE BLUEPRINT
**Autonomous Execution + Self-Healing CIC**

Phase H is where the system shifts from operator-driven to operator-guided. CIC becomes a living, autonomous system that:
- Detects failures and self-heals
- Schedules its own execution
- Learns from outcomes
- Escalates only when necessary

---

## System Architecture

### New Services (Phase H Introduces)

```
src/
  services/
    AutonomousExecutor.ts       ← Trigger-based execution scheduler
    FailureDetector.ts          ← Identifies failures in traces/metrics
    RemediationEngine.ts        ← Applies known fixes (restart, reconfig, etc.)
    EscalationRouter.ts         ← Routes incidents to human operators
    HealthMonitor.ts            ← Continuous health checks
    TriggerEvaluator.ts         ← Evaluates execution triggers
```

### Event-Driven Architecture

```
Message Bus (RabbitMQ / Kafka)
├── execution.started
├── execution.completed
├── execution.failed
├── trace.received
├── metrics.aggregated
├── failure.detected
├── remediation.applied
├── recommendation.approved
├── threshold.changed
└── drift.corrected
```

### State Machines

#### Execution State Machine
```
IDLE
  ↓
QUEUED (trigger matched)
  ↓
RUNNING (CIC pipeline executing)
  ├→ SUCCESS → log outcome, learn
  ├→ FAILURE → detect failure → attempt remediation
  │   ├→ RECOVERED → log recovery, learn
  │   └→ UNRECOVERABLE → escalate to human
  └→ TIMEOUT → kill execution, escalate
```

#### Health State Machine
```
HEALTHY
  ↓ (failures detected)
  ↓
DEGRADED
  ├→ remediation applied
  ├→ RECOVERING (healing in progress)
  │   ├→ HEALTHY (recovered)
  │   └→ FAILED (remediation unsuccessful)
  │       → ESCALATED (human intervention needed)
  └→ HEALTHY (auto-recovered)
```

---

## Core Services

### 1. AutonomousExecutor

**Purpose:** Schedule and run CIC pipelines based on triggers.

**Implementation:**
```typescript
export class AutonomousExecutor {
  async evaluateAndExecute(): Promise<void> {
    const triggers = await this.getTriggers();
    
    for (const trigger of triggers) {
      if (await this.shouldExecute(trigger)) {
        const executionId = await this.queue(trigger);
        await this.execute(executionId);
      }
    }
  }

  private async execute(executionId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      const result = await this.pipeline.run();
      await this.recordSuccess(executionId, result);
    } catch (err) {
      const isDriftFailure = await this.detector.isGovernanceDrift(err);
      const isTransient = await this.detector.isTransientFailure(err);

      if (isDriftFailure) {
        await this.escalate(executionId, "GOVERNANCE_DRIFT", err);
      } else if (isTransient) {
        await this.remediate(executionId, err);
      } else {
        await this.escalate(executionId, "UNKNOWN_FAILURE", err);
      }
    }
  }
}
```

### 2. FailureDetector

**Purpose:** Identify failures and categorize them.

**Implementation:**
```typescript
export class FailureDetector {
  async detect(trace: Trace): Promise<Failure | null> {
    // Check trace for error spans
    const errorSpans = trace.spans.filter(s => s.status === "error");
    if (errorSpans.length === 0) return null;

    // Categorize failure
    const category = this.categorize(errorSpans);
    
    return {
      traceId: trace.traceId,
      category,
      severity: this.assessSeverity(category),
      errorSpans,
      timestamp: Date.now()
    };
  }

  private categorize(errorSpans: Span[]): FailureCategory {
    const types = errorSpans.map(s => s.error?.type || "unknown");
    
    if (types.includes("TimeoutError")) return "MCP_TIMEOUT";
    if (types.includes("CircuitBreakerOpenError")) return "BREAKER_OPEN";
    if (types.includes("SerializationError")) return "SERIALIZATION";
    if (types.includes("ValidationError")) return "VALIDATION";
    
    return "UNKNOWN";
  }

  async isTransientFailure(err: Error): Promise<boolean> {
    // Transient: will likely succeed if retried
    return err instanceof TimeoutError || err instanceof NetworkError;
  }

  async isGovernanceDrift(err: Error): Promise<boolean> {
    // Drift: governance constraint violated
    return err.message.includes("whitelist") || err.message.includes("governance");
  }
}
```

### 3. RemediationEngine

**Purpose:** Apply known fixes automatically.

**Implementation:**
```typescript
export type RemediationType = 
  | "restart_mcp_server"
  | "flush_cache"
  | "reset_circuit_breaker"
  | "adjust_timeout"
  | "rollback_config"
  | "escalate";

export class RemediationEngine {
  private playbooks: Map<FailureCategory, RemediationType[]> = new Map([
    ["MCP_TIMEOUT", ["adjust_timeout", "restart_mcp_server", "escalate"]],
    ["BREAKER_OPEN", ["reset_circuit_breaker", "wait", "retry"]],
    ["SERIALIZATION", ["rollback_config", "escalate"]],
    ["VALIDATION", ["escalate"]], // validation errors always escalate
  ]);

  async remediate(failure: Failure): Promise<RemediationResult> {
    const playbook = this.playbooks.get(failure.category) || ["escalate"];

    for (const action of playbook) {
      try {
        const result = await this.executeAction(action, failure);
        if (result.success) {
          return { success: true, action, detail: result.detail };
        }
      } catch (err) {
        console.error(`Action ${action} failed:`, err);
        continue;
      }
    }

    return { success: false, action: "escalate" };
  }

  private async executeAction(
    action: RemediationType,
    failure: Failure
  ): Promise<{ success: boolean; detail?: any }> {
    switch (action) {
      case "restart_mcp_server":
        return await this.restartMcpServer(failure);
      case "flush_cache":
        return await this.flushCache();
      case "reset_circuit_breaker":
        return await this.resetBreaker();
      case "adjust_timeout":
        return await this.adjustTimeout();
      case "rollback_config":
        return await this.rollbackConfig();
      default:
        return { success: false };
    }
  }

  private async restartMcpServer(failure: Failure): Promise<any> {
    const server = this.identifyServer(failure);
    if (!server) return { success: false };
    
    // In production: call deployment system (Kubernetes, systemd, etc.)
    console.log(`Restarting MCP server on port ${server.port}`);
    return { success: true, detail: `Restarted port ${server.port}` };
  }

  private async resetBreaker(): Promise<any> {
    await fetch("/api/admin/breaker/reset", { method: "POST" });
    return { success: true, detail: "Circuit breaker reset" };
  }
}
```

### 4. EscalationRouter

**Purpose:** Route unresolved issues to human operators.

**Implementation:**
```typescript
export interface Incident {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  category: FailureCategory;
  description: string;
  executionId?: string;
  traceId?: string;
  timestamp: number;
  remedationAttempted?: string;
}

export class EscalationRouter {
  async escalate(failure: Failure, remedationAttempted?: string): Promise<Incident> {
    const incident: Incident = {
      id: `inc-${Date.now()}`,
      severity: this.assessSeverity(failure),
      category: failure.category,
      description: this.generateDescription(failure),
      remedationAttempted,
      timestamp: Date.now()
    };

    // Notify operators based on severity
    if (incident.severity === "critical") {
      await this.pageOnCall(incident);
    } else if (incident.severity === "high") {
      await this.notifySlack(incident);
    } else {
      await this.createPagerDutyIncident(incident);
    }

    // Log to audit trail
    await this.auditLog.record({
      type: "ESCALATION",
      incident,
      timestamp: Date.now()
    });

    return incident;
  }

  private assessSeverity(failure: Failure): string {
    if (failure.category === "VALIDATION") return "medium";
    if (failure.category === "GOVERNANCE_DRIFT") return "high";
    if (failure.category === "MCP_TIMEOUT") return "low";
    return "medium";
  }

  private generateDescription(failure: Failure): string {
    return `${failure.category} in trace ${failure.traceId}: ${failure.errorSpans.map(s => s.error?.message).join("; ")}`;
  }
}
```

### 5. HealthMonitor

**Purpose:** Continuous health checks and anomaly detection.

**Implementation:**
```typescript
export class HealthMonitor {
  async checkHealth(): Promise<SystemHealth> {
    const [pipelineHealth, mcpHealth, configHealth, governanceHealth] = await Promise.all([
      this.checkPipelineHealth(),
      this.checkMcpHealth(),
      this.checkConfigHealth(),
      this.checkGovernanceHealth()
    ]);

    const overallHealth: SystemHealth = {
      status: [pipelineHealth, mcpHealth, configHealth, governanceHealth]
        .every(h => h.healthy) ? "HEALTHY" : "DEGRADED",
      components: {
        pipeline: pipelineHealth,
        mcp: mcpHealth,
        config: configHealth,
        governance: governanceHealth
      },
      timestamp: Date.now()
    };

    // Check for anomalies
    const anomalies = await this.detectAnomalies(overallHealth);
    if (anomalies.length > 0) {
      await this.handleAnomalies(anomalies);
    }

    return overallHealth;
  }

  private async checkPipelineHealth(): Promise<ComponentHealth> {
    const recent = await this.getRecentExecutions(10);
    const successRate = recent.filter(e => e.status === "success").length / recent.length;

    return {
      healthy: successRate > 0.8,
      successRate,
      lastExecution: recent[0]?.timestamp,
      detail: `Success rate: ${(successRate * 100).toFixed(1)}%`
    };
  }
}
```

### 6. TriggerEvaluator

**Purpose:** Evaluate conditions for autonomous execution.

**Implementation:**
```typescript
export type TriggerType = 
  | "repo_change"
  | "scheduled"
  | "drift_detected"
  | "performance_anomaly"
  | "manual";

export interface Trigger {
  id: string;
  type: TriggerType;
  condition: () => Promise<boolean>;
  priority: number;
  enabled: boolean;
}

export class TriggerEvaluator {
  private triggers: Trigger[] = [];

  registerTrigger(trigger: Trigger): void {
    this.triggers.push(trigger);
  }

  async getTriggers(): Promise<Trigger[]> {
    const enabled = this.triggers.filter(t => t.enabled);

    const matched: Trigger[] = [];
    for (const trigger of enabled) {
      try {
        if (await trigger.condition()) {
          matched.push(trigger);
        }
      } catch (err) {
        console.error(`Trigger ${trigger.id} evaluation failed:`, err);
      }
    }

    // Sort by priority
    matched.sort((a, b) => b.priority - a.priority);

    return matched;
  }
}

// Example triggers
export const DEFAULT_TRIGGERS = [
  {
    type: "scheduled",
    condition: async () => {
      const hour = new Date().getHours();
      return hour === 2; // 2 AM nightly analysis
    },
    priority: 10
  },
  {
    type: "drift_detected",
    condition: async () => {
      const drift = await governanceMonitor.detectDrift();
      return drift.length > 0;
    },
    priority: 15 // high priority
  },
  {
    type: "performance_anomaly",
    condition: async () => {
      const anomalies = await metricsMonitor.detectAnomalies();
      return anomalies.length > 0;
    },
    priority: 12
  }
];
```

---

## Execution Flow

```
System Running
  ├─ HealthMonitor checks every 5 minutes
  │   ├→ Detects anomaly
  │   └→ Trigger condition matched
  │
  ├─ TriggerEvaluator matches trigger
  │   ├→ repo_change trigger (priority 10)
  │   ├→ drift_detected trigger (priority 15) ← highest
  │   └→ scheduled trigger (priority 12)
  │
  ├─ AutonomousExecutor picks highest-priority trigger
  │   ├→ Queues execution
  │   ├→ Runs CIC Main Pipeline
  │   └→ Trace emitted
  │
  ├─ FailureDetector analyzes trace
  │   ├→ No errors → SUCCESS
  │   ├→ MCP_TIMEOUT detected → TRANSIENT
  │   └→ SERIALIZATION detected → GOVERNANCE_DRIFT
  │
  ├─ If FAILURE:
  │   ├→ RemediationEngine attempts fix
  │   │   ├→ restart_mcp_server → success → log outcome
  │   │   └→ failed → escalate
  │   │
  │   └→ If remediation fails:
  │       ├→ EscalationRouter notifies on-call
  │       └→ Create incident in PagerDuty
  │
  └─ FeedbackLoop records outcome
      └→ Improves future recommendations
```

---

## Data Flow

### Metrics Aggregation
```
[MCP Servers] → [ContextServer] → [MetricsExporter]
                                       ↓
                              [Metrics API] ← [HealthMonitor]
                                       ↓
                              [HealthMonitor Dashboard]
```

### Event Stream
```
[CIC Pipeline] → [Tracer] → [Message Bus]
                                 ├→ [FailureDetector]
                                 ├→ [RemediationEngine]
                                 └→ [AuditLog]
```

### Feedback Loop
```
[Operator Approval] → [FeedbackLoop] → [Optimizer]
                                           ↓
                                    [Confidence Scores]
                                           ↓
                                    [Future Recommendations]
```

---

## Constraints & Safety

### No Autonomous Changes (Yet)
- All significant changes require operator approval
- Remediation is limited to predefined playbooks
- New trigger types require governance approval

### Confidence & Thresholds
- Recommendations: confidence > 0.6 shown
- Auto-remediation: only for confidence > 0.9
- Escalation: default for low-confidence failures

### Rollback & Audit
- Every change logged with undo capability
- Previous config always restorable
- Full audit trail of all decisions (automated + human)

### Bounded Scope
- Execution can't modify governance files
- Remediation can't change core logic
- Triggers evaluated in isolation (no side effects)

---

## Integration Points

### Phase E Infrastructure
- Uses ExecutionStore for state
- Uses CachedAgentClient for speed
- Uses RetryPolicy + CircuitBreaker
- Uses MetricsExporter for signals

### Phase F Infrastructure
- Uses Operator Console for visibility
- Uses Trace Explorer for debugging
- Uses Config Editor for tuning
- Uses Governance Panel for oversight

### Phase G Infrastructure
- Uses Optimizer for recommendations
- Uses FeedbackLoop for learning
- Uses Threshold Tuner for auto-tuning
- Uses Drift Corrector for governance

---

## Failure Modes & Recovery

### Failure Mode: Remediation Playbook Outdated
- **Detection:** Remediation fails 3 consecutive times
- **Recovery:** Escalate + notify ops team to update playbook

### Failure Mode: Trigger Storm
- **Detection:** > 10 executions in 1 hour
- **Recovery:** Disable problematic trigger automatically

### Failure Mode: Cascade Failures
- **Detection:** > 3 consecutive failures
- **Recovery:** Stop autonomous execution, escalate to human

### Failure Mode: Config Drift
- **Detection:** Config in-memory != on-disk
- **Recovery:** Reload from disk, log discrepancy

---

## Monitoring & Observability

### Key Metrics
- `autonomous.executions.total` (counter)
- `autonomous.remediation.success_rate` (gauge)
- `autonomous.escalations.total` (counter)
- `autonomous.health.check_duration_ms` (histogram)
- `autonomous.trigger.match_count` (counter)

### Dashboards
- Autonomous Execution Stats
- Remediation Playbook Success Rates
- Escalation Incidents
- Trigger Activation Timeline
- Health Monitor Timeline

### Alerts
- "Remediation success rate < 80%"
- "Escalation rate > 5 per hour"
- "Health check timeout"
- "Trigger evaluation failure"
