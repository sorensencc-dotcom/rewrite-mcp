---
name: cic-token-economy-validator
description: Validate CIC token economy hardening across 6 critical files with comprehensive integration testing and reporting
metadata:
  type: skill
  version: 1.0.0
  domain: cic-ingestion
  category: quality-assurance
---

# CIC Token Economy Validator

Comprehensive test suite for validating token economy hardening across the CIC ingestion pipeline. Runs integration tests, measures token bounds enforcement, verifies error handling, and generates a detailed validation report.

## What It Does

1. **Pre-flight Checks**
   - Verify all 6 hardened files exist and are readable
   - Check that required test framework (vitest) is available
   - Validate environment variables (OPENAI_API_KEY, ASSEMBLYAI_API_KEY, etc.)

2. **Unit Test Execution**
   - Run `tokenEconomy.integration.test.js` with full coverage
   - Capture test output and metrics
   - Flag any test failures with line numbers

3. **Token Bound Validation**
   - Verify output truncation at each stage
   - Confirm max_tokens ceiling enforcement
   - Check retry logic + exponential backoff

4. **Error Envelope Verification**
   - Validate deterministic error returns (no silent failures)
   - Check token_cost field presence on all error paths
   - Verify error structure consistency

5. **Report Generation**
   - Summary of all 6 fixed files
   - Test pass/fail breakdown
   - Token bound enforcement status
   - Error envelope compliance
   - Recommendations for production deployment

## How to Use

### Run Full Validation
```
npm test -- tokenEconomy.integration.test.js --reporter=verbose
```

### Run Specific Test Suite
```
npm test -- tokenEconomy.integration.test.js -t "llamaClient"
```

### Generate Report
```
npm test -- tokenEconomy.integration.test.js --reporter=json > token-economy-results.json
```

## Files Validated

| File | Purpose | Critical Fix |
|------|---------|--------------|
| `llamaClient.js` | Local LLaMA adapter | Retry + timeout + output bounds |
| `ImageAnalyzerV2.js` | Vision image analysis | Image size validation + response truncation |
| `reverseImage.js` | Reverse image search | Error envelopes + output validation |
| `controller.js` | Token + context synergy | Multi-stage budget enforcement |
| `pmsClient.js` | Prompt Management System | Drift detection + output bounds |
| `audioTranscriber.js` | Audio transcription | Audio validation + service failover |

## Test Coverage

- ✅ Pre-flight validation (size, format, structure)
- ✅ Output bounds enforcement (truncation, max_tokens)
- ✅ Retry logic with exponential backoff
- ✅ Timeout protection
- ✅ Token cost tracking
- ✅ Deterministic error envelopes
- ✅ No silent failures
- ✅ Service failover chains
- ✅ Cross-file integration

## Success Criteria

All tests must pass to proceed with deployment:
1. **Unit tests**: 100% pass rate (zero failures)
2. **Token bounds**: All outputs respect configured limits
3. **Error handling**: All error paths return deterministic envelopes
4. **Integration**: Full pipeline maintains token accounting
5. **No timeouts**: All tests complete within 30s each
6. **Coverage**: ≥85% code coverage on fixed files

## Troubleshooting

### Test Timeout
- Check that mocked external APIs are returning quickly
- Verify no actual network calls are made (use vi.mock)
- Increase timeout if needed: `timeout: 60000` in vitest config

### Mock Not Working
- Verify vi.mock is called BEFORE importing the module
- Check that mock path matches exact import statement
- Use vi.clearAllMocks() before each test

### Missing Environment Variables
- For Whisper: set `OPENAI_API_KEY`
- For AssemblyAI: set `ASSEMBLYAI_API_KEY`
- For Deepgram: set `DEEPGRAM_API_KEY`
- Tests should handle missing keys gracefully (skip or error)

### Token Estimation Mismatch
- llamaClient, ImageAnalyzerV2, and audioTranscriber use conservative 4 chars/token
- tokenMeter uses same fallback estimation
- Actual LLM token counts may vary (typically ~1.3 chars/token)

## Next Steps

After validation passes:
1. Generate token economy report
2. Review error handling compliance
3. Deploy to staging environment
4. Run production smoke tests
5. Monitor token cost telemetry
