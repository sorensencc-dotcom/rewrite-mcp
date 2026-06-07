# PHASE H GUARDRAILS AND CONSTRAINTS
**What the Autonomous System Can and Cannot Do**

Phase H is powerful because it's *constrained*. The system operates within strict guardrails that prevent it from overstepping, learning the wrong lessons, or causing harm.

This document defines those guardrails.

---

## Core Principle

**Autonomous ≠ Unsupervised.**

The system makes decisions and acts autonomously, but always within operator-defined bounds. Operators remain the safety rail.

---

## Execution Constraints

### What the System CAN Do Autonomously

✅ **Execute the CIC Main Pipeline**
- Run full 6-stage pipeline
- Emit traces and metrics
- Log outcomes to ExecutionStore

✅ **Schedule Executions**
- Based on predefined triggers
- At scheduled times (e.g., nightly analysis)
- On drift detection or performance anomalies

✅ **Make Minor Adjustments**
- Adjust cache TTLs (within bounds)
- Adjust retry backoff (within bounds)
- Adjust breaker thresholds (within bounds)
- **Only if confidence > 0.9**

✅ **Auto-Remediate Known Issues**
- Restart MCP servers
- Flush caches
- Reset circuit breakers
- Adjust timeouts
- **Only if in approved playbook**

✅ **Detect and Escalate Problems**
- Identify failures in traces
- Categorize failure types
- Route to on-call engineer
- Create incidents in PagerDuty

---

### What the System CANNOT Do Autonomously

❌ **Modify Governance Files**
- Cannot edit RECLASSIFICATION.md
- Cannot modify artifact whitelist
- Cannot change exception registry
- **Must escalate for human approval**

❌ **Change Core Logic**
- Cannot modify stage definitions
- Cannot reorder pipeline stages (proposal only)
- Cannot disable stages
- Cannot change MCP server endpoints
- **Requires governance + operator approval**

❌ **Approve Its Own Recommendations**
- Cannot approve threshold changes it suggested
- Cannot create and merge its own PRs
- Cannot bypass governance checks
- **Must wait for human approval**

❌ **Silence Alerts**
- Cannot dismiss incidents
- Cannot lower alert thresholds to mask issues
- Cannot disable health checks
- **Must escalate if problem persists**

❌ **Access Sensitive Data**
- Cannot read secrets or credentials
- Cannot modify user preferences
- Cannot change governance audit logs
- **Admin token required for sensitive ops**

---

## Configuration Bounds

### Cache TTLs
```typescript
// Current values
cache.ttl.analysisMs = 3600000 (1 hour)

// Autonomous system can adjust within:
min: 600000   (10 minutes)
max: 86400000 (24 hours)
step: 300000  (5 minutes)

// If new value would be outside bounds:
// → Escalate to human operator
```

### Retry Policy
```typescript
// Current values
retry.maxAttempts = 3
retry.initialDelayMs = 100
retry.maxDelayMs = 10000

// Autonomous system can adjust:
maxAttempts: [2, 3, 4, 5]
initialDelayMs: [50, 100, 200, 500]
maxDelayMs: [5000, 10000, 20000, 30000]

// Constraint: don't allow infinite retry loops
// If totalMaxDelay > 60000: escalate
```

### Circuit Breaker
```typescript
// Current values
breaker.failureThreshold = 5
breaker.cooldownMs = 30000

// Autonomous system can adjust:
failureThreshold: [2, 3, 4, 5, 6]
cooldownMs: [10000, 30000, 60000, 120000]

// Constraint: don't fail too fast or too slow
// If failureThreshold < 2 or > 10: escalate
```

### MCP Timeouts
```typescript
// Current values
mcp.timeoutMs = 2000

// Autonomous system can adjust:
range: [1000, 10000]
step: 500

// Constraint: don't timeout too aggressively
// If timeoutMs < 500 or > 30000: escalate
```

---

## Trigger Constraints

### Registered Triggers
Only these triggers can fire autonomously:

