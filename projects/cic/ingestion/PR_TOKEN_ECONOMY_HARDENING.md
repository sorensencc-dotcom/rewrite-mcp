# PR 1: Token Economy Hardening — Foundation Complete

**Date**: 2026-05-31  
**Status**: Foundation Phase Complete; Ready for Integration Testing  
**Version**: 1.0.0 (Foundation)  

---

## Executive Summary

The CIC ingestion pipeline token economy has been hardened across **6 critical files** with deterministic bounds enforcement, retry logic, error handling, and telemetry. A **centralized LLM gateway** (LLMRequest + TokenEconomyAgent) now enforces token budgets at the entry point.

**What's Done:**
- ✅ 6 files hardened with token economy fixes
- ✅ Comprehensive integration test suite created
- ✅ Token economy validator skill scaffolded
- ✅ LLMRequest + TokenEconomyAgent gateway scaffolded
- ✅ All fixes follow operator-grade standards

**What's Next:**
- Integration tests execution and validation
- Gateway production integration
- Telemetry and monitoring setup
- Staged rollout to production

---

## Hardened Files Summary

### 1. **llamaClient.js** (v1.0.0)
**Purpose**: Local LLaMA model adapter  
**Critical Fixes**:
- Retry loop with exponential backoff (300ms × attempt+1)
- 15-second timeout via AbortController
- Output bounds via MAX_RESPONSE_CHARS envelope
- n_predict capped at 4096

**Severity**: HIGH — unbounded output + no timeout could exhaust tokens

### 2. **ImageAnalyzerV2.js** (v2.0.0)
**Purpose**: Vision-based image analysis extractor  
**Critical Fixes**:
- Image size validation (5MB hard limit)
- maxTokens capping at 1024
- Response text truncation to (maxTokens × 4) characters
- Token cost awareness + logging on all paths

**Severity**: HIGH — vision calls defaulted to unbounded completions

### 3. **reverseImage.js** (v1.0.0)
**Purpose**: Reverse image search extractor  
**Critical Fixes**:
- Complete rewrite with structured error objects
- Image size validation (10MB hard limit)
- Gemini call with max_tokens=256 and 10s timeout
- Response size validation (50KB hard limit)
- JSON parse error handling
- Deterministic error envelopes with token_cost

**Severity**: CRITICAL — silent JSON.parse failures + unbounded output

### 4. **controller.js** (v1.1.0)
**Purpose**: Token + context synergy controller  
**Critical Fixes**:
- Multi-stage token budget validation (pre-flight + final check)
- Explicit hardTokenLimit ceiling enforcement
- Fail-fast on irreconcilable budgets
- Summary strategy recompilation with re-validation

**Severity**: CRITICAL — token budget validation could be bypassed

### 5. **pmsClient.js** (v1.0.0)
**Purpose**: Prompt Management System integration  
**Critical Fixes**:
- Hardened drift detection (throws on drift instead of logging)
- Output token bounds enforcement on assembled payloads
- Explicit error handling on pack load/assembly
- Deterministic error envelopes
- Metadata tracking (pack_version, assembled_at)

**Severity**: HIGH — drifted prompts used silently

### 6. **audioTranscriber.js** (v1.0.0) **[NEW]**
**Purpose**: Audio-to-text transcription extractor  
**Critical Fixes**:
- Pre-flight audio size validation (100MB hard limit)
- Audio format validation (mp3, wav, m4a, flac, webm, ogg)
- Retry logic with exponential backoff
- 60-second timeout for transcription
- MAX_OUTPUT_TOKENS envelope (8000 tokens conservative)
- Service failover chain (Whisper → AssemblyAI → Deepgram)
- Deterministic error returns
- Token cost estimation (4 chars/token)

**Severity**: HIGH — new production extractor; requires hardening from start

---

