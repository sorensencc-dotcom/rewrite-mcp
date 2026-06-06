# PHASE E OPERATOR HANDBOOK
**Distributed Scaling + Production Hardening**

Version: 1.0
Owner: Chris
Date: 2026-06-06

---

## 1. Purpose
Phase E transforms the CIC Main Pipeline into a **distributed, fault-tolerant, multi-instance, observable, production-ready system**.

This handbook defines:
- Operational procedures
- Failure handling
- Configuration
- Observability
- Backup strategy
- Runbooks
- Escalation paths

---

## 2. System Overview
Phase E introduces three foundational subsystems:

### E.0 — Execution State Persistence
- Pluggable `IExecutionStore`
- Default: `FileExecutionStore`
- Enables multi-instance deployment
- Enables crash-safe recovery

### E.1 — Agent Result Caching
- `CachedAgentClient`
- Deterministic cache keys
- TTL-based invalidation
- 10× speedup on repeated analysis

### E.2 — Error Recovery
- Retry engine (exponential backoff + jitter)
- Circuit breakers (half-open state)
- Structured error envelopes
- Self-healing flows

---

## 3. Observability
Phase E uses **OpenTelemetry** for:
- Traces
- Metrics
- Logs

### Key Metrics
- `pipeline.duration` — total pipeline execution time
- `stage.latency` — per-stage execution time
- `mcp.latency` — MCP round-trip time
- `cache.hit` / `cache.miss` — cache effectiveness
- `retry.count` — number of retries per execution
- `breaker.state` — circuit breaker state per agent

### Trace Requirements
- Single root span per execution
- Child spans per stage
- MCP spans linked to Ruflo spans
- Correlation ID propagation (all logs + spans)

---

## 4. Configuration
All configuration is centralized and validated at startup.

### Config Surfaces
```
executionStore:
  type: 'file' | 's3'
  path: string

cache:
  enabled: boolean
  ttlMs: Record<string, number>
  maxSize: number

retry:
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number

breaker:
  failureThreshold: number
  successThreshold: number
  cooldownMs: number

metrics:
  enabled: boolean
  exporter: 'stdout' | 'otlp'
  samplingRate: number

mcp:
  endpoints: Record<string, string>
  timeoutMs: number

admin:
  token: string
  rateLimit: number
```

### Environment Variables
All config can be overridden via environment variables (see `.env.template`).

### Validation
- Missing config → defaults applied
- Invalid config → fail fast on startup
- Required fields: `EXECUTION_STORE_PATH`, `ADMIN_TOKEN`

---

## 5. Backup Strategy
Daily backups of execution state:

### Schedule
```
0 2 * * * /usr/local/bin/backup-executions.sh
```

### Details
- **Frequency:** Daily (2 AM)
- **Location:** S3 (`s3://ruflo-backups/executions/YYYY-MM-DD.tar.gz`)
- **Retention:** 30 days
- **Format:** gzip tar archive
- **Size:** ~10–100 MB (depends on execution volume)

### Restore Procedure
```bash
# 1. Download backup
aws s3 cp s3://ruflo-backups/executions/2026-06-05.tar.gz .

# 2. Restore to execution store
tar -xzf 2026-06-05.tar.gz -C /var/lib/ruflo/executions

# 3. Validate
npm run validate:execution-store

# 4. Restart ContextServer
systemctl restart context-server
```

---

## 6. Runbooks

### 6.1 Daily Operations
**Purpose:** Daily health checks and maintenance.

**Checklist:**
- [ ] MCP servers reachable (check `/health` on ports 7070–7074)
- [ ] ContextServer reachable (`curl http://localhost:3000/health`)
- [ ] No circuit breakers open (check metrics)
- [ ] Cache hit rate > 70% (check metrics)
- [ ] Stage latency stable (check latency heatmap)
- [ ] Retry count normal (< 1 retry per 100 executions)
- [ ] No error rate spike (< 0.1%)
- [ ] No serialization errors in logs
- [ ] Yesterday's backup completed
- [ ] All multi-instance configs match

---

### 6.2 Incident Response
**MCP Server Down**
1. Identify which server is down (use health grid)
2. Check server logs
3. Restart server: `systemctl restart mcp-server@{port}`
4. Verify recovery: `/health` returns 200
5. Monitor retry behavior (should recover automatically)
6. Alert on-call if outage > 5 min

**Circuit Breaker Stuck Open**
1. Verify breaker is open: `curl http://localhost:3000/admin/status`
2. Check failure logs
3. Identify root cause
4. Fix root cause
5. Manual reset: `curl -X POST http://localhost:3000/admin/breaker/reset/{agent}`
6. Verify half-open state: `curl http://localhost:3000/admin/status`

