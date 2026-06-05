# Phase 45 — 7 New Skills

**Status:** ✅ **APPROVED** — Ready to implement (Tier 3, after Phase 44.4)  
**Timeline:** 6-8 hours (on approval)  
**Owner:** Claude Code Engineering  
**Date Blocked:** 2026-06-05

---

## Overview

Extend the skill library with 7 new capabilities for multi-service orchestration, context persistence, cost optimization, security scanning, dependency analysis, performance profiling, and audit logging.

---

## Skill Specifications

### Skill 45.1 — multi-endpoint-orchestrator

**Purpose:** Chain and coordinate skills across multiple services/APIs

**Input Schema:**
```json
{
  "endpoints": [
    { "service": "cic-analyzer", "skill": "phase-summarizer", "params": {...} },
    { "service": "rl-engine", "skill": "rewrite-detector", "params": {...} }
  ],
  "sequentialMode": true,
  "timeout": 60000,
  "fallbackStrategy": "skip-failed"
}
```

**Output:**
```json
{
  "results": [
    { "service": "cic-analyzer", "status": "success", "result": {...} },
    { "service": "rl-engine", "status": "success", "result": {...} }
  ],
  "executionTime": 12345,
  "failureCount": 0,
  "fallbacksApplied": 0
}
```

**Implementation:**
- Route skill invocations to correct services/APIs
- Handle sequential vs parallel execution
- Implement fallback strategies (skip, retry, use-default)
- Track cross-service latency and failures
- Timeout enforcement per service

**Tests:** 18 tests
- Sequential execution with parameter chaining
- Parallel execution with result merging
- Timeout handling per endpoint
- Fallback strategies (skip-failed, retry-3x, use-default)
- Cross-service error propagation
- Latency tracking

**Files:**
- `skills/multi-endpoint-orchestrator/index.js`
- `skills/multi-endpoint-orchestrator/schema.json`
- `skills/multi-endpoint-orchestrator/index.test.js`

---

### Skill 45.2 — context-memory-manager

**Purpose:** Persist and retrieve conversation context across sessions

**Input Schema:**
```json
{
  "action": "store|retrieve|delete|list",
  "namespace": "conversation-123",
  "key": "user-preferences",
  "value": {...},
  "ttl": 86400,
  "tags": ["important", "user-data"]
}
```

**Output:**
```json
{
  "success": true,
  "action": "store",
  "namespace": "conversation-123",
  "key": "user-preferences",
  "stored": {...},
  "expiresAt": "2026-06-06T12:00:00Z",
  "size": 2048
}
```

**Implementation:**
- Backend: Redis (distributed) or in-memory (dev)
- TTL-based automatic expiration
- Namespace isolation (per conversation/user/project)
- Tagging for bulk operations
- Size limits and eviction policies
- Audit logging

**Tests:** 16 tests
- Store and retrieve values
- TTL expiration
- Namespace isolation
- Tag-based queries
- Size enforcement
- Eviction policies
- Concurrent access

**Files:**
- `skills/context-memory-manager/index.js`
- `skills/context-memory-manager/schema.json`
- `skills/context-memory-manager/index.test.js`

---

### Skill 45.3 — cost-optimizer

**Purpose:** Track costs, suggest optimizations, predict trends

**Input Schema:**
```json
{
  "action": "analyze|forecast|suggest|report",
  "timeRange": "7d",
  "groupBy": "skill|workflow|provider",
  "threshold": 100,
  "includeForecasts": true
}
```

**Output:**
```json
{
  "period": "2026-05-29 to 2026-06-05",
  "totalCost": 1250.50,
  "breakdown": {
    "claude-api": 800.00,
    "gcp-run": 300.00,
    "azure-function": 150.50
  },
  "trends": [
    { "date": "2026-06-05", "cost": 180, "delta": "+5%" }
  ],
  "suggestions": [
    { "skill": "agent-drift-detector", "savings": "10%", "action": "cache results" },
    { "workflow": "pipeline-orchestration", "savings": "15%", "action": "reduce frequency" }
  ],
  "forecast": { "week": 1300, "month": 5200 }
}
```

**Implementation:**
- Ingest cost data from Phase 48 costLog.json
- Aggregate costs by skill, workflow, service, time
- Calculate trends and anomalies
- Generate optimization suggestions
- Forecast future spending based on patterns
- Alert on budget overages

**Tests:** 14 tests
- Cost aggregation by dimension
- Trend calculation
- Anomaly detection
- Suggestion generation
- Forecast accuracy
- Budget alerts

