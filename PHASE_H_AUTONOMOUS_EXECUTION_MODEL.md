# PHASE H AUTONOMOUS EXECUTION MODEL
**Trigger Types, Remediation Playbooks, Escalation Logic**

This document defines exactly how the autonomous system makes decisions and acts.

---

## Trigger Types & Conditions

### Trigger 1: Scheduled Execution

**Purpose:** Nightly analysis to detect drift and maintain health.

**Configuration:**
```typescript
{
  type: "scheduled",
  name: "Nightly Analysis",
  enabled: true,
  schedule: "0 2 * * *", // 2 AM every day
  
  condition: async () => {
    const now = new Date();
    return now.getHours() === 2 && now.getMinutes() < 5;
  },

  action: async () => {
    return await cic.run({
      repos: ["*"],
      analyze: ["drift", "performance", "governance"],
      timeout: 3600000 // 1 hour max
    });
  },

  priority: 10,
  frequency: "once per day",
  requires_approval: false,
  auto_remediate: false // escalate on failure
}
```

**Execution Flow:**
```
2:00 AM → trigger fires
  ├─ Run CIC on all monitored repos
  ├─ Analyze traces for drift
  ├─ Compare with expected RECLASSIFICATION.md
  └─ If drift detected:
      ├─ Propose fix (don't apply)
      └─ Escalate to human for review
```

---

### Trigger 2: Drift Detection

**Purpose:** Immediately respond when governance drift is detected.

**Configuration:**
```typescript
{
  type: "drift_detected",
  name: "Governance Drift Response",
  enabled: true,
  
  condition: async () => {
    const current = await fs.readFile("RECLASSIFICATION.md");
    const expected = await governance.getExpectedClassifications();
    const drift = computeDiff(current, expected);
    return drift.length > 0;
  },

  action: async (drift) => {
    // Propose auto-fix
    const fixes = await driftCorrector.generateFixes(drift);
    
    // Create PR with proposed changes
    const pr = await createPR({
      title: `Governance Drift Fix: ${drift.length} changes`,
      body: driftCorrector.generatePRBody(fixes),
      branch: `phase-h/drift-fix-${Date.now()}`
    });

    // Escalate for human approval
    await escalate("GOVERNANCE_DRIFT", {
      pr_url: pr.url,
      fixes: fixes,
      severity: "high"
    });

    return { status: "escalated", pr_url: pr.url };
  },

  priority: 15, // high
  frequency: "max 4 times per hour",
  requires_approval: true, // for applying fix
  auto_remediate: false // always escalate
}
```

**Execution Flow:**
```
Drift detected in RECLASSIFICATION.md
  ├─ Generate proposed fixes
  ├─ Create PR with changes
  ├─ Notify ops team: "Governance drift detected"
  └─ Wait for human approval
```

---

### Trigger 3: Performance Anomaly

**Purpose:** Detect and respond to performance degradation.

**Configuration:**
```typescript
{
  type: "performance_anomaly",
  name: "Performance Anomaly Detection",
  enabled: true,
  
  condition: async () => {
    const metrics = await metricsExporter.getLastHour();
    const p99 = metrics.latencies[99];
    const errorRate = metrics.errorRate;
    
    // Anomaly if p99 > 5s or error rate > 5%
    return p99 > 5000 || errorRate > 0.05;
  },

  action: async (anomaly) => {
    // Automatically propose optimizations
    const recommendations = await optimizer.runOptimizationCycle(
      metricsSnapshot,
      traces,
      governanceState
    );

    // Filter to high-confidence recommendations
    const highConfidence = recommendations.filter(r => r.confidence > 0.8);

    if (highConfidence.length > 0) {
      // Present to operator
      await notifyOperator({
        type: "PERFORMANCE_ANOMALY",
        anomaly: anomaly,
        recommendations: highConfidence,
        automatic_remediation_available: true
      });
    } else {
      // Escalate for manual investigation
      await escalate("PERFORMANCE_ANOMALY", {
        p99_latency: anomaly.p99,
        error_rate: anomaly.errorRate,
        recommendations: recommendations
      });
    }

    return { status: "escalated" };
  },

  priority: 12,
  frequency: "max 2 times per hour",
  requires_approval: false, // escalates for investigation
  auto_remediate: false // waits for operator approval
}
```

