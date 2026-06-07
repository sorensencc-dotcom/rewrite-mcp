# PHASE D REGRESSION TEST PLAN
*Ensures the entire system remains stable across changes*

## Test Suite Structure
```
tests/
  ├── pipeline/
  │     ├── pipeline-success.test.ts
  │     ├── pipeline-failure.test.ts
  │     ├── pipeline-conditional-routing.test.ts
  │     └── pipeline-retry-circuitbreaker.test.ts
  ├── mcp/
  │     ├── mcp-summarizer.test.ts
  │     ├── mcp-drift.test.ts
  │     ├── mcp-diagnostics.test.ts
  │     └── mcp-docs-sync.test.ts
  ├── governance/
  │     ├── whitelist.test.ts
  │     ├── exceptions.test.ts
  │     └── artifact-validation.test.ts
  └── observability/
        ├── trace-propagation.test.ts
        ├── span-structure.test.ts
        └── correlation-id.test.ts
```

---

## 1. Pipeline Tests

### 1.1 Full Success Path
**Test:** `pipeline-success.test.ts`
- [ ] All 6 stages execute in order
- [ ] Each stage receives correct input from prior stage
- [ ] Final output is well-formed JSON
- [ ] No errors or retries
- [ ] Execution time < 5s

### 1.2 Stage Failure → Pipeline Failure
**Test:** `pipeline-failure.test.ts`
- [ ] If stage 1 fails, pipeline fails
- [ ] If stage N fails (2-6), pipeline fails
- [ ] Error is captured and logged
- [ ] No orphan MCP calls
- [ ] Circuit breaker does not open (single failure is expected)

### 1.3 Conditional Routing Correctness
**Test:** `pipeline-conditional-routing.test.ts`
- [ ] Stage 5 correctly routes based on condition
- [ ] Route A produces expected output
- [ ] Route B produces expected output
- [ ] Invalid condition triggers error
- [ ] Routing decision is logged

### 1.4 Retry Logic
**Test:** `pipeline-retry-circuitbreaker.test.ts`
- [ ] Transient MCP failure triggers 1 retry
- [ ] Retry succeeds, pipeline continues
- [ ] Max 3 retries enforced
- [ ] After max retries, stage fails
- [ ] Retry count is logged

### 1.5 Circuit Breaker Activation
**Test:** `pipeline-retry-circuitbreaker.test.ts`
- [ ] After 5 consecutive failures, breaker opens
- [ ] Open breaker rejects new calls immediately
- [ ] After 30s, breaker attempts half-open
- [ ] Half-open success closes breaker
- [ ] Half-open failure re-opens breaker

### 1.6 Recovery After Breaker Reset
**Test:** `pipeline-retry-circuitbreaker.test.ts`
- [ ] Closed → Open (via failures)
- [ ] Wait 30s → Half-Open
- [ ] Single success → Closed
- [ ] Next pipeline execution succeeds

---

## 2. MCP Agent Tests

### 2.1 Code Analyzer
**Test:** `mcp-summarizer.test.ts` (Stage 1)
- [ ] Accepts valid source code
- [ ] Returns structured JSON (classes, functions, imports)
- [ ] Rejects invalid syntax with clear error
- [ ] Handles timeout (> 2s) gracefully

### 2.2 Call Graph Extractor
**Test:** `mcp-summarizer.test.ts` (Stage 2)
- [ ] Accepts code structure from Stage 1
- [ ] Returns call graph (edges, weights)
- [ ] Handles circular dependencies
- [ ] Detects unused functions

### 2.3 Narrative Linker
**Test:** `mcp-summarizer.test.ts` (Stage 3)
- [ ] Accepts call graph from Stage 2
- [ ] Produces narrative annotations
- [ ] Links related functions
- [ ] Handles ambiguous references