**Files:**
- `skills/cost-optimizer/index.js`
- `skills/cost-optimizer/schema.json`
- `skills/cost-optimizer/index.test.js`

---

### Skill 45.4 — security-scanner

**Purpose:** Detect vulnerabilities in code, config, dependencies

**Input Schema:**
```json
{
  "scanType": "code|config|dependencies|all",
  "codeDir": "/path/to/code",
  "rules": ["sql-injection", "xss", "secrets", "unsafe-deserialization"],
  "severity": "high|medium|low|all"
}
```

**Output:**
```json
{
  "scanId": "scan-abc123",
  "timestamp": "2026-06-05T12:00:00Z",
  "findings": [
    {
      "type": "secrets",
      "severity": "critical",
      "file": "apps/skill-gateway/index.js",
      "line": 42,
      "issue": "Hardcoded AWS_SECRET_KEY detected",
      "remediation": "Move to .env or secrets manager"
    },
    {
      "type": "code",
      "severity": "high",
      "file": "skills/agent-drift-detector/index.js",
      "line": 88,
      "issue": "Potential SQL injection in query construction",
      "remediation": "Use parameterized queries"
    }
  ],
  "summary": {
    "critical": 1,
    "high": 2,
    "medium": 3,
    "low": 0,
    "total": 6
  }
}
```

**Implementation:**
- Scan code for hardcoded secrets (via regex/pattern matching)
- Detect unsafe patterns (SQL injection, XSS, deserialization)
- Check dependencies for known CVEs (via npm audit)
- Validate config files (env vars, secrets, permissions)
- Suggest remediations
- Generate SARIF report for CI/CD integration

**Tests:** 17 tests
- Secret detection
- Code vulnerability detection
- Dependency scanning
- Config validation
- SARIF report generation
- False positive rates

**Files:**
- `skills/security-scanner/index.js`
- `skills/security-scanner/schema.json`
- `skills/security-scanner/index.test.js`

---

### Skill 45.5 — dependency-analyzer

**Purpose:** Analyze project dependencies, find updates, check compatibility

**Input Schema:**
```json
{
  "projectPath": "/path/to/project",
  "action": "list|check-updates|check-compatibility|audit",
  "includeDevDeps": true,
  "includeTransitive": true
}
```

**Output:**
```json
{
  "project": "skill-gateway",
  "packageManager": "npm",
  "dependencies": [
    {
      "name": "express",
      "current": "4.18.2",
      "latest": "4.19.0",
      "major": false,
      "breakingChanges": false,
      "updateRecommended": true,
      "status": "up-to-date"
    },
    {
      "name": "vitest",
      "current": "4.1.8",
      "latest": "5.0.0",
      "major": true,
      "breakingChanges": true,
      "updateRecommended": false,
      "releaseNotes": "https://..."
    }
  ],
  "summary": {
    "total": 23,
    "upToDate": 18,
    "updatesAvailable": 5,
    "majorVersions": 2,
    "criticalSecurityUpdates": 0
  },
  "recommendations": [
    { "action": "update", "package": "express", "reason": "minor patch" },
    { "action": "evaluate", "package": "vitest", "reason": "major breaking change" }
  ]
}
```

**Implementation:**
- Parse package.json/package-lock.json
- Query npm registry for latest versions
- Detect breaking changes (semver analysis)
- Check transitive dependency conflicts
- Generate upgrade recommendations
- Simulate compatibility with major updates

**Tests:** 15 tests
- Package parsing
- Version checking
- Semver analysis
- Conflict detection
- Recommendation generation
- Transitive dependency tracking

**Files:**
- `skills/dependency-analyzer/index.js`
- `skills/dependency-analyzer/schema.json`
- `skills/dependency-analyzer/index.test.js`

---

### Skill 45.6 — performance-profiler

**Purpose:** Profile skill execution, identify bottlenecks, suggest optimizations

**Input Schema:**
```json
{
  "skillName": "agent-drift-detector",
  "sampleSize": 100,
  "profiling": "execution-time|memory|cpu|all",
  "compareBaseline": true,
  "generateReport": true
}
```

**Output:**
```json
{
  "skill": "agent-drift-detector",
  "profilingPeriod": "2026-05-29T00:00:00Z to 2026-06-05T00:00:00Z",
  "samples": 347,
  "metrics": {
    "execution": {
      "min": 145,
      "max": 2340,
      "median": 420,
      "p95": 1200,
      "p99": 1800
    },
    "memory": {
      "peak": 45.2,
      "average": 28.5,
      "unit": "MB"
    },
    "cpu": {
      "average": 35,
      "peak": 78,
      "unit": "%"
    }
  },
  "bottlenecks": [
    {
      "phase": "schema-validation",
      "time": "45ms",
      "percentage": "10%",
      "suggestion": "Cache schema compilation"
    },
    {
      "phase": "comparison-logic",
      "time": "280ms",
      "percentage": "67%",
      "suggestion": "Optimize algorithm or parallelize"
    }
  ],
  "vs_baseline": {
    "execution": "+8%",
    "memory": "-2%",
    "status": "regressed"
  }
}
```

