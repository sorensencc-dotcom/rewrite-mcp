# Release Diff: v2.13.0 vs v2.12.0

## Velocity Delta
- **Total Changes**: 9 (Delta: -1)
- **New Features**: 9 (Delta: -1)
- **Fixes**: 0 (Delta: +0)

## Latest Changes (v2.13.0)
### Added

- **MAS-Aware Rerun Telemetry**: Full observability for the agent rerun lifecycle across three new event types.
    - **`emitMASRerunAttempt`** (`apps/cic-pms/src/telemetryClient.js`): Emits before each rerun execution; captures `agent`, `attempt`, `maxAttempts`, `backoffMs`, and `reason`.
    - **`emitMASRerunBackoff`** (`apps/cic-pms/src/telemetryClient.js`): Emits immediately before each backoff sleep; captures `agent`, `attempt`, and `backoffMs`.
    - **`emitMASRerunFinalState`** (`apps/cic-pms/src/telemetryClient.js`): Emits after the rerun loop concludes; captures `finalState` (`success` | `failed`), `attempts`, and `maxAttempts`.
    - **Orchestrator wiring** (`projects/cic/orchestrator/src/orchestrator.js`): All three emitters wired into the `runAgentWithMAS` rerun loop with correlation ID threading.
    - **Ingest routes** (`tools/prompt-telemetry/server.js`): Added `POST /ingest/mas_rerun_attempt`, `POST /ingest/mas_rerun_backoff`, `POST /ingest/mas_rerun_final_state` with 500-event ring buffers.
    - **Timeline + Trace** (`tools/prompt-telemetry/server.js`): `GET /telemetry/timeline` and `GET /telemetry/trace/:correlationId` now include all three rerun event types.
    - **MAS Intelligence Timeline panel** (`tools/prompt-telemetry/dashboard.html`): New dashboard panel showing rerun events with icons — ⚡ attempt, … backoff, ✓/✕ final state.
    - **MAS Rerun Waterfall panel** (`tools/prompt-telemetry/dashboard.html`): Proportional bar chart rendering each rerun event in sequence, keyed by backoff duration.

## Previous Changes (v2.12.0)
### Added
- **MAS Rerun Hardening**: Implemented configurable retries and adaptive backoff for the `rerunAgent` directive.
    - **Adaptive Backoff**: Retries now use exponential backoff (`masBackoffMs * 2^(retry-1)`).
    - **Configurable Retries**: Added `ORCH_MAS_MAX_RETRIES` (default: 2) and `ORCH_MAS_BACKOFF_MS` (default: 500ms).
- **LLM Debug Plane**: Added configurable log levels to capture raw model inputs/outputs.
    - **Debug Logging**: Added `ORCH_LOG_LEVEL` support; `debug` level captures full LLM payloads and raw responses for Gemini, Claude, and Llama.
    - **Enhanced Logger** (`apps/cic-pms/src/logger.js`): Normalized log levels (debug, info, warn, error).
- **JSON Robustness**: Improved `normalizeModelOutput` to handle non-JSON or noisy model outputs.
    - **Markdown Extraction**: Automatically extracts JSON from markdown code blocks.
    - **Boundary Detection**: Recovers JSON by finding outermost `{}` braces in conversational outputs.
    - **Robustness Tests**: Added `rewrite-mcp/tests/jsonNormalize.test.js`.
