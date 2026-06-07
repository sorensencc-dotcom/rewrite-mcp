# PHASE E PR SCAFFOLDING
*(Branch names, PR sequence, commit structure)*

This is the exact PR sequence to merge Phase E cleanly and safely.

---

## Branch Naming Convention
Use the Phase-E prefix for all work:

```
phase-e/persistence
phase-e/caching
phase-e/retry-breaker
phase-e/metrics
phase-e/config
phase-e/security
phase-e/runbooks
phase-e/finalization
```

---

## PR Sequence (8 PRs)

### PR 1 — Persistence Layer
**Branch:** `phase-e/persistence`  
**Commits:** 4  
**Size:** Medium

#### Commit 1: Interface Definition
```
feat(store): add IExecutionStore interface

- Define IExecutionStore contract
- Add ExecutionState type
- Add ExecutionFilter type
- Add type guards
```

#### Commit 2: FileExecutionStore Implementation
```
feat(store): implement FileExecutionStore

- JSON-backed file storage
- Atomic writes (tmpfile + rename)
- Directory creation
- Corruption handling
```

#### Commit 3: ContextServer Integration
```
refactor(context): integrate FileExecutionStore

- Replace in-memory Map with store
- Add persistence hooks (stage start/complete)
- Add recovery logic on startup
- Add state validation
```

#### Commit 4: Tests
```
test(store): add persistence tests

- Save/load/delete operations
- Corruption recovery
- Concurrency safety
- Restart recovery
```

**Tests:**
- `tests/execution/IExecutionStore.contract.test.ts`
- `tests/execution/FileExecutionStore.test.ts`
- `tests/server/ContextServer-persistence.test.ts`

**Merge Requirements:**
- ✓ All tests pass
- ✓ Coverage > 90%
- ✓ No breaking changes

---

### PR 2 — CachedAgentClient
**Branch:** `phase-e/caching`  
**Commits:** 3  
**Size:** Small

#### Commit 1: CachedAgentClient Implementation
```
feat(agents): add CachedAgentClient

- Deterministic cache key generation
- TTL-based invalidation
- Cache hit/miss metrics
- Clear cache method
```

#### Commit 2: Integration into Agents
```
refactor(agents): wrap real clients with caching

- Update RealAgentClients
- Instantiate CachedAgentClient
- Pass correct TTLs
```

#### Commit 3: Tests
```
test(agents): add caching tests

- Cache hit correctness
- TTL expiry behavior
- Key determinism
- Metrics recording
```

**Tests:**
- `tests/agents/CachedAgentClient.test.ts`

**Merge Requirements:**
- ✓ All tests pass
- ✓ Coverage > 90%
- ✓ Cache semantics validated

---

### PR 3 — Retry Engine
**Branch:** `phase-e/retry-breaker`  
**Commits:** 3  
**Size:** Medium

#### Commit 1: RetryPolicy Implementation
```
feat(resilience): add RetryPolicy with backoff

- Exponential backoff calculation
- Jitter implementation
- Error classification (retryable vs non-retryable)
- Max attempts enforcement
```

#### Commit 2: Integration into MCP Client
```
refactor(mcp): integrate RetryPolicy

- Wrap executeMethod with retry logic
- Classify errors as retryable
- Log retry attempts
- Emit retry metrics
```

#### Commit 3: Tests
```
test(resilience): add retry tests

- Backoff timing correctness
- Jitter in delays
- Non-retryable errors fail fast
- Max attempts enforced
```

**Tests:**
- `tests/resilience/RetryPolicy.test.ts`

**Merge Requirements:**
- ✓ All tests pass
- ✓ Backoff timing verified
- ✓ No infinite loops

---

### PR 4 — Circuit Breaker
**Branch:** `phase-e/retry-breaker` (follow-up or same)  
**Commits:** 3  
**Size:** Medium

#### Commit 1: CircuitBreaker Implementation
```
feat(resilience): add CircuitBreaker

- Three states: closed, open, half-open
- Configurable failure/success thresholds
- Cooldown window for reset attempts
- Per-agent tracking
```

#### Commit 2: Integration into FlowOrchestrator
```
refactor(orchestration): integrate CircuitBreaker

- Create breaker per agent
- Wrap agent calls with breaker
- Respect breaker state
- Log state transitions
```

#### Commit 3: Tests
```
test(resilience): add breaker tests

- State transition correctness
- Failure threshold enforcement
- Recovery after cooldown
- Metrics emission
```

**Tests:**
- `tests/resilience/CircuitBreaker.test.ts`

**Merge Requirements:**
- ✓ All tests pass
- ✓ State machine validated
- ✓ No deadlocks

---

### PR 5 — Structured Error Envelopes
**Branch:** `phase-e/metrics`  
**Commits:** 2  
**Size:** Small

#### Commit 1: ErrorEnvelope + Classification
```
feat(errors): add ErrorEnvelope

- Unified error structure
- Error classification (fatal/transient/validation/infrastructure)
- Context enrichment (agent, stage, correlation ID)
- Propagation support
```