**Retry Storm**
1. Detect: retry count spike in metrics
2. Identify: which agent/stage is retrying
3. Check MCP server health
4. Manual intervention: increase `RETRY_MAX_DELAY_MS` (temporary)
5. Escalate to on-call

**Serialization Errors**
1. Check logs for error message
2. Identify which stage failed
3. Check MCP server output format
4. Compare with schema
5. Escalate to on-call engineer

---

### 6.3 Cache Management
**Manual Flush**
```bash
curl -X POST http://localhost:3000/admin/cache/clear \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

**TTL Tuning**
1. Check current hit rate (metrics)
2. If hit rate < 70%, increase TTLs
3. Update `.env` with new values
4. Restart ContextServer
5. Monitor hit rate for 1 hour

**Cache Corruption Recovery**
1. Detect corruption (auto-detected on load)
2. Clear cache: use manual flush above
3. Restart ContextServer
4. Verify metric recovery

---

### 6.4 Backup + Restore
**Backup Verification**
```bash
# Check latest backup exists
aws s3 ls s3://ruflo-backups/executions/ --sort=time --reverse | head -1

# Verify backup integrity
tar -tzf backup-file.tar.gz | head -20
```

**Restore from Backup**
1. Identify backup date: `aws s3 ls s3://ruflo-backups/executions/`
2. Stop ContextServer: `systemctl stop context-server`
3. Backup current state: `tar -czf /tmp/executions-current.tar.gz /var/lib/ruflo/executions`
4. Clear current state: `rm -rf /var/lib/ruflo/executions/*`
5. Download backup: `aws s3 cp s3://ruflo-backups/executions/{DATE}.tar.gz .`
6. Extract: `tar -xzf {DATE}.tar.gz -C /var/lib/ruflo/executions`
7. Validate: `npm run validate:execution-store`
8. Restart ContextServer: `systemctl start context-server`
9. Verify: `curl http://localhost:3000/health`

---

## 7. Escalation Paths
Severity levels and escalation procedures:

### SEV-1: Pipeline Down
- **Condition:** `npm run cic:main` returns error
- **Immediate Actions:**
  1. Check all MCP servers (`/health`)
  2. Check ContextServer logs
  3. Attempt recovery (no user action needed)
- **If unresolved in 5 min:** Escalate to on-call engineer
- **On-call action:** Check PHASE_E_COMPLETION_SUMMARY.md for validation checklist

### SEV-2: MCP Server Down
- **Condition:** Single MCP server unresponsive
- **Immediate Actions:**
  1. Restart server
  2. Verify recovery (auto-retry should succeed)
- **If unresolved in 2 min:** Escalate to on-call engineer
- **On-call action:** Check MCP server logs, may need to rebuild/redeploy

### SEV-3: Latency Degradation
- **Condition:** Stage latency > 5s (normal is ~2s)
- **Immediate Actions:**
  1. Check MCP server latency (metrics)
  2. Check cache hit rate (should be > 70%)
  3. Investigate slow spans in trace explorer
- **If > 10s:** Escalate to on-call engineer

### SEV-4: Non-Blocking Errors
- **Condition:** Logs show errors but pipeline recovers
- **Action:** Document in operator notes, update PHASE_E_COMPLETION_SUMMARY.md

---

## 8. Phase E Completion Criteria
To declare Phase E production-ready:

- [ ] Multi-instance deployment validated
- [ ] Caching stable with ≥70% hit rate on repeated flows
- [ ] Retry + breaker logic validated under failure injection
- [ ] Metrics emitting correctly to OTel backend
- [ ] Backups functioning (daily, restorable)
- [ ] All runbooks tested + documented
- [ ] Configuration surfaces stable
- [ ] Admin token + rate limiting active
- [ ] Pre-commit governance hook enforcing whitelist
- [ ] Zero critical issues outstanding
- [ ] All governance docs updated
- [ ] Team trained on operator procedures

---

## 9. Common Operations

### Check System Health
```bash
npm run health:full
# Outputs: MCP servers, ContextServer, metrics, execution store
```

### View Metrics
```bash
curl http://localhost:3000/metrics
```

### View Execution History
```bash
curl http://localhost:3000/executions?limit=10
```

### View Trace by ID
```bash
curl http://localhost:6831/traces/{trace_id}
```

### Check Circuit Breaker Status
```bash
curl http://localhost:3000/admin/status
```

### Restart All Services
```bash
systemctl restart mcp-server@*
systemctl restart context-server
systemctl restart metrics-exporter
```

---

## 10. Contacts + Escalation
- **On-Call Engineer:** See PagerDuty schedule
- **Governance Reviewer:** Chris
- **MCP Server Owner:** [Team name]
- **Infrastructure Owner:** [Team name]

---

## Document History
| Date | Author | Change |
|------|--------|--------|
| 2026-06-06 | Chris | Initial Phase E Operator Handbook |
