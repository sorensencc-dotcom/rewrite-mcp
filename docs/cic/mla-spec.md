---
title: MLA Specification — CIC Memory Layer Event Types, Schemas & Retention
version: 1.0.0
date: 2026-06-07
status: LOCKED
---

# MLA SPECIFICATION

**Purpose:** Define the event types, JSON schemas, storage format, and retention policy for CIC's durable memory layer.

**Lock Date:** 2026-06-07 (Phase 23 Day 1)

**Scope:** Complete specification for memory events that will flow through CIC for the next 12 months.

---

## OVERVIEW

The Memory Layer captures six categories of events that represent CIC's operational history:

1. **ARPS_DELTA** — Roadmap and prompt evolution
2. **PIPELINE_RUN** — Ingestion, classification, execution results
3. **AGENT_TELEMETRY** — Agent health, performance, errors
4. **GOVERNANCE_SIGNAL** — Approval decisions, policy violations, escalations
5. **APR_PLAN** — Planning decisions, task decomposition, goal achievement
6. **CRO_RUN** — Task execution traces, step results, resource usage

Each event is immutable, timestamped, and retained according to a tiered policy.

---

## EVENT TYPES & SCHEMAS

### 1. ARPS_DELTA

**Purpose:** Track roadmap and prompt evolution.

**When Emitted:**
- Roadmap text rewritten (Phase completed, new phase added, etc.)
- System prompt modified
- Agent instructions changed
- Priority adjustments

**JSON Schema:**

