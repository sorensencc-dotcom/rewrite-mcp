# PHASE D HARDENING LOOP PLAN
*(Runs from 2026-06-07 → 2026-06-20)*

This is the 2-week stabilization cycle before the Phase D Gate.

---

## WEEK 1 — Stability, Coverage, and Determinism

### Day 1–2: Determinism Validation
- [ ] Run pipeline 5× with identical inputs
- [ ] Compare outputs byte-for-byte
- [ ] Validate no nondeterministic ordering
- [ ] Validate stable trace structure
- [ ] Record all traces for comparison

**Success criteria:**
- All 5 runs produce identical JSON output
- Trace structure identical across runs
- No variance in latency > 10%

---

### Day 3–4: Test Coverage Expansion
Add tests for:
- [ ] `rewrite-labs-orchestrator` integration
- [ ] `cic-docs-sync` output validation
- [ ] Conditional routing (Stage 5) both branches
- [ ] MCP diagnostics edge cases (empty arrays, malformed objects)
- [ ] Error propagation through all stages

**Files to update:**
- `tests/mcp/mcp-orchestrator.test.ts` (NEW)
- `tests/mcp/mcp-docs-sync.test.ts` (NEW)
- `tests/pipeline/pipeline-conditional-routing.test.ts` (expand)
- `tests/mcp/mcp-diagnostics.test.ts` (expand)

**Target coverage:**
- orchestrator: 90%+
- docs-sync: 90%+
- conditional routing: 95%+

---

### Day 5: Failure Injection
Simulate and validate recovery:

#### Scenario 1: MCP Server Timeout
- [ ] Kill summarizer server mid-execution
- [ ] Validate retry triggers
- [ ] Validate circuit breaker behavior
- [ ] Validate pipeline eventually succeeds

#### Scenario 2: MCP Server Malformed Payload
- [ ] Configure diagnostics server to return invalid JSON
- [ ] Validate error capture
- [ ] Validate error span includes full context
- [ ] Validate graceful degradation

#### Scenario 3: Ruflo Agent Failure
- [ ] Inject exception in context-synth agent
- [ ] Validate error propagates to root
- [ ] Validate trace includes error details
- [ ] Validate governance audit logs failure

#### Scenario 4: Network Jitter
- [ ] Add 200–500ms latency to MCP calls
- [ ] Validate no timeouts occur
- [ ] Validate latency heatmap captures jitter
- [ ] Validate stable retry behavior

**Success criteria:**
- All 4 scenarios handled gracefully
- No silent failures
- All errors logged + traced
- Pipeline recovers when possible

---

## WEEK 2 — Governance, Observability, and Pre-E Prep

### Day 6–7: Governance Sync
- [ ] Re-evaluate artifact whitelist against actual outputs
- [ ] Verify all 12 artifacts still approved
- [ ] Update exception registry (remove expired entries)
- [ ] Validate pre-commit hook catches violations
- [ ] Validate hook allows approved artifacts
- [ ] Run governance audit: `npm run governance:audit`

**Files to update:**
- `ARTIFACT_WHITELIST.md` (if whitelist changes)
- `GOVERNANCE_APPROVAL_AUDIT.md` (timestamp update)
- Exception sunset dates (if any expire)

---

### Day 8–9: Observability Deep Dive

#### Span Metadata Completeness
- [ ] Verify every span has: `trace_id`, `span_id`, `parent_span_id`, `agent`, `method`, `latency_ms`, `status`, `correlation_id`
- [ ] Validate no missing fields
- [ ] Validate field types correct

#### Correlation ID Propagation
- [ ] Generate correlation ID at root
- [ ] Verify in all 6 stage spans
- [ ] Verify in all logs
- [ ] Verify in MCP server logs

#### Latency Heatmap
- [ ] Capture latencies from 10 consecutive runs
- [ ] Compute per-stage percentiles (p50, p95, p99)
- [ ] Validate no stage exceeds threshold (5s)
- [ ] Store heatmap in `observability/latency-baseline.json`

#### Orphan Span Detection
- [ ] Query all spans in last 7 days
- [ ] Verify every span has parent_span_id or is root
- [ ] Verify no cross-trace parent references
- [ ] Alert if orphans found

**Success criteria:**
- 100% span metadata complete
- Correlation ID in 100% of traces
- Latency p99 < 5s per stage
- 0 orphan spans

---

### Day 10: Phase D Gate Review
- [ ] All regression tests green
- [ ] All determinism tests passed (5/5 runs identical)
- [ ] Failure injection tests passed (4/4 scenarios)
- [ ] Coverage expanded (orchestrator, docs-sync, routing)
- [ ] Governance docs updated
- [ ] Observability baseline captured
- [ ] Zero critical issues outstanding

**Gate approval criteria:**
- ✓ Determinism: validated
- ✓ Stability: validated
- ✓ Governance: compliant
- ✓ Observability: baseline captured
- ✓ Test coverage: 90%+ overall
- ✓ MCP integration: stable

**Decision:** Approve transition to Phase E Week 1 (IExecutionStore + Caching)

---

## Daily Checklist (Days 1–10)

Each morning:
- [ ] Start all servers
- [ ] Verify health checks
- [ ] Run scheduled task
- [ ] Capture logs + traces
- [ ] Update progress in this document
- [ ] Note any anomalies

---

## Rollback Plan
If critical issue found:
1. Revert to last known good commit
2. Document issue in `PHASE_D_BLOCKING_ISSUES.md`
3. Fix root cause
4. Re-enter hardening loop at Day 1

---

## Success Criteria for Phase D → Phase E Transition
- [ ] 5 consecutive deterministic runs
- [ ] 0 circuit breaker activations
- [ ] 0 retry storms
- [ ] 0 serialization errors
- [ ] 90%+ test coverage
- [ ] Full observability baseline
- [ ] Governance compliant
- [ ] Phase D Gate approved by 2026-06-20
