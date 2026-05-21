/**
 * controller.js
 * @version 1.1.0
 * @date 2026-05-17
 *
 * Real-time token and context synergy controller.
 * Implements the BOB pipeline verbatim:
 *   1.  Embed input
 *   2.  Cache lookup
 *   3.  Load candidate context
 *   4.  Embed context batch
 *   5.  Deduplicate / reduce context (synergyAnalyzer)
 *   6.  Compile prompt (promptCompiler)
 *   7.  Token budget enforcement
 *   8.  Model call (tokenMeter)
 *   9.  Cache store
 *   10. Return
 *
 * INPUTS:
 *   user_id          string
 *   intent           string
 *   input_text       string
 *   model_client     Object  — exposes .complete(params)
 *   embedding_client Object  — exposes .embed(text) and .embedBatch(texts)
 *   config           ControllerConfig
 *
 * OUTPUTS:
 *   answer           string
 *   tokens_prompt    number
 *   tokens_completion number
 *   strategy         "cached" | "full" | "summary"
 *   cache_hit        boolean
 */

import * as contextCache    from './contextCache.js';
import * as synergyAnalyzer from './synergyAnalyzer.js';
import * as promptCompiler  from './promptCompiler.js';
import * as tokenMeter      from './tokenMeter.js';

const MODULE = 'controller';

/**
 * @typedef {Object} ControllerConfig
 * @property {string} model
 * @property {string} systemPrompt
 * @property {{ similarityThreshold: number }}          cache
 * @property {{ maxTokens: number }}                    context
 * @property {{ maxTokens: number }}                    prompt
 * @property {{ maxTokens: number, minTokens: number }} completion
 * @property {{ hardTokenLimit: number }}               limits
 */

/**
 * @typedef {Object} ControllerInput
 * @property {string}           user_id
 * @property {string}           intent
 * @property {string}           input_text
 * @property {Object}           model_client
 * @property {Object}           embedding_client
 * @property {ControllerConfig} config
 * @property {string}           [correlation_id]
 * @property {Function}         [loadContextChunks]  — async (user_id, intent) → string[]
 */

/**
 * @typedef {Object} ControllerResult
 * @property {string}  answer
 * @property {number}  tokens_prompt
 * @property {number}  tokens_completion
 * @property {"cached"|"full"|"summary"} strategy
 * @property {boolean} cache_hit
 */

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run the full BOB token + context synergy pipeline.
 *
 * @param {ControllerInput} input
 * @returns {Promise<ControllerResult>}
 */