```typescript
trigger: "scheduled"
├── condition: hour === 2 (nightly 2 AM)
├── frequency: once per day max
├── priority: 10
└── requires_approval: false ✓

trigger: "drift_detected"
├── condition: RECLASSIFICATION.md changed
├── frequency: max 4 times per hour
├── priority: 15 (high)
├── requires_approval: true (for changes)
└── action: propose fix (don't apply)

trigger: "performance_anomaly"
├── condition: latency p99 > 5s or error rate > 5%
├── frequency: max 2 times per hour
├── priority: 12
├── requires_approval: false (for detection only)
└── action: run diagnostic (don't change config)

trigger: "manual"
├── condition: operator clicks "Run Now"
├── frequency: unlimited
├── priority: 20 (highest)
├── requires_approval: false
└── action: run immediately
```

### New Triggers
To add a new trigger:
1. Operator proposes trigger definition
2. Governance review
3. Test in staging
4. Approve via PR
5. Deploy + monitor

---

## Remediation Playbooks

### Approved Remediation Actions

#### Action: restart_mcp_server
```typescript
preconditions: [
  "failure_type === MCP_TIMEOUT",
  "mcp_server_healthy === false"
]
postconditions: [
  "mcp_server_healthy === true"
]
max_attempts: 1
rollback: automatic (if new error occurs)
```

#### Action: flush_cache
```typescript
preconditions: [
  "failure_type === SERIALIZATION",
  "cache_suspected_corrupted === true"
]
postconditions: [
  "cache.size === 0"
]
max_attempts: 1
rollback: n/a (cache rebuild automatic)
```

#### Action: reset_circuit_breaker
```typescript
preconditions: [
  "failure_type === BREAKER_OPEN",
  "time_in_open > 30000"
]
postconditions: [
  "breaker.state === half_open"
]
max_attempts: 1
rollback: automatic (if failures resume)
```

#### Action: adjust_timeout
```typescript
preconditions: [
  "failure_type === MCP_TIMEOUT",
  "suggested_timeout <= max_bound"
]
postconditions: [
  "new_timeout === suggested_timeout"
]
max_attempts: 1
rollback: automatic (after 24 hours if errors increase)
bounds: [1000ms, 30000ms]
```

### New Actions
To add a remediation action:
1. Document preconditions + postconditions
2. Implement safely with rollback
3. Test failure + recovery in staging
4. Add to approved playbook via PR
5. Operator approval required

---

## Escalation Rules

### Automatic Escalation

**Always escalate to human if:**

```typescript
// Validation failures (operator must decide)
if (failure.type === "VALIDATION_ERROR") {
  escalate("VALIDATION", severity: "high");
}

// Governance drift (governance team must approve)
if (failure.type === "GOVERNANCE_DRIFT") {
  escalate("GOVERNANCE", severity: "high");
}

// Unknown failures (need human diagnosis)
if (failure.type === "UNKNOWN") {
  escalate("UNKNOWN", severity: "medium");
}

// Remediation failed 3 times (playbook outdated)
if (remediationAttempts >= 3) {
  escalate("PLAYBOOK_OUTDATED", severity: "medium");
}

// Trigger storm (prevent DOS)
if (executionsPerHour > 10) {
  escalate("TRIGGER_STORM", severity: "critical");
  disableTriggers("all");
}

// Cascade failures (circuit breaker on system)
if (failureRate > 0.5) {
  escalate("CASCADE_FAILURE", severity: "critical");
  disableAutonomousExecution();
}

// Config mutation conflict (human must resolve)
if (configConflict.detected) {
  escalate("CONFIG_CONFLICT", severity: "high");
}
```

### Escalation Priority

```
CRITICAL (immediate, page on-call)
├── Cascade failures detected
├── Trigger storm occurring
└── System health critical

HIGH (urgent, notify within 5 min)
├── Governance drift
├── Validation failures
├── Remediation failures

MEDIUM (routine, log for next review)
├── Unknown failures
├── Performance anomalies
└── Config drift

LOW (info only, no action required)
├── Successful execution
├── Minor warnings
└── Routine maintenance
```

---

## Approval Gates

### Operator Approval Required For

✅ **Adding New Triggers**
- Define trigger condition
- Explain when it should fire
- Describe expected outcome
- Get governance + ops approval

✅ **Adding New Remediation Actions**
- Define preconditions + postconditions
- Document rollback procedure
- Test in staging extensively
- Get ops approval

✅ **Expanding Automation Scope**
- What new decision can system make?
- What are failure modes?
- How is it constrained?
- Get security + governance approval