**Implementation:**
- Collect metrics from skill invocations
- Calculate percentiles and distributions
- Identify bottleneck phases
- Compare against baseline (historical)
- Generate flamegraph (optional)
- Suggest optimizations

**Tests:** 13 tests
- Metric collection
- Percentile calculation
- Bottleneck detection
- Baseline comparison
- Report generation

**Files:**
- `skills/performance-profiler/index.js`
- `skills/performance-profiler/schema.json`
- `skills/performance-profiler/index.test.js`

---

### Skill 45.7 — audit-logger

**Purpose:** Centralized audit trail for compliance and debugging

**Input Schema:**
```json
{
  "action": "log|query|export|retention",
  "event": "skill-invoked|workflow-executed|config-changed|access-granted",
  "actor": "user-123",
  "resource": "skill:agent-drift-detector",
  "changes": {...},
  "timeRange": "7d"
}
```

**Output:**
```json
{
  "auditId": "audit-abc123",
  "timestamp": "2026-06-05T12:34:56Z",
  "event": "skill-invoked",
  "actor": "claude-code",
  "resource": "skill:agent-drift-detector",
  "action": "execute",
  "result": "success",
  "changes": {
    "status": "running → completed",
    "duration": "420ms"
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "retention": "2026-07-05T12:34:56Z"
}
```

**Implementation:**
- Append-only audit log (similar to Phase 48 costLog.json)
- Immutable records with cryptographic signatures
- Query interface (by actor, resource, time range, event type)
- Export to audit-log.jsonl
- Automatic retention enforcement (default 30 days)
- Integration with telemetry system

**Tests:** 12 tests
- Event logging
- Query by various dimensions
- Retention enforcement
- Immutability verification
- Export formatting

**Files:**
- `skills/audit-logger/index.js`
- `skills/audit-logger/schema.json`
- `skills/audit-logger/index.test.js`

---

## Integration Points

1. **Skill Runtime** — All 7 skills integrated into SkillRuntime via loader
2. **Extended Telemetry** — Performance metrics automatically recorded
3. **Orchestrator** — Cost-optimizer and security-scanner trigger based on schedules/alerts
4. **HTTP Gateway** — All 7 skills exposed via REST API
5. **Operator Console** — Dashboard displays cost trends, security findings, performance profiles

---

## Dependencies

- `npm audit` — Built-in npm functionality (security-scanner)
- `semver` (npm) — Semver version comparison (dependency-analyzer)
- `ioredis` (optional) — Redis backend for context-memory-manager

---

## Testing Strategy

- **Unit Tests:** Each skill tested independently (105 tests total)
- **Integration Tests:** Skills chaining together (21 tests)
- **Data Validation:** Input/output schema compliance (14 tests)
- **Performance Baseline:** Establish baseline metrics for Phase 46 regression testing

---

## Deployment

- Deploy same way as Phase 44 skills
- Add to skill manifest in skill-tool-config.json
- Update MCP tool definitions
- Update HTTP Gateway endpoint docs

---

## Success Criteria

- ✅ All 140 tests passing
- ✅ Each skill < 500 lines of code
- ✅ Schema validation on all inputs
- ✅ Consistent error handling
- ✅ Telemetry integration verified
- ✅ API documentation complete
- ✅ Integration tests with orchestrator pass

---

## Blockers & Prerequisites

- ✅ Phase 44.0-44.5 complete (all skills, workflows, telemetry)
- ⏳ Phase 44.4 complete (orchestrator)
- ⏳ Approval to proceed
- ⏳ Skills Policy Agent spec finalized (related requirement)

**Status:** 🔴 BLOCKED — Waiting for approval

---

**Next Step:** Approve Phase 45 to proceed with implementation

---

## Phase 45 Dependencies

Phase 45 requires Phase 44.4 (Autonomous Orchestrator) to be complete for:
- context-memory-manager (stores workflow context)
- cost-optimizer (analyzes Phase 48 cost logs)
- security-scanner (triggered on config changes)
- audit-logger (logs all orchestrator actions)

**Recommendation:** Implement Phase 44.4 first, then Phase 45.