**Execution Flow:**
```
p99 latency > 5s detected
  ├─ Run optimization engine
  ├─ Find high-confidence recommendations
  ├─ If found:
  │   └─ Notify operator (wait for approval)
  └─ If not found:
      └─ Escalate for human investigation
```

---

### Trigger 4: Manual Execution

**Purpose:** Operator can trigger immediate run.

**Configuration:**
```typescript
{
  type: "manual",
  name: "Manual Trigger",
  enabled: true,
  
  condition: async () => {
    // Operator clicks "Run Now" in console
    return window.manualTriggerFired === true;
  },

  action: async (params) => {
    return await cic.run({
      repos: params.repos || ["*"],
      timeout: params.timeout || 3600000
    });
  },

  priority: 20, // highest
  frequency: "unlimited",
  requires_approval: false,
  auto_remediate: true // apply known fixes automatically
}
```

**Execution Flow:**
```
Operator clicks "Run CIC" in console
  ├─ Queue execution immediately
  ├─ Run pipeline
  └─ If failure:
      ├─ Attempt auto-remediation (if confidence > 0.9)
      └─ Escalate if remediation fails
```

---

## Remediation Playbooks

### Playbook 1: MCP Timeout Recovery

**Trigger Condition:**
```typescript
failure.type === "MCP_TIMEOUT" && 
failure.severity === "transient"
```

**Playbook Steps:**

```typescript
const playbook = [
  {
    step: 1,
    action: "wait",
    duration: 1000,
    reason: "Wait for transient condition to clear"
  },
  {
    step: 2,
    action: "retry",
    max_attempts: 2,
    reason: "Retry with fresh connection"
  },
  {
    step: 3,
    action: "adjust_timeout",
    from: 2000,
    to: 3000,
    reason: "Increase timeout for slower server"
  },
  {
    step: 4,
    action: "restart_mcp_server",
    reason: "Server may be unhealthy"
  },
  {
    step: 5,
    action: "escalate",
    reason: "Remediation unsuccessful"
  }
];
```

**Decision Tree:**
```
MCP Timeout
  ├─ Wait 1s → retry
  │   ├─ Success → log outcome
  │   └─ Fail → next step
  │
  ├─ Retry 2×
  │   ├─ Success → log outcome
  │   └─ Fail → next step
  │
  ├─ Increase timeout (2s → 3s)
  │   ├─ Success → monitor for pattern
  │   └─ Fail → next step
  │
  ├─ Restart MCP server
  │   ├─ Success → retry pipeline
  │   └─ Fail → escalate
  │
  └─ Escalate to human
```

---

### Playbook 2: Circuit Breaker Open Recovery

**Trigger Condition:**
```typescript
failure.type === "CIRCUIT_BREAKER_OPEN" &&
time_in_open > 30000
```

**Playbook Steps:**

```typescript
const playbook = [
  {
    step: 1,
    action: "wait",
    duration: 30000,
    reason: "Breaker cooldown period"
  },
  {
    step: 2,
    action: "reset_circuit_breaker",
    reason: "Move to half-open state"
  },
  {
    step: 3,
    action: "retry",
    max_attempts: 1,
    reason: "Test if upstream is healthy"
  },
  {
    step: 4,
    action: "monitor",
    duration: 60000,
    reason: "Watch for breaker re-opening"
  },
  {
    step: 5,
    action: "escalate",
    reason: "Breaker keeps opening"
  }
];
```

**Decision Tree:**
```
Breaker Open
  ├─ Wait 30s (cooldown)
  │   ├─ Timeout reached → next step
  │   └─ Trigger fired earlier → skip to next
  │
  ├─ Reset breaker (→ half-open)
  │   ├─ Success → next step
  │   └─ Fail → escalate immediately
  │
  ├─ Retry once
  │   ├─ Success → success log, monitor
  │   └─ Fail → check for root cause
  │
  ├─ Monitor for 60s
  │   ├─ No re-open → success
  │   └─ Re-opens → escalate
  │
  └─ Escalate to human
      (upstream service likely down)
```

