# Gemini Integration

## Overview

Gemini is the core reasoning and extraction engine for the CIC pipeline. It is integrated as a first-class citizen used by both the Sidecar Enrichment Engine and the Daily Research Agents.

## Gemini Client

Located in `src/gemini/client.js`, the client provides:
- **Reasoning**: Advanced logic for agents via the `reason()` method.
- **Content Generation**: Deterministic text generation for summaries, NER, and topics.
- **DB-Backed Caching**: Every unique prompt/model pair is cached in the `gemini_cache` table to ensure 100% determinism and minimize API costs.

## Determinism & Hashing

To ensure the pipeline is repeatable:
1.  **Prompt Hashing**: A SHA-256 hash is generated for every prompt.
2.  **Cache Lookup**: Before calling the API, the system checks `gemini_cache` for an existing response.
3.  **Persistence**: API responses are saved immediately to the DB.

## Token Management

(Future) The `gemini_cache` table tracks `tokens_in` and `tokens_out` for operator-level cost auditing.

## Configuration

Gemini requires a `GEMINI_API_KEY` environment variable. If missing, the system falls back to mock responses for testing and local development.
