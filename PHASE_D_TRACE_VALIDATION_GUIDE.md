# PHASE D TRACE-VALIDATION GUIDE
*Ensures your distributed tracing is correct, complete, and deterministic*

## 1. Trace Structure
A valid CIC Main Pipeline trace must show:

```
root: cic-main-pipeline
  ├── stage-1: code-analyzer
  ├── stage-2: call-graph
  ├── stage-3: narrative-linker
  ├── stage-4: context-synth
  ├── stage-5: conditional-router
  └── stage-6: diagnostics
```

Validation:
- [ ] Exactly 1 root span
- [ ] 6 child spans
- [ ] No orphan spans
- [ ] No cross-trace contamination

---

## 2. Trace Metadata
Each span must include:
- [ ] `trace_id`
- [ ] `span_id`
- [ ] `parent_span_id`
- [ ] `agent`
- [ ] `method`
- [ ] `latency_ms`
- [ ] `status`
- [ ] `correlation_id`

---

## 3. Error Propagation
If any stage fails:
- [ ] Error span includes full error object
- [ ] Parent span marks failure
- [ ] FlowOrchestrator logs structured failure
- [ ] No silent drops

---

## 4. Cross-System Validation
For MCP stages:
- [ ] Ruflo span → MCP client span → MCP server span
- [ ] All share the same `trace_id`
- [ ] MCP server logs include correlation ID
- [ ] Round-trip latency matches Ruflo span latency

---

## 5. Performance Thresholds
- [ ] No stage > 5s
- [ ] No MCP call > 2s
- [ ] No retry exceeds 3 attempts
- [ ] No circuit breaker opens

---

## 6. Trace Inspector Commands
Query your traces:

### List recent traces
```bash
curl http://localhost:6831/traces?limit=10
```

### Fetch full trace by ID
```bash
curl http://localhost:6831/traces/{trace_id}
```

### Filter by correlation ID
```bash
curl http://localhost:6831/traces?correlation_id={correlation_id}
```

### Validate trace structure
```bash
npm run validate:trace -- --trace-id {trace_id}
```