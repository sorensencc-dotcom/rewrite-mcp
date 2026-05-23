# Master Instructions Manual v1.2
**Date:** 2026-05-20
**Mandate:** Antigravity 2.0 Resilience Standard

## 1. Foundational Mandates
All agentic development in this workspace is governed by **ANTIGRAVITY.md**. This file contains the ultimate operational instructions and takes precedence over all other documentation.

## 2. Model Standard
The default intelligence engine for all Rewrite Labs agents is **Gemini 3.5 Flash**. 

## 3. Resilience & Hardening (Phase 26)
Every model call must be wrapped in the **Flash-Grade Fallback Engine**. 

### 3.1 Retry & Fallback Chain
1. **Gemini 3.5 Flash** (Primary): 3 retries with exponential backoff + jitter.
2. **Claude 3 Sonnet** (Secondary): 2 retries.
3. **Local Llama** (Tertiary): 1 retry.
4. **Safe-Mode**: Return deterministic agent-specific JSON template.

### 3.2 Normalization
Always use `normalizeModelOutput()` to ensure results are valid objects before domain-specific processing.

## 4. Parallel Orchestration
The Orchestrator executes agent steps in parallel using async `Promise.all` patterns. Developers must ensure that agent tasks are independent or use the shared Blackboard pattern for communication.

## 5. Checkpointing
The system automatically checkpoints agent outputs to the `checkpoints/` directory. Use these for debugging parallel traces and resuming failed pipelines.