---

### Playbook 3: Cache Corruption Recovery

**Trigger Condition:**
```typescript
failure.type === "SERIALIZATION_ERROR" && 
failure.message.includes("cache")
```

**Playbook Steps:**

```typescript
const playbook = [
  {
    step: 1,
    action: "flush_cache",
    reason: "Clear potentially corrupted data"
  },
  {
    step: 2,
    action: "retry",
    max_attempts: 1,
    reason: "Retry with fresh cache"
  },
  {
    step: 3,
    action: "check_cache_integrity",
    reason: "Verify cache health"
  },
  {
    step: 4,
    action: "escalate",
    reason: "If cache still corrupted"
  }
];
```

**Decision Tree:**
```
Serialization Error (cache related)
  ├─ Flush cache
  │   ├─ Success → retry
  │   └─ Fail → escalate immediately
  │
  ├─ Retry once
  │   ├─ Success → check integrity
  │   └─ Fail → escalate
  │
  ├─ Check cache integrity
  │   ├─ Healthy → success
  │   └─ Corrupted → escalate
  │
  └─ Escalate to human
      (persistent cache issue)
```

---

### Playbook 4: Config Rollback Recovery

**Trigger Condition:**
```typescript
failure.type === "VALIDATION_ERROR" && 
failure_introduced_by === "recent_config_change"
```

**Playbook Steps:**

```typescript
const playbook = [
  {
    step: 1,
    action: "detect_config_change",
    reason: "Identify what changed"
  },
  {
    step: 2,
    action: "rollback_config",
    reason: "Revert to previous known-good config"
  },
  {
    step: 3,
    action: "retry",
    max_attempts: 1,
    reason: "Test with previous config"
  },
  {
    step: 4,
    action: "escalate",
    reason: "If still fails, issue predates config change"
  }
];
```

**Decision Tree:**
```
Validation Error (config-related)
  ├─ Detect what changed
  │   ├─ Found change → next step
  │   └─ No change → escalate
  │
  ├─ Rollback to previous config
  │   ├─ Success → retry
  │   └─ Fail → escalate immediately
  │
  ├─ Retry once
  │   ├─ Success → escalate (for human review of fix)
  │   └─ Fail → escalate
  │
  └─ Escalate to human
      (issue predates config, needs investigation)
```

---

## Escalation Logic

### Decision Tree: When to Escalate

```
Failure detected
  │
  ├─ Is it validation error?
  │   └─ YES → Escalate (human must decide)
  │
  ├─ Is it governance drift?
  │   └─ YES → Escalate (governance team must approve)
  │
  ├─ Is it in approved playbook?
  │   ├─ NO → Escalate (unknown failure type)
  │   └─ YES → Run playbook
  │           ├─ Succeeds → Log success
  │           └─ Fails → Escalate (playbook outdated)
  │
  ├─ Has auto-remediation failed 3× in a row?
  │   └─ YES → Escalate (playbook needs update)
  │
  ├─ Is error rate > 50%?
  │   └─ YES → Escalate CRITICAL (cascade failure)
  │
  └─ Is system health critical?
      └─ YES → Pause autonomous execution + escalate
```

### Escalation Channels

**CRITICAL (immediate):**
```
Incident created in PagerDuty
  ├─ Page on-call engineer
  ├─ Notify Slack #alerts
  ├─ Wait for acknowledgment
  └─ Pause autonomous execution
```

**HIGH (urgent):**
```
Incident created in PagerDuty
  ├─ Notify Slack #ops-team
  ├─ Wait for acknowledgment
  └─ Continue autonomous execution
```

**MEDIUM (routine):**
```
Ticket created in Jira
  ├─ Assign to ops-team
  ├─ Set for next sprint
  └─ Continue autonomous execution
```

**LOW (info):**
```
Log to audit trail
  ├─ Available in console
  ├─ Reviewed in daily ops standup
  └─ No escalation
```