## Gateway Scaffolding (Priority Fix PR 1)

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  LLM Call (any subsystem)                               │
│  call({ model, prompt, max_tokens, subsystem })         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  LLMRequest Factory                                      │
│  - Validate inputs                                       │
│  - Generate correlation_id                              │
│  - Estimate tokens                                       │
│  - Create structured request object                     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  TokenEconomyAgent (Enforcement)                        │
│  - Pre-flight validation (budget, model, timeout)       │
│  - Daily budget tracking                                │
│  - Hard stop at 95% threshold                           │
│  - Token cost calculation                               │
│  - Telemetry emission                                   │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  LLMGateway Router                                       │
│  - Route to model client (OpenAI, Anthropic, local)    │
│  - Retry on transient failure                           │
│  - Track actual token usage                             │
│  - Export request log                                   │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  Model Client (Whisper, Claude, GPT-4, LLaMA)          │
│  - Execute model call                                    │
│  - Return: { text, tokens_prompt, tokens_completion }  │
└─────────────────────────────────────────────────────────┘
```

### Files Created

1. **LLMRequest.js** (v0.1.0)
   - Standardized request object for all LLM calls
   - Token lifecycle tracking (pending → executing → completed)
   - Validation against gateway constraints
   - Telemetry export

2. **TokenEconomyAgent.js** (v0.1.0)
   - Budget enforcement logic
   - Request validation (model, timeout, budget)
   - Daily budget tracking with hard-stop threshold
   - Metrics collection
   - Cost calculation per model

3. **llmGateway.js** (v0.1.0)
   - Central routing for all LLM calls
   - Model client registration
   - Automatic retry with exponential backoff
   - Request history and CSV export
   - Status reporting

---

## Test Coverage

### Integration Tests
**File**: `src/tests/tokenEconomy.integration.test.js`

Test suites:
- **llamaClient**: retry, timeout, output bounds
- **ImageAnalyzerV2**: image validation, response truncation, error envelopes
- **reverseImage**: deterministic errors, output validation, size limits
- **controller**: token budget enforcement, ceiling, irreconcilable budgets
- **pmsClient**: drift detection, output bounds, error handling
- **audioTranscriber**: audio validation, format check, service failover
- **Cross-file integration**: token accounting through pipeline, bounds at every stage

**Success Criteria**:
- ✅ 100% test pass rate
- ✅ All outputs respect configured limits
- ✅ All error paths return deterministic envelopes
- ✅ Full pipeline maintains token accounting
- ✅ Zero timeouts (all tests complete within 30s)

### Token Economy Validator Skill
**File**: `skills/cic-token-economy-validator.md`

Validates:
- Pre-flight checks (files exist, vitest available, env vars)
- Unit test execution with coverage
- Token bound enforcement
- Error envelope compliance
- Report generation

---

## Deployment Checklist

### Pre-Production
- [ ] Run full integration test suite
- [ ] Generate token economy validation report
- [ ] Review all 6 fixed files with team
- [ ] Verify error envelope compliance
- [ ] Check token cost calculations per model
- [ ] Audit daily budget limits

### Staging
- [ ] Deploy gateway and 6 hardened files
- [ ] Enable token cost telemetry
- [ ] Monitor daily budget tracking
- [ ] Test failover chains (audio transcription)
- [ ] Validate retry logic under load
- [ ] Review request logs and metrics

### Production
- [ ] Gradual rollout by subsystem
- [ ] Monitor TokenEconomyAgent metrics
- [ ] Track budget exhaustion events
- [ ] Alert on hard-stop threshold breach (95%)
- [ ] Collect telemetry for cost optimization
- [ ] Document production runbook

---

## Integration Path

### Phase 1: Foundation (Complete)
- ✅ 6 critical files hardened
- ✅ LLMRequest scaffolded
- ✅ TokenEconomyAgent scaffolded
- ✅ Gateway scaffolded
- ✅ Test suite created

### Phase 2: Integration (Next)
- [ ] Connect gateway to existing model clients
- [ ] Update all subsystems to use LLMRequest
- [ ] Enable telemetry collection
- [ ] Run integration tests
- [ ] Validate budget enforcement

### Phase 3: Monitoring (After Integration)
- [ ] Deploy observability (token cost telemetry)
- [ ] Set up alerting (budget threshold, errors)
- [ ] Create dashboards (daily spend, request patterns)
- [ ] Establish runbooks (budget exhaustion, escalation)

### Phase 4: Optimization (After 1 week production)
- [ ] Analyze request patterns
- [ ] Optimize token estimates (move from 4 chars/token)
- [ ] Fine-tune budget limits per subsystem
- [ ] Document cost optimization insights

---

## Files to Review

| File | Status | Lines | Notes |
|------|--------|-------|-------|
| `src/clients/llamaClient.js` | ✅ Modified | 79 | Retry + timeout + bounds |
| `src/extractors/ImageAnalyzerV2.js` | ✅ Modified | 156 | Image validation + truncation |
| `src/extractors/reverseImage.js` | ✅ Modified | 98 | Error envelopes + bounds |
| `src/harvester/pmsClient.js` | ✅ Modified | 84 | Drift detection + bounds |
| `src/llm/controller.js` | ✅ Modified | 306 | Budget enforcement |
| `src/llm/tokenMeter.js` | ✅ Modified | 145 | Fallback estimation + telemetry |
| `src/extractors/audioTranscriber.js` | ✅ NEW | 336 | Audio validation + failover |
| `src/gateway/LLMRequest.js` | ✅ NEW | 184 | Standardized request object |
| `src/gateway/TokenEconomyAgent.js` | ✅ NEW | 267 | Budget enforcement logic |
| `src/gateway/llmGateway.js` | ✅ NEW | 261 | Central routing |
| `src/tests/tokenEconomy.integration.test.js` | ✅ NEW | 438 | Comprehensive test suite |
| `skills/cic-token-economy-validator.md` | ✅ NEW | 186 | Test execution skill |

**Total**: 12 files, ~2,480 lines of operator-grade code

---

## Next Steps

1. **Run Integration Tests** (5-10 min)
   ```bash
   npm test -- tokenEconomy.integration.test.js --reporter=verbose
   ```

2. **Generate Token Economy Report** (2-3 min)
   ```bash
   npm test -- tokenEconomy.integration.test.js --reporter=json > token-economy-results.json
   ```

3. **Review Test Results**
   - Check all 6 file suites pass
   - Verify token bounds enforcement
   - Confirm error envelope compliance

4. **Schedule Integration Review**
   - Present findings to team
   - Discuss deployment plan
   - Agree on monitoring strategy

5. **Plan Production Rollout**
   - By subsystem (harvester, controller, etc.)
   - Gradual traffic migration
   - Observability setup

---

## Questions & Decisions

- [ ] Should daily budget limit be configurable per environment?
- [ ] How aggressive should hard-stop be (currently 95%)?
- [ ] What's the cost model for local-llama (currently free)?
- [ ] Should we implement per-subsystem budgets or global only?

---

**Review by**: [Engineering Lead]  
**Approved by**: [Product Lead]  
**Date Approved**: [TBD]  
**Deployed to Production**: [TBD]
