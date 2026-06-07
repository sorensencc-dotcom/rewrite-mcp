# PHASE D EXECUTION CHECKLIST
*Operator-grade, deterministic, zero ambiguity*

## 0. Preconditions
- [ ] MCP servers running on ports **7070–7074**
- [ ] ContextServer online with real agents
- [ ] Parameter serialization fix validated
- [ ] Pre-commit governance hook active
- [ ] Artifact whitelist + exception registry loaded

---

## 1. Start-of-Day System Bring-Up
- [ ] Start all MCP servers
- [ ] Run `/health` on each server
- [ ] Verify version + capabilities
- [ ] Confirm Ruflo FlowRegistry includes `cic-main-pipeline`
- [ ] Confirm tracing backend is receiving spans

---

## 2. Execute CIC Main Pipeline
Run:
```bash
npm run cic:main
```

Validate each stage:
- [ ] Stage 1 — Code Analyzer
- [ ] Stage 2 — Call Graph Extractor
- [ ] Stage 3 — Narrative Linker
- [ ] Stage 4 — Context Synthesizer
- [ ] Stage 5 — Conditional Router
- [ ] Stage 6 — Diagnostics (receives array, not string)

---

## 3. Validate Outputs
- [ ] All stages produce structured JSON
- [ ] No stage returns malformed payloads
- [ ] No stage exceeds timeout
- [ ] No circuit breaker opens
- [ ] No retries exceed max attempts

---

## 4. Observability Validation
- [ ] Every stage emits a span
- [ ] Trace ID is consistent across all stages
- [ ] Correlation ID is present in logs
- [ ] Latency per stage recorded
- [ ] Errors (if any) include full context

---

## 5. Governance Validation
- [ ] All generated artifacts match whitelist
- [ ] No unapproved artifact types produced
- [ ] Exceptions logged with sunset dates
- [ ] Audit log updated

---

## 6. End-of-Day Closeout
- [ ] Archive run logs
- [ ] Capture trace bundle
- [ ] Update GOVERNANCE_APPROVAL_AUDIT.md
- [ ] Update NEXT_STEPS_PHASE_D.md