### 2.4 Context Synthesizer
**Test:** `mcp-summarizer.test.ts` (Stage 4)
- [ ] Accepts narrative from Stage 3
- [ ] Synthesizes context vector
- [ ] Returns structured context JSON
- [ ] No semantic drift from input

### 2.5 Conditional Router
**Test:** `mcp-drift.test.ts` (Stage 5)
- [ ] Evaluates routing condition correctly
- [ ] Routes to appropriate handler
- [ ] Logs routing decision
- [ ] Handles malformed condition

### 2.6 Diagnostics (Array Fix)
**Test:** `mcp-diagnostics.test.ts` (Stage 6)
- [ ] **Receives array, not string** ✓
- [ ] Processes each diagnostic object
- [ ] Returns aggregated diagnostics
- [ ] Handles empty array
- [ ] Handles malformed array elements

### 2.7 Docs Sync
**Test:** `mcp-docs-sync.test.ts`
- [ ] Syncs output to documentation
- [ ] Creates/updates .md files
- [ ] Handles file system errors gracefully
- [ ] Preserves existing sections

---

## 3. Governance Tests

### 3.1 Whitelist Enforcement
**Test:** `whitelist.test.ts`
- [ ] All produced artifacts match whitelist
- [ ] Unapproved artifact type rejected
- [ ] Whitelist is loaded from `ARTIFACT_WHITELIST.md`
- [ ] Cache update triggers validation

### 3.2 Exception Registry Enforcement
**Test:** `exceptions.test.ts`
- [ ] 10 registered exceptions accepted
- [ ] Each exception has sunset date
- [ ] Expired exception triggers warning
- [ ] Exception logging includes context

### 3.3 Artifact Classification
**Test:** `artifact-validation.test.ts`
- [ ] Each artifact classified correctly
- [ ] Classification matches whitelist entry
- [ ] Misclassified artifact rejected
- [ ] Classification audit logged

---

## 4. Observability Tests

### 4.1 Trace ID Consistency
**Test:** `trace-propagation.test.ts`
- [ ] Root span has trace_id
- [ ] All child spans inherit trace_id
- [ ] No span crosses trace boundary
- [ ] Trace ends with root completion

### 4.2 Span Structure Correctness
**Test:** `span-structure.test.ts`
- [ ] Each span has required fields (trace_id, span_id, parent_span_id, agent, method, latency_ms, status, correlation_id)
- [ ] Span timing is monotonic (child.end_time ≤ parent.end_time)
- [ ] No span overlaps incorrectly
- [ ] Latencies add up (within margin of error)

### 4.3 Correlation ID Propagation
**Test:** `correlation-id.test.ts`
- [ ] Correlation ID generated at root
- [ ] Propagated to all spans
- [ ] Propagated to all logs
- [ ] Matches MCP server logs

---

## Test Execution
Run all tests:
```bash
npm run test:phase-d
```

Run by category:
```bash
npm run test:pipeline
npm run test:mcp
npm run test:governance
npm run test:observability
```

Run specific test:
```bash
npm run test -- --grep "pipeline-success"
```

---

## Test Coverage Target
- [ ] Pipeline: 95%+ coverage
- [ ] MCP agents: 90%+ coverage
- [ ] Governance: 95%+ coverage
- [ ] Observability: 85%+ coverage

**Overall target:** 90%+ coverage for Phase D

---

## CI/CD Integration
- Tests run on every commit (pre-commit hook)
- Tests run on every PR (GitHub Actions)
- Tests run nightly (regression suite)
- Failed tests block merge to main

---

## Debugging Failures
If a test fails:

1. **Check trace logs:**
   ```bash
   npm run logs -- --trace-id {trace_id} --format json
   ```

2. **Check governance state:**
   ```bash
   npm run governance:audit
   ```

3. **Check MCP server health:**
   ```bash
   npm run health:mcp
   ```

4. **Replay the failure:**
   ```bash
   npm run replay-test -- --test-id {test_id}
   ```