✅ **Disabling Safety Constraints**
- Why is this constraint too strict?
- What safeguards replace it?
- What's the audit trail?
- Get CTO + governance approval

### No Approval Needed For

❌ Routine execution (scheduled triggers)
❌ Standard remediation (approved playbooks)
❌ Escalations (routed to ops automatically)
❌ Recommendation generation (operator can reject)
❌ Health checks (autonomous monitoring)

---

## Audit & Accountability

### All Autonomous Actions Logged

```typescript
interface AutonomousAction {
  id: string;
  timestamp: number;
  action_type: "execution" | "remediation" | "escalation" | "config_change";
  trigger?: string;
  status: "success" | "failure" | "escalated";
  details: Record<string, any>;
  operator_approval?: {
    approved_by: string;
    approved_at: number;
    notes?: string;
  };
  rollback?: {
    performed_at: number;
    reason: string;
  };
}
```

### Audit Trail Requirements

- All changes timestamped
- Who/what triggered it (system or operator)
- Outcome (success/failure)
- If escalated: why and to whom
- If rolled back: reason and timestamp

### Audit Log Immutability

- Cannot be deleted
- Cannot be modified by system
- Cannot be suppressed by operators
- Must be accessible for reviews

---

## Learning Safeguards

### FeedbackLoop Constraints

**What FeedbackLoop can learn:**
✅ Which recommendations were approved/rejected
✅ Which remediation actions succeeded/failed
✅ Performance improvements from changes
✅ Operator feedback on suggestions

**What FeedbackLoop cannot learn:**
❌ Secrets or sensitive data
❌ Operator preferences (that override policy)
❌ Ways to bypass governance checks
❌ How to manipulate approval systems

### Confidence Score Bounds

```typescript
// System won't recommend below this confidence
min_confidence_to_show = 0.6

// System won't auto-apply below this confidence
min_confidence_to_auto_remediate = 0.9

// System rejects obvious bad recommendations
if (recommendation.expectedImprovement.latencyDelta < -50%) {
  reject("Likely to make things worse");
}
```

---

## System Health Constraints

### Automatic Pause Conditions

If any of these occur, autonomous execution pauses:

```typescript
if (pipeline.failure_rate > 0.5) {
  pauseAutonomous("Cascade failure detected");
  escalate("CRITICAL");
}

if (remediation.success_rate < 0.3) {
  pauseAutonomous("Playbooks failing");
  escalate("MEDIUM");
}

if (metrics.collection_latency > 60000) {
  pauseAutonomous("Metrics unavailable");
  escalate("MEDIUM");
}

if (governance.drift_detected && !resolved) {
  pauseAutonomous("Governance drift unresolved");
  escalate("HIGH");
}

if (memory_usage > 0.9) {
  pauseAutonomous("Resource exhaustion");
  escalate("CRITICAL");
}
```

### Manual Pause

Operators can pause autonomous execution at any time:

```
curl -X POST /admin/autonomous/pause \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -d '{"reason": "Investigating issue"}'
```

---

## Transition to Phase I

### When to Relax Constraints

After Phase H matures (3+ months), consider:

✅ Allow auto-remediation with lower confidence (0.8 → 0.7)
✅ Auto-approve low-risk recommendations (cache TTLs)
✅ Expand trigger types (custom user-defined)
✅ Allow stage reordering (with rollback)

❌ Never allow: governance file changes, core logic changes, secret access

---

## Safety Review Checklist

Every 30 days, review:

- [ ] Are constraints still appropriate?
- [ ] Have any guardrails been bypassed?
- [ ] Are escalation routes effective?
- [ ] Is audit trail complete?
- [ ] Have operators raised concerns?
- [ ] Are failure playbooks still accurate?
- [ ] Is system learning correctly?

---

## Operator Responsibilities

When Phase H is active:

✅ **You must:**
- Review escalated incidents timely
- Update remediation playbooks as needed
- Approve new triggers/actions
- Monitor health metrics
- Validate FeedbackLoop is learning correctly

❌ **You must NOT:**
- Disable safety constraints without review
- Ignore repeated escalations
- Approve bad recommendations
- Suppress audit logs
- Modify system behavior via config (bypass governance)
