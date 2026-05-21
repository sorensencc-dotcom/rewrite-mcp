/**
 * run-pipeline.js
 * @version 1.0.0
 * @date 2026-05-17
 *
 * CIC Ingestion Pipeline — Phase 18 entrypoint.
 * Wires the BOB LLM Synergy Controller into a runnable pipeline that:
 *   1. Accepts chunk input (text + metadata)
 *   2. Calls ingestChunk() to embed + store in Qdrant cic_context
 *   3. Calls ask() to generate context-backed analysis
 *   4. Returns structured result
 *
 * Usage (programmatic):
 *   import { runPipeline } from './src/pipeline/run-pipeline.js';
 *   const result = await runPipeline({ user_id, intent, text, source });
 *
 * Usage (CLI):
 *   node src/pipeline/run-pipeline.js --user_id=cic --intent=research \
 *     --text="Sorensen supervised construction at Willow Run..." --source=archive
 *
 * Required env: ANTHROPIC_API_KEY, OPENAI_API_KEY, QDRANT_URL
 */

import 'dotenv/config';
import { ask, ingestChunk } from '../llm/index.js';
import { log }              from '../logging/logger.js';
import crypto               from 'node:crypto';

const MODULE = 'run-pipeline';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PipelineInput
 * @property {string} user_id     — identifies the operator/session
 * @property {string} intent      — semantic category (e.g. "research", "archive", "events")
 * @property {string} text        — raw chunk content to ingest and analyse
 * @property {string} [source]    — optional source label (e.g. "drive", "archive", "manual")
 */

/**
 * @typedef {Object} PipelineResult
 * @property {string}  correlation_id
 * @property {string}  user_id
 * @property {string}  intent
 * @property {string}  source
 * @property {string}  answer
 * @property {number}  tokens_prompt
 * @property {number}  tokens_completion
 * @property {"cached"|"full"|"summary"} strategy
 * @property {boolean} cache_hit
 * @property {number}  duration_ms
 */

/**
 * Run a single ingestion + analysis cycle.
 *
 * @param {PipelineInput & { correlation_id?: string }} input
 * @returns {Promise<PipelineResult>}
 */
export async function runPipeline({ user_id, intent, text, source = 'manual', correlation_id = crypto.randomUUID() }) {
  const t0 = Date.now();

  _assertInput({ user_id, intent, text });

  log.info('pipeline_start', { correlation_id, user_id, intent, source, text_length: text.length });

  // ── STEP A: Store chunk in Qdrant cic_context ──────────────────────────
  try {
    await ingestChunk({ user_id, intent, text });
    log.qdrantUpsert({ user_id, intent, vector_size: 1536, collection: 'cic_context', correlation_id });
  } catch (err) {
    log.error('ingest_chunk_failed', {
      correlation_id, user_id, intent, source,
      err: err.message, context: err.context,
    });
    throw err;
  }

  // ── STEP B: Generate context-backed analysis via BOB ───────────────────
  let llmResult;
  try {
    llmResult = await ask({ user_id, intent, input_text: text, correlation_id });
    log.llmCall({
      correlation_id,
      user_id,
      intent,
      tokens_prompt:     llmResult.tokens_prompt,
      tokens_completion: llmResult.tokens_completion,
      strategy:          llmResult.strategy,
      cache_hit:         llmResult.cache_hit,
    });
  } catch (err) {
    log.error('llm_call_failed', {
      correlation_id, user_id, intent, source, err: err.message,
    });
    throw err;
  }

  const duration_ms = Date.now() - t0;
  log.info('pipeline_complete', { correlation_id, user_id, intent, source, duration_ms });

  return {
    correlation_id,
    user_id,
    intent,
    source,
    answer:            llmResult.answer,
    tokens_prompt:     llmResult.tokens_prompt,
    tokens_completion: llmResult.tokens_completion,
    strategy:          llmResult.strategy,
    cache_hit:         llmResult.cache_hit,
    duration_ms,
  };
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Object.fromEntries(
    process.argv.slice(2)
      .filter(a => a.startsWith('--'))
      .map(a => {
        const [k, ...v] = a.slice(2).split('=');
        return [k, v.join('=')];
      })
  );

  const { user_id, intent, text, source } = args;
  if (!user_id || !intent || !text) {
    console.error(`Usage: node src/pipeline/run-pipeline.js --user_id=<id> --intent=<intent> --text="<text>" [--source=<src>]`);
    process.exit(1);
  }

  runPipeline({ user_id, intent, text, source })
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error(JSON.stringify({ level: 'error', msg: 'pipeline_fatal', err: err.message }));
      process.exit(1);
    });
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function _assertInput({ user_id, intent, text }) {
  const missing = [];
  if (!user_id || typeof user_id !== 'string') missing.push('user_id');
  if (!intent  || typeof intent  !== 'string') missing.push('intent');
  if (!text    || typeof text    !== 'string') missing.push('text');
  if (missing.length) throw new Error(`[${MODULE}] missing required fields: ${missing.join(', ')}`);
}
