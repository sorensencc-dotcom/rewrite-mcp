/**
 * run-pipeline.js
 * @version 5.0.0
 * @date 2026-05-31
 *
 * CIC Pipeline Orchestrator — Multi-Mode Entry Point
 *
 * Supports two pipeline modes:
 *
 * 1. DEFAULT (ingestion): Phase 18 entrypoint
 *    - Accepts chunk input (text + metadata)
 *    - Calls ingestChunk() to embed + store in Qdrant cic_context
 *    - Calls ask() to generate context-backed analysis
 *    - Returns structured result
 *
 * 2. SCORING: Phase 5 scoring pipeline
 *    - Accepts HTML/text content
 *    - Runs multi-axis scoring (heuristic, semantic, structural, a11y)
 *    - Returns deterministic score (0-1) + issues + repair suggestions
 *
 * Usage (programmatic):
 *   import { runPipeline } from './src/pipeline/run-pipeline.js';
 *   const result = await runPipeline({ mode: 'score', content: '<html>...' });
 *   const result = await runPipeline({ user_id, intent, text });
 *
 * Usage (CLI):
 *   # Scoring mode
 *   node src/pipeline/run-pipeline.js --mode=score --content="<html>..." [--user_id=<id>]
 *
 *   # Ingestion mode (default)
 *   node src/pipeline/run-pipeline.js --user_id=cic --intent=research \
 *     --text="Sorensen supervised construction at Willow Run..." --source=archive
 *
 * Required env: ANTHROPIC_API_KEY, OPENAI_API_KEY, QDRANT_URL
 */

import 'dotenv/config';
import { ask, ingestChunk } from '../llm/index.js';
import { runScoringPipeline } from './score-pipeline.js';
import { log }              from '../logging/logger.js';
import crypto               from 'node:crypto';

const MODULE = 'run-pipeline';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PipelineInput
 * @property {string} [mode]          — 'score' or 'ingest' (default: 'ingest')
 * @property {string} user_id         — identifies the operator/session
 * @property {string} [intent]        — semantic category (ingestion only)
 * @property {string} [text]          — raw chunk content (ingestion only)
 * @property {string} [content]       — HTML/text content (scoring only)
 * @property {string} [source]        — optional source label
 */

/**
 * @typedef {Object} PipelineResult
 * @property {string}  correlation_id
 * @property {string}  user_id
 * @property {number}  duration_ms
 * @property {Object}  [answer]       — Ingestion result
 * @property {number}  [score]        — Scoring result (0-1)
 * @property {string}  [grade]        — Letter grade (A-F)
 * @property {Array<Object>} [issues] — Issues found during scoring
 * @property {Array<Object>} [suggestions] — Repair suggestions
 */

/**
 * Run pipeline in specified mode (score or ingest).
 *
 * @param {PipelineInput & { correlation_id?: string }} input
 * @returns {Promise<PipelineResult>}
 */
export async function runPipeline({
  mode = 'ingest',
  user_id,
  intent,
  text,
  content,
  source = 'manual',
  correlation_id = crypto.randomUUID(),
}) {
  // Route to appropriate pipeline
  if (mode === 'score') {
    return runScoringPipeline({ content, user_id, source, correlation_id });
  }

  // Default: ingestion pipeline
  return _runIngestionPipeline({ user_id, intent, text, source, correlation_id });
}

/**
 * Run a single ingestion + analysis cycle.
 *
 * @private
 */
async function _runIngestionPipeline({ user_id, intent, text, source, correlation_id }) {
  const t0 = Date.now();

  _assertIngestionInput({ user_id, intent, text });

  log.info('ingestion_pipeline_start', { correlation_id, user_id, intent, source, text_length: text.length });

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
  log.info('ingestion_pipeline_complete', { correlation_id, user_id, intent, source, duration_ms });

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

  const { mode = 'ingest', user_id, intent, text, content, source } = args;

  // Validate based on mode
  if (mode === 'score') {
    if (!content) {
      console.error(`Usage: node src/pipeline/run-pipeline.js --mode=score --content="<html>" [--user_id=<id>]`);
      process.exit(1);
    }
  } else {
    // ingestion mode (default)
    if (!user_id || !intent || !text) {
      console.error(`Usage: node src/pipeline/run-pipeline.js --user_id=<id> --intent=<intent> --text="<text>" [--source=<src>]`);
      console.error(`  or  node src/pipeline/run-pipeline.js --mode=score --content="<html>" [--user_id=<id>]`);
      process.exit(1);
    }
  }

  runPipeline({ mode, user_id, intent, text, content, source })
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

function _assertIngestionInput({ user_id, intent, text }) {
  const missing = [];
  if (!user_id || typeof user_id !== 'string') missing.push('user_id');
  if (!intent  || typeof intent  !== 'string') missing.push('intent');
  if (!text    || typeof text    !== 'string') missing.push('text');
  if (missing.length) throw new Error(`[${MODULE}] missing required fields: ${missing.join(', ')}`);
}