```json
{
  "id": "event_uuid",
  "timestamp": "2026-06-07T14:30:00Z",
  "event_type": "ARPS_DELTA",
  "source_agent": "arps_synthesizer",
  "session_id": "session_20260607_001",
  "correlation_id": "corr_abc123",
  "payload": {
    "change_type": "phase_completion | phase_creation | prompt_rewrite | instruction_update | priority_adjustment",
    "phase_id": "23.2",
    "old_value": "...",
    "new_value": "...",
    "git_commit": "abc123def456",
    "confidence": 0.95,
    "affected_subsystems": ["ARPS", "CLI", "Command Center"]
  },
  "retention_days": 90
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| change_type | string | ✅ | Type of change made |
| phase_id | string | ❌ | Which phase (if applicable) |
| old_value | string | ✅ | Previous state (truncate >500 chars) |
| new_value | string | ✅ | New state (truncate >500 chars) |
| git_commit | string | ✅ | Commit hash for traceability |
| confidence | number | ✅ | 0-1 confidence in change accuracy |
| affected_subsystems | array | ✅ | Which systems are impacted |

**Examples:**

```json
{
  "change_type": "phase_completion",
  "phase_id": "23.1",
  "old_value": "23.1 — Memory Substrate Specification (MLA‑Spec) — PENDING",
  "new_value": "23.1 — Memory Substrate Specification (MLA‑Spec) — COMPLETE",
  "git_commit": "a1b2c3d4",
  "confidence": 1.0,
  "affected_subsystems": ["Roadmap Tracking", "Phase Status"]
}
```

---

### 2. PIPELINE_RUN

**Purpose:** Track ingestion, classification, and execution pipeline results.

**When Emitted:**
- Ingestion job completes (with result: success/partial/failure)
- Classification job completes
- Archive query returns results
- Document processing finishes
- Report generation completes

**JSON Schema:**

```json
{
  "id": "event_uuid",
  "timestamp": "2026-06-07T14:30:00Z",
  "event_type": "PIPELINE_RUN",
  "source_agent": "pipeline_orchestrator",
  "session_id": "session_20260607_001",
  "correlation_id": "corr_abc123",
  "payload": {
    "pipeline_name": "ingestion | classification | archival | processing | reporting",
    "pipeline_id": "run_20260607_001",
    "status": "success | partial | failed",
    "start_time": "2026-06-07T14:00:00Z",
    "end_time": "2026-06-07T14:30:00Z",
    "duration_ms": 1800000,
    "items_processed": 150,
    "items_successful": 148,
    "items_failed": 2,
    "error_summary": "2 documents failed OCR confidence threshold",
    "metrics": {
      "throughput_items_per_second": 1.39,
      "error_rate_percent": 1.33,
      "resource_usage_mb": 512
    },
    "failed_items": [
      { "item_id": "doc_001", "error": "OCR confidence <0.7", "severity": "medium" }
    ]
  },
  "retention_days": 90
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| pipeline_name | string | ✅ | Name of pipeline |
| pipeline_id | string | ✅ | Unique run identifier |
| status | string | ✅ | success/partial/failed |
| start_time | ISO8601 | ✅ | When run started |
| end_time | ISO8601 | ✅ | When run finished |
| duration_ms | number | ✅ | Total duration |
| items_processed | number | ✅ | Total items attempted |
| items_successful | number | ✅ | Items that succeeded |
| items_failed | number | ✅ | Items that failed |
| error_summary | string | ❌ | High-level error description |
| metrics | object | ✅ | Performance metrics |
| failed_items | array | ❌ | Details on failed items |

**Examples:**

```json
{
  "pipeline_name": "ingestion",
  "pipeline_id": "run_20260607_ingest_001",
  "status": "partial",
  "items_processed": 47,
  "items_successful": 45,
  "items_failed": 2,
  "error_summary": "2 files rejected: permissions denied",
  "metrics": {
    "throughput_items_per_second": 0.94,
    "error_rate_percent": 4.26,
    "resource_usage_mb": 256
  }
}
```

---

### 3. AGENT_TELEMETRY

**Purpose:** Track agent health, performance, and errors.

**When Emitted:**
- Agent completes a task
- Agent encounters an error
- Agent health check runs
- Agent resource usage exceeds threshold
- Agent produces unexpected output

**JSON Schema:**

```json
{
  "id": "event_uuid",
  "timestamp": "2026-06-07T14:30:00Z",
  "event_type": "AGENT_TELEMETRY",
  "source_agent": "agent_monitor",
  "session_id": "session_20260607_001",
  "correlation_id": "corr_abc123",
  "payload": {
    "agent_name": "mla_harvester",
    "agent_class": "ingestion | processing | reasoning | planning | execution",
    "status": "healthy | degraded | failed",
    "uptime_seconds": 86400,
    "task_count": 1250,
    "task_success_rate": 0.987,
    "last_error": "timeout after 30s",
    "last_error_time": "2026-06-07T13:45:00Z",
    "performance": {
      "avg_task_duration_ms": 245,
      "p95_task_duration_ms": 1200,
      "cpu_usage_percent": 12.5,
      "memory_usage_mb": 256,
      "error_rate_percent": 1.3
    },
    "degradation_reason": null
  },
  "retention_days": 90
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| agent_name | string | ✅ | Agent identifier |
| agent_class | string | ✅ | Functional class |
| status | string | ✅ | healthy/degraded/failed |
| uptime_seconds | number | ✅ | How long agent running |
| task_count | number | ✅ | Total tasks processed |
| task_success_rate | number | ✅ | 0-1 success percentage |
| last_error | string | ❌ | Most recent error message |
| last_error_time | ISO8601 | ❌ | When last error occurred |
| performance | object | ✅ | Performance metrics |
| degradation_reason | string | ❌ | Why degraded (if applicable) |

**Examples:**

```json
{
  "agent_name": "rl_orchestrator",
  "agent_class": "execution",
  "status": "degraded",
  "task_success_rate": 0.94,
  "last_error": "Rewrite Labs API rate limit exceeded",
  "last_error_time": "2026-06-07T13:15:00Z",
  "performance": {
    "avg_task_duration_ms": 5000,
    "p95_task_duration_ms": 45000,
    "error_rate_percent": 6.0
  },
  "degradation_reason": "External API rate limiting"
}
```

---

### 4. GOVERNANCE_SIGNAL

**Purpose:** Track approval decisions, policy violations, and escalations.

**When Emitted:**
- Operator approves a command
- Operator rejects a command
- Zone violation detected
- Approval threshold crossed
- Escalation triggered
- Policy constraint violated

**JSON Schema:**

```json
{
  "id": "event_uuid",
  "timestamp": "2026-06-07T14:30:00Z",
  "event_type": "GOVERNANCE_SIGNAL",
  "source_agent": "approval_handler",
  "session_id": "session_20260607_001",
  "correlation_id": "corr_abc123",
  "payload": {
    "signal_type": "approval | rejection | escalation | zone_violation | threshold_crossed | constraint_violation",
    "entity_type": "skill | extraction | phase_write | cli_command",
    "entity_id": "skill_extraction_audit",
    "decision": "approved | rejected | escalated",
    "reason": "3rd occurrence, auto-approved",
    "operator": "chris",
    "approval_count": 3,
    "approval_threshold": 2,
    "metadata": {
      "skill_path": "skills/extraction-audit.md",
      "permission_tier": 2,
      "risk_level": "medium"
    }
  },
  "retention_days": 365
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| signal_type | string | ✅ | Type of governance event |
| entity_type | string | ✅ | What is being governed |
| entity_id | string | ✅ | Unique identifier |
| decision | string | ✅ | Approval outcome |
| reason | string | ✅ | Why this decision |
| operator | string | ❌ | Who approved (if human) |
| approval_count | number | ✅ | How many approvals |
| approval_threshold | number | ✅ | Threshold for auto-approval |
| metadata | object | ✅ | Context-specific data |

**Examples:**

```json
{
  "signal_type": "threshold_crossed",
  "entity_type": "skill",
  "entity_id": "approvals_audit",
  "decision": "escalated",
  "reason": "3 consecutive successful runs → promoted to Tier 2",
  "approval_count": 3,
  "approval_threshold": 2,
  "metadata": {
    "new_tier": 2,
    "promotion_reason": "auto_promotion_criteria_met"
  }
}
```

---

### 5. APR_PLAN

**Purpose:** Track autonomous planning decisions and task decomposition.

**When Emitted:**
- APR generates a plan
- Plan is executed
- Plan encounters a blocker
- Multi-agent consensus achieved
- Task allocation finalized

**JSON Schema:**

```json
{
  "id": "event_uuid",
  "timestamp": "2026-06-07T14:30:00Z",
  "event_type": "APR_PLAN",
  "source_agent": "autonomous_planner",
  "session_id": "session_20260607_001",
  "correlation_id": "corr_abc123",
  "payload": {
    "plan_id": "plan_20260607_001",
    "goal": "Complete Phase 23 Spec and Harvester",
    "plan_type": "feature_development | bug_fix | optimization | governance",
    "status": "generated | in_progress | completed | failed",
    "task_count": 7,
    "task_graph": [
      { "id": "task_1", "name": "Define event types", "depends_on": [], "estimated_effort_hours": 2 },
      { "id": "task_2", "name": "Design storage schema", "depends_on": ["task_1"], "estimated_effort_hours": 1 }
    ],
    "critical_path_hours": 8,
    "risk_level": "low | medium | high",
    "risk_factors": ["External API dependency", "Complex schema migration"],
    "agent_consensus_score": 0.94,
    "agents_involved": ["planner_v1", "reviewer_v2", "risk_assessor"]
  },
  "retention_days": 365
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| plan_id | string | ✅ | Unique plan identifier |
| goal | string | ✅ | What the plan achieves |
| plan_type | string | ✅ | Category of plan |
| status | string | ✅ | Current status |
| task_count | number | ✅ | Number of tasks |
| task_graph | array | ✅ | DAG of tasks with dependencies |
| critical_path_hours | number | ✅ | Minimum duration (in parallel) |
| risk_level | string | ✅ | low/medium/high |
| risk_factors | array | ✅ | Known risks |
| agent_consensus_score | number | ✅ | 0-1 multi-agent agreement |
| agents_involved | array | ✅ | Which agents participated |

**Examples:**

```json
{
  "plan_id": "plan_phase23_001",
  "goal": "Implement CIC Memory Layer (Phase 23)",
  "plan_type": "feature_development",
  "status": "in_progress",
  "task_count": 7,
  "critical_path_hours": 12,
  "risk_level": "medium",
  "agent_consensus_score": 0.92
}
```

---

### 6. CRO_RUN

**Purpose:** Track task execution traces and runtime results.

**When Emitted:**
- Task execution starts
- Task step completes (success/failure)
- Checkpoint created
- Agent timeout/crash occurs
- Execution finishes

**JSON Schema:**

```json
{
  "id": "event_uuid",
  "timestamp": "2026-06-07T14:30:00Z",
  "event_type": "CRO_RUN",
  "source_agent": "runtime_orchestrator",
  "session_id": "session_20260607_001",
  "correlation_id": "corr_abc123",
  "payload": {
    "run_id": "run_20260607_001",
    "plan_id": "plan_20260607_001",
    "status": "queued | running | completed | failed | rolled_back",
    "start_time": "2026-06-07T14:00:00Z",
    "end_time": "2026-06-07T14:30:00Z",
    "duration_ms": 1800000,
    "step_count": 7,
    "step_results": [
      {
        "step_id": "step_1",
        "task_id": "task_1",
        "agent_name": "mla_harvester",
        "status": "success",
        "start_time": "2026-06-07T14:00:00Z",
        "end_time": "2026-06-07T14:02:00Z",
        "duration_ms": 120000,
        "output_size_bytes": 4096,
        "error": null
      }
    ],
    "failure_info": null,
    "recovery_action": null
  },
  "retention_days": 90
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| run_id | string | ✅ | Unique execution identifier |
| plan_id | string | ✅ | Which plan being executed |
| status | string | ✅ | Current execution status |
| start_time | ISO8601 | ✅ | When execution started |
| end_time | ISO8601 | ✅ | When execution finished |
| duration_ms | number | ✅ | Total duration |
| step_count | number | ✅ | Number of steps in plan |
| step_results | array | ✅ | Results for each step |
| failure_info | object | ❌ | Details if failed |
| recovery_action | string | ❌ | What was attempted to recover |

**Step Result Fields:**

| Field | Type | Description |
|-------|------|-------------|
| step_id | string | ✅ |
| task_id | string | ✅ |
| agent_name | string | ✅ |
| status | string | ✅ |
| duration_ms | number | ✅ |
| output_size_bytes | number | ✅ |
| error | string | ❌ (null if success) |

**Examples:**

```json
{
  "run_id": "run_phase23_001",
  "plan_id": "plan_phase23_001",
  "status": "completed",
  "duration_ms": 14400000,
  "step_count": 7,
  "step_results": [
    {
      "step_id": "step_1",
      "task_id": "task_1",
      "agent_name": "spec_writer",
      "status": "success",
      "duration_ms": 3600000,
      "output_size_bytes": 32768
    }
  ]
}
```

---

## STORAGE SCHEMA

### Event Store Format

**File Location:** `memory_store.json`

**Format:** JSON array (append-only log)

```json
[
  {
    "id": "evt_20260607_001",
    "timestamp": "2026-06-07T14:30:00Z",
    "event_type": "ARPS_DELTA",
    "source_agent": "arps_synthesizer",
    "session_id": "session_20260607_001",
    "correlation_id": "corr_abc123",
    "payload": { ... },
    "retention_days": 90,
    "checksum": "sha256:abc123...",
    "version": 1
  },
  { ... }
]
```

### Immutable Fields (per event)

- `id` — UUID, auto-generated, never changes
- `timestamp` — ISO8601, set at creation, never changes
- `event_type` — Locked at creation
- `checksum` — SHA256 hash of entire event, computed at write

### Validation Rules

1. **Schema Validation**
   - Every event must match its event_type schema exactly
   - Unknown fields → REJECT
   - Missing required fields → REJECT
   - Type mismatches → REJECT

2. **Temporal Validation**
   - Event timestamp must be ≥ previous event timestamp
   - Future timestamps (>5 seconds ahead) → WARN but accept

3. **Corruption Detection**
   - Recompute checksum on read
   - Mismatch → log WARNING but continue
   - Checksum field added retroactively (Phase 23.2)

### Access Patterns

**Write:**
- Append-only; no updates
- File locking: acquire lock, write .tmp file, atomic rename
- Durability: fsync after every 100 events

**Read:**
- Sequential scan (for early phases)
- Index by date + event_type (added in Phase 24)
- Lazy load: only load 7-day window into memory

---

## RETENTION POLICY

### Tiered Retention

| Event Type | Raw (Days) | Archived (Days) | Distilled | Notes |
|------------|-----------|-----------------|-----------|-------|
| ARPS_DELTA | 90 | S3 (1 yr) | Permanent | Governance history important |
| PIPELINE_RUN | 90 | S3 (1 yr) | Yes (summaries) | Keep trends long-term |
| AGENT_TELEMETRY | 90 | S3 (6 mo) | Yes (health) | Real-time + trend data |
| GOVERNANCE_SIGNAL | 365 | S3 (permanent) | Permanent | Audit trail, never delete |
| APR_PLAN | 365 | S3 (permanent) | Yes (patterns) | Learning signal |
| CRO_RUN | 90 | S3 (1 yr) | Yes (execution) | Execution history |

### Archival Process

**Every 90 days:**
1. Identify events where `timestamp < (now - 90 days)`
2. Batch to S3 in monthly files: `memory_archive_2026_01.json.gz`
3. Remove from `memory_store.json`
4. Log archival event in audit trail

**S3 location:** `s3://cic-memory-archive/events/YYYY/MM/memory_archive_YYYY_MM.json.gz`

### Distillation Rules

Events older than raw retention are distilled into **summaries** that are kept permanently.

**Distilled ARPS_DELTA:**
- Keep most recent value of each prompt/phase per month
- Discard intermediate states
- Example: 30 rewrites in June → 1 entry "June final state"

**Distilled PIPELINE_RUN:**
- Monthly aggregate: { total_runs, success_rate, avg_error_rate, p95_duration }
- Keep all data points for first 3 months, then monthly summaries

**Distilled GOVERNANCE_SIGNAL:**
- Keep all (these are audit trail)
- Index by decision type for fast lookup

**Distilled APR_PLAN:**
- Keep all (these are learning signals)
- Add summary: "Plans for feature development succeeded 92% of the time"

### Retention Configuration

Operator can override defaults in `memory_config.json`:

```json
{
  "retention_policy": {
    "ARPS_DELTA": { "raw_days": 90, "distilled": true },
    "PIPELINE_RUN": { "raw_days": 90, "distilled": true },
    "AGENT_TELEMETRY": { "raw_days": 90, "distilled": true },
    "GOVERNANCE_SIGNAL": { "raw_days": 365, "distilled": false },
    "APR_PLAN": { "raw_days": 365, "distilled": true },
    "CRO_RUN": { "raw_days": 90, "distilled": true }
  },
  "archive_destination": "s3://cic-memory-archive",
  "auto_archive": true,
  "archive_schedule_cron": "0 0 1 * *"
}
```

---

## VALIDATION RULES (STRICT)

### All Events

- `id`: Must be UUID v4
- `timestamp`: Must be ISO8601 and valid
- `event_type`: Must be one of 6 defined types
- `source_agent`: Must be non-empty string
- `session_id`: Must match pattern `session_YYYYMMDD_\d{3,}`
- `correlation_id`: Must match pattern `corr_[a-z0-9]{6,}`
- `retention_days`: Must be positive integer
- `payload`: Must be non-null object

### Payload-Specific

**ARPS_DELTA:**
- `change_type`: one of [phase_completion, phase_creation, prompt_rewrite, instruction_update, priority_adjustment]
- `old_value` + `new_value`: both non-empty if change_type is "prompt_rewrite"
- `confidence`: 0 ≤ x ≤ 1

**PIPELINE_RUN:**
- `items_failed` + `items_successful` ≤ `items_processed`
- `status`: if failed, `error_summary` required
- `duration_ms` = `end_time` - `start_time` (with 1s tolerance)

**AGENT_TELEMETRY:**
- `task_success_rate`: 0 ≤ x ≤ 1
- `status`: healthy if error_rate < 5%, degraded if 5-15%, failed if > 15%

**GOVERNANCE_SIGNAL:**
- `decision`: must match `signal_type` (e.g., signal_type=approval → decision=approved|rejected)

**APR_PLAN:**
- `task_graph`: must be valid DAG (no cycles)
- `agent_consensus_score`: 0 ≤ x ≤ 1

**CRO_RUN:**
- `step_results`: sorted by `step_id`
- Each step: `end_time` ≥ `start_time`

---

## ERROR HANDLING

### Invalid Event

**Policy:** Log and reject; do not poison memory store.

```javascript
try {
  validateEventSchema(event, event.event_type);
  appendToStore(event);
} catch (error) {
  logger.error('INVALID_EVENT', {
    event_id: event.id,
    error: error.message,
    event_type: event.event_type,
    source_agent: event.source_agent
  });
  return { status: 400, error: 'Schema validation failed' };
}
```

### File Corruption

**Policy:** Quarantine corrupted events, continue with rest.

```javascript
// On read:
try {
  const data = JSON.parse(fs.readFileSync('memory_store.json'));
  return data.filter(evt => {
    try {
      validateChecksum(evt);
      return true;
    } catch {
      logger.warn('CORRUPTED_EVENT', { event_id: evt.id });
      return false;
    }
  });
} catch {
  // File is unreadable; fail loud
}
```

### Write Failure

**Policy:** Atomic rename ensures never partial writes.

```javascript
// 1. Write to .tmp
fs.writeFileSync('memory_store.json.tmp', JSON.stringify(data));
// 2. Atomic rename (ACID guaranteed on most filesystems)
fs.renameSync('memory_store.json.tmp', 'memory_store.json');
// 3. If rename fails → entire transaction fails
```

---

## EXAMPLES

### Complete ARPS_DELTA Event

```json
{
  "id": "evt_20260607_abc123",
  "timestamp": "2026-06-07T09:15:00Z",
  "event_type": "ARPS_DELTA",
  "source_agent": "arps_synthesizer",
  "session_id": "session_20260607_001",
  "correlation_id": "corr_phase23_kickoff",
  "payload": {
    "change_type": "phase_completion",
    "phase_id": "23.1",
    "old_value": "23.1 — Memory Substrate Specification (MLA‑Spec) — PENDING",
    "new_value": "23.1 — Memory Substrate Specification (MLA‑Spec) — COMPLETE",
    "git_commit": "a1b2c3d4e5f6",
    "confidence": 1.0,
    "affected_subsystems": ["Roadmap Tracking", "Phase Status Display"]
  },
  "retention_days": 90,
  "checksum": "sha256:deadbeef",
  "version": 1
}
```

### Complete PIPELINE_RUN Event

```json
{
  "id": "evt_20260607_xyz789",
  "timestamp": "2026-06-07T10:45:30Z",
  "event_type": "PIPELINE_RUN",
  "source_agent": "pipeline_orchestrator",
  "session_id": "session_20260607_001",
  "correlation_id": "corr_phase23_spec",
  "payload": {
    "pipeline_name": "documentation",
    "pipeline_id": "run_20260607_doc_spec_001",
    "status": "success",
    "start_time": "2026-06-07T09:00:00Z",
    "end_time": "2026-06-07T10:45:30Z",
    "duration_ms": 6330000,
    "items_processed": 1,
    "items_successful": 1,
    "items_failed": 0,
    "error_summary": null,
    "metrics": {
      "throughput_items_per_second": 0.00015,
      "error_rate_percent": 0.0,
      "resource_usage_mb": 128
    },
    "failed_items": []
  },
  "retention_days": 90,
  "checksum": "sha256:cafebabe",
  "version": 1
}
```

---

## MIGRATION & BACKWARDS COMPATIBILITY

**Phase 23.1 (Today):** Schema locked.

**Future Changes:**
- New event types: add to enum, safe (consumers ignore unknown types)
- New fields in existing types: add as optional; existing readers ignore
- Renaming fields: requires version bump + migration script
- Deleting fields: disallowed (breaking change, requires major version)

**Migration Strategy:**
- Version field in each event (default: 1)
- Validator checks version, applies schema transformation if needed
- Old events never rewritten (immutable); just mapped at read-time

---

## OPERATIONAL NOTES

### Monitoring

Monitor these metrics continuously:

- `memory_store.json` file size (target: <100MB for 90-day window)
- Event ingestion rate (should be smooth, <100 events/second)
- Validation failure rate (should be <0.1%)
- Checksum mismatch rate (should be 0%)

### Performance Targets

- Event append: <10ms (p99)
- Event query (date + type): <100ms (p99)
- Weekly summarizer: <30 seconds
- Read-on-startup: <5 seconds (for 7-day window)

### Debugging

Log all events with correlation_id so traces can be reconstructed:

```
Memory ingest: corr_phase23_kickoff
  → ARPS_DELTA written
  → PIPELINE_RUN written
  → Summarizer picks up 2 events
  → Weekly summary generated
```

---

## SIGN-OFF

**Specification Status:** ✅ LOCKED (2026-06-07)

**Locked by:** Claude (Phase 23.1)

**Next Step:** Phase 23.2 — Implement MemoryStore with this schema.

**Changes after this point:** Require version bump and migration plan.