---

## Learning & Feedback Loop

### Decision Recording

```typescript
interface ExecutionRecord {
  executionId: string;
  trigger: TriggerType;
  timestamp: number;
  
  // What happened
  execution: {
    status: "success" | "failure";
    durationMs: number;
    outcome: any;
  };

  // If failed: what was attempted
  remediation?: {
    action: string;
    result: "success" | "failure";
    durationMs: number;
  };

  // If escalated: why and to whom
  escalation?: {
    reason: string;
    severity: string;
    assignee: string;
    timestamp: number;
  };

  // Operator feedback (recorded after resolution)
  operator_feedback?: {
    was_helpful: boolean;
    notes: string;
    timestamp: number;
  };
}
```

### FeedbackLoop Learning

```typescript
async function learnFromDecision(record: ExecutionRecord) {
  // If remediation succeeded: increase confidence
  if (record.remediation?.result === "success") {
    await confidence.increase(record.remediation.action, 0.05);
  }

  // If remediation failed: lower confidence
  if (record.remediation?.result === "failure") {
    await confidence.decrease(record.remediation.action, 0.1);
  }

  // If operator provided feedback
  if (record.operator_feedback?.was_helpful === false) {
    await confidence.decrease(record.trigger, 0.15);
  }

  // Update recommendations for similar conditions
  const similar = await findSimilarExecutions(record);
  for (const s of similar) {
    await updateConfidence(s);
  }
}
```

---

## Example: End-to-End Execution

```
1. 2:00 AM → Scheduled trigger fires
   ├─ TriggerEvaluator matches "scheduled" trigger
   └─ AutonomousExecutor queues execution

2. 2:01 AM → CIC Main Pipeline starts
   ├─ Stage 1: Code Analyzer
   ├─ Stage 2: Call Graph Extractor
   ├─ Stage 3: Narrative Linker
   ├─ Stage 4: Context Synthesizer
   ├─ Stage 5: Conditional Router
   └─ Stage 6: Diagnostics
        └─ ERROR: TimeoutError on MCP port 7072

3. 2:02 AM → FailureDetector analyzes trace
   ├─ Categorizes: MCP_TIMEOUT
   ├─ Severity: TRANSIENT
   └─ Remediation playbook available

4. 2:02 AM → RemediationEngine runs Playbook 1
   ├─ Step 1: Wait 1s → continue
   ├─ Step 2: Retry 2× → still fails
   ├─ Step 3: Increase timeout (2s → 3s)
   ├─ Step 4: Restart MCP server on port 7072
   │   └─ systemctl restart mcp-server@7072 → SUCCESS
   └─ Step 5: Retry → SUCCESS

5. 2:03 AM → Execution completes
   ├─ Status: SUCCESS (after remediation)
   ├─ FeedbackLoop learns:
   │   └─ "restart_mcp_server" confidence +0.05
   └─ Audit log records:
       type: EXECUTION
       trigger: scheduled
       remediation: restart_mcp_server
       outcome: success

6. 2:04 AM → Next iteration
   ├─ HealthMonitor checks system health
   ├─ No anomalies detected
   └─ Continue monitoring
```

---

## Monitoring Dashboard

What an operator sees in the console during Phase H:

```
Autonomous Execution Status
├─ Last Execution
│   ├─ Trigger: Scheduled (Nightly Analysis)
│   ├─ Timestamp: 2026-06-06 02:00 UTC
│   ├─ Status: ✓ SUCCESS (with remediation)
│   ├─ Duration: 3m 42s
│   └─ Remediation: Restarted MCP server 7072
│
├─ Upcoming Triggers
│   ├─ Next Scheduled: Tomorrow 2:00 AM
│   ├─ On Drift: (if detected)
│   └─ On Anomaly: (if p99 > 5s or error > 5%)
│
├─ Recent Escalations
│   └─ (none in last 7 days)
│
└─ Remediation Success Rate
    ├─ This Month: 89.3%
    ├─ Last Month: 87.1%
    └─ Trend: ↗ improving
```