#### Commit 2: Integration + Tests
```
refactor(errors): wrap all errors in envelopes

- Update all throw points
- Add envelope to error spans
- Update logs to include envelope
- Add tests
```

**Tests:**
- `tests/errors/ErrorEnvelope.test.ts`

**Merge Requirements:**
- ✓ All errors wrapped
- ✓ Classification deterministic
- ✓ Error spans include envelope

---

### PR 6 — Metrics + OTel
**Branch:** `phase-e/metrics`  
**Commits:** 3  
**Size:** Medium

#### Commit 1: MetricsExporter Implementation
```
feat(observability): add MetricsExporter

- Histograms: stage.latency, mcp.latency
- Counters: retry.count, cache.hits, cache.misses, breaker.trips
- Gauges: breaker.state
- Metric naming conventions
```

#### Commit 2: Integration into Pipeline
```
refactor(observability): emit metrics from all stages

- Record stage latencies
- Record MCP latencies
- Record cache hits/misses
- Record retry counts
- Record breaker trips
```

#### Commit 3: Tests
```
test(observability): add metrics tests

- Metrics emitted for each stage
- Metrics include proper labels
- Metrics survive multi-instance execution
- Metric values correct
```

**Tests:**
- `tests/observability/MetricsExporter.test.ts`

**Merge Requirements:**
- ✓ All metrics emit
- ✓ No metric drop-off
- ✓ Labels correct

---

### PR 7 — Config + Security
**Branch:** `phase-e/config`  
**Commits:** 4  
**Size:** Medium

#### Commit 1: Centralized Config Module
```
feat(config): add Config loader + validator

- Load from environment variables
- Apply defaults
- Validate required fields
- Structured config object
```

#### Commit 2: Admin Token + Rate Limiting
```
feat(security): add AdminTokenMiddleware + RateLimiter

- Bearer token validation
- Per-client rate limiting
- Admin endpoint protection
```

#### Commit 3: Admin API Endpoints
```
feat(api): add admin endpoints

- POST /admin/cache/clear
- GET /admin/status
- POST /admin/breaker/reset/{agent}
```

#### Commit 4: Tests + .env.template
```
test(config): add config + security tests

- Config loading
- Token validation
- Rate limit enforcement
- Endpoints require auth

chore: add .env.template
```

**Tests:**
- `tests/config/Config.test.ts`
- `tests/security/AdminTokenMiddleware.test.ts`
- `tests/security/RateLimiter.test.ts`

**Merge Requirements:**
- ✓ Config loads on startup
- ✓ Admin endpoints secured
- ✓ Rate limiting works

---

### PR 8 — Runbooks + Finalization
**Branch:** `phase-e/finalization`  
**Commits:** 3  
**Size:** Large (docs)

#### Commit 1: Runbooks
```
docs(runbooks): add Phase E operator runbooks

- DAILY_OPERATIONS.md
- INCIDENT_RESPONSE.md
- MCP_SERVER_FAILURE.md
- CIRCUIT_BREAKER_RECOVERY.md
- CACHE_MANAGEMENT.md
- BACKUP_AND_RESTORE.md
```

#### Commit 2: Backup Strategy
```
feat(backup): add daily backup script

- S3 snapshot on schedule
- Restore procedure
- Corruption detection
- Auto-repair
```

#### Commit 3: Completion Docs + Governance
```
docs: finalize Phase E

- PHASE_E_COMPLETION_SUMMARY.md
- PHASE_E_OPERATOR_HANDBOOK.md
- Update GOVERNANCE_APPROVAL_AUDIT.md
- Update exception registry (if changed)
```

**Merge Requirements:**
- ✓ All runbooks complete
- ✓ Backup tested
- ✓ Governance updated

---

## Merge Strategy

### For all PRs:
1. **Require green regression suite** (`npm run test:phase-e`)
2. **Require governance approval** (whitelist + exceptions)
3. **Require code review** (minimum 1 approval)
4. **Require type checking** (`npm run type-check`)
5. **Merge sequentially** (not in parallel)

### CI/CD:
- All PRs run full test suite
- All PRs check whitelist compliance
- Failed tests block merge

### Versioning:
```
v0.6.0-phase-e      # after PR 8 merged
```

---

## Rollback Plan
If critical issue found after merge:

1. Revert commits in reverse order
2. Document issue in `PHASE_E_BLOCKING_ISSUES.md`
3. Fix root cause
4. Re-merge in correct order

---

## Timeline Estimate
- PR 1 (persistence): 2–3 days
- PR 2 (caching): 1–2 days
- PR 3 (retry): 1–2 days
- PR 4 (breaker): 1–2 days
- PR 5 (errors): 1 day
- PR 6 (metrics): 2 days
- PR 7 (config): 2 days
- PR 8 (finalization): 2–3 days

**Total:** 12–16 days, assuming parallel reviews

---

## Sign-Off Checklist
- [ ] All branches created
- [ ] All commits drafted
- [ ] All tests written
- [ ] All governance checked
- [ ] Ready to open PR 1
