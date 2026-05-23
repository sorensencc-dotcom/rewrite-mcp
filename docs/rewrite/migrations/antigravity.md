# Migration to Antigravity 2.0

## Overview
Based on the Google I/O 2026 announcement, Rewrite Labs is migrating from the Gemini CLI ecosystem to **Antigravity 2.0**. This migration involves transitioning to Gemini 3.5 Flash, adopting the Antigravity CLI/SDK patterns, and enabling advanced multi-agent orchestration.

## Key Changes

### 1. Infrastructure & Models
- **Model Upgrade**: Transition all LLM calls from `gemini-1.5-pro` / `gemini-1.5-flash` to `gemini-3.5-flash`.
- **SDK Adoption**: Evaluate the new Antigravity SDK for custom agent development.
- **CLI Migration**: Transition from `gemini-cli` commands to `antigravity` CLI commands.

### 2. Project Configuration
- **Manifest Update**: Add Phase 25 (Antigravity Migration) to `BOB_MANIFEST.json`.
- **Memory Transition**: Update `MEMORY.md` and documentation to reflect the new toolset.
- **Instruction Update**: Migrate `GEMINI.md` foundational instructions to `ANTIGRAVITY.md`.

### 3. Agent Orchestration
- **Multi-Agent Workflows**: Enhance the Orchestrator to support simultaneous agent execution as per Antigravity standards.
- **Subagent Workflows**: Implement custom subagent workflows and background task scheduling.

## Migration Steps

### Phase 25.1: Documentation & State
- [x] Create `ANTIGRAVITY.md` as the new foundational mandate.
- [x] Update `BOB_MANIFEST.json` with Phase 25.
- [x] Update `docs/state/rewrite-labs-state.md`.

### Phase 25.2: Model Migration
- [x] Update `projects/cic/ingestion/src/harvester/models/geminiClient.js` to default to `gemini-3.5-flash`.
- [x] Update `projects/cic/orchestrator/src/models/geminiClient.js` to default to `gemini-3.5-flash`.

### Phase 25.3: Orchestrator Enhancement
- [x] Refactor `agentExecutor.js` for parallel subagent execution.
- [x] Add support for parallel agent orchestration in `orchestrator.js`.
- [ ] Add support for Antigravity-style background task scheduling (scheduled/cron).

## Verification
- Run Golden-Path Orchestrator tests with the new model defaults.
- Validate telemetry for `gemini-3.5-flash` usage.