export async function run(input) {
  const {
    user_id,
    intent,
    input_text,
    model_client,
    embedding_client,
    config,
    correlation_id,
    loadContextChunks = _defaultLoadContextChunks,
  } = input;

  _assertConfig(config);
  _assertEmbeddingClient(embedding_client);

  // -------------------------------------------------------------------------
  // STEP 1 — Embed input
  // -------------------------------------------------------------------------
  const input_embedding = await _embed(embedding_client, input_text);

  // -------------------------------------------------------------------------
  // STEP 2 — Cache lookup
  // -------------------------------------------------------------------------
  const cacheResult = contextCache.lookup(
    { user_id, intent, input_embedding },
    config.cache.similarityThreshold
  );

  // -------------------------------------------------------------------------
  // STEP 3 — Return from cache if hit
  // -------------------------------------------------------------------------
  if (cacheResult.hit) {
    return {
      answer: cacheResult.answer,
      tokens_prompt: 0,
      tokens_completion: 0,
      strategy: 'cached',
      cache_hit: true,
    };
  }

  // -------------------------------------------------------------------------
  // STEP 4 — Load candidate context chunks
  // -------------------------------------------------------------------------
  const context_chunks = await loadContextChunks(user_id, intent);

  // -------------------------------------------------------------------------
  // STEP 5 — Embed context batch
  // -------------------------------------------------------------------------
  const chunk_embeddings = context_chunks.length > 0
    ? await _embedBatch(embedding_client, context_chunks)
    : [];

  // -------------------------------------------------------------------------
  // STEP 6 — Reduce context via synergy analyzer
  // -------------------------------------------------------------------------
  const reduced = synergyAnalyzer.reduceContext({
    chunks:     context_chunks,
    embeddings: chunk_embeddings,
    max_tokens: config.context.maxTokens,
  });

  // -------------------------------------------------------------------------
  // STEP 7 — Compile prompt
  // -------------------------------------------------------------------------
  const compiled = promptCompiler.buildPrompt({
    system_prompt:    config.systemPrompt,
    user_input:       input_text,
    context_chunks:   reduced.chunks,
    max_prompt_tokens: config.prompt.maxTokens,
  });
  let { prompt } = compiled;

  // -------------------------------------------------------------------------
  // STEP 8 — Token budget enforcement
  // -------------------------------------------------------------------------
  let maxCompletionTokens = config.completion.maxTokens;
  let strategy = 'full';

  const total_tokens = compiled.estimated_tokens + config.completion.maxTokens;

  if (total_tokens > config.limits.hardTokenLimit) {
    // Attempt 1: shrink completion window
    maxCompletionTokens = Math.max(
      config.completion.minTokens,
      config.limits.hardTokenLimit - compiled.estimated_tokens
    );

    const stillOver = compiled.estimated_tokens + maxCompletionTokens > config.limits.hardTokenLimit;
    if (stillOver) {
      // Attempt 2: ask model for shorter output
      strategy = 'summary';
      const shortenInstruction =
        '\n[IMPORTANT: Keep your answer under 100 words. Be concise.]';

      const recompiled = promptCompiler.buildPrompt({
        system_prompt:     config.systemPrompt + shortenInstruction,
        user_input:        input_text,
        context_chunks:    reduced.chunks,
        max_prompt_tokens: config.prompt.maxTokens,
      });
      prompt = recompiled.prompt;
      maxCompletionTokens = Math.max(
        config.completion.minTokens,
        config.limits.hardTokenLimit - recompiled.estimated_tokens
      );
    }
  }

  // -------------------------------------------------------------------------
  // STEP 9 — Call model
  // -------------------------------------------------------------------------
  const modelResult = await tokenMeter.callModel({
    model:       config.model,
    prompt,
    max_tokens:  maxCompletionTokens,
    modelClient: model_client,
    correlation_id,
  });

  const { completion, tokens_prompt, tokens_completion } = modelResult;

  // -------------------------------------------------------------------------
  // STEP 10 — Store in cache
  // -------------------------------------------------------------------------
  contextCache.store({
    user_id,
    intent,
    input_embedding,
    answer: completion,
    tokens_prompt,
    tokens_completion,
  });

  // -------------------------------------------------------------------------
  // STEP 11 — Return
  // -------------------------------------------------------------------------
  return {
    answer: completion,
    tokens_prompt,
    tokens_completion,
    strategy,
    cache_hit: false,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function _embed(client, text) {
  let result;
  try {
    result = await client.embed(text);
  } catch (err) {
    err.message = `[${MODULE}] embedding_client.embed failed: ${err.message}`;
    throw err;
  }
  const vec = _normaliseEmbedding(result, 'embed');
  return vec;
}

async function _embedBatch(client, texts) {
  let result;
  try {
    result = await client.embedBatch(texts);
  } catch (err) {
    err.message = `[${MODULE}] embedding_client.embedBatch failed: ${err.message}`;
    throw err;
  }
  // Normalise: accept array-of-arrays or an object with .embeddings
  if (Array.isArray(result) && Array.isArray(result[0])) return result;
  if (result?.embeddings && Array.isArray(result.embeddings)) return result.embeddings;
  throw new Error(`[${MODULE}] embedBatch returned unexpected shape`);
}

function _normaliseEmbedding(raw, method) {
  if (Array.isArray(raw) && typeof raw[0] === 'number') return raw;
  if (Array.isArray(raw?.embedding)) return raw.embedding;
  if (Array.isArray(raw?.data?.[0]?.embedding)) return raw.data[0].embedding; // OpenAI shape
  throw new Error(`[${MODULE}] embedding_client.${method} returned unrecognised shape`);
}

function _assertConfig(config) {
  if (!config) throw new Error(`[${MODULE}] 'config' is required`);
  const missing = [];
  if (!config.model)                                           missing.push('config.model');
  if (typeof config.systemPrompt !== 'string')                 missing.push('config.systemPrompt');
  if (!Number.isFinite(config.cache?.similarityThreshold))     missing.push('config.cache.similarityThreshold');
  if (!Number.isFinite(config.context?.maxTokens))             missing.push('config.context.maxTokens');
  if (!Number.isFinite(config.prompt?.maxTokens))              missing.push('config.prompt.maxTokens');
  if (!Number.isFinite(config.completion?.maxTokens))          missing.push('config.completion.maxTokens');
  if (!Number.isFinite(config.completion?.minTokens))          missing.push('config.completion.minTokens');
  if (!Number.isFinite(config.limits?.hardTokenLimit))         missing.push('config.limits.hardTokenLimit');
  if (missing.length) throw new Error(`[${MODULE}] missing required config fields: ${missing.join(', ')}`);
}

function _assertEmbeddingClient(client) {
  if (typeof client?.embed !== 'function') {
    throw new Error(`[${MODULE}] embedding_client must expose .embed(text)`);
  }
  if (typeof client?.embedBatch !== 'function') {
    throw new Error(`[${MODULE}] embedding_client must expose .embedBatch(texts)`);
  }
}

/** Default no-op context loader — returns empty array if caller doesn't provide one. */
async function _defaultLoadContextChunks(_user_id, _intent) {
  return [];
}
