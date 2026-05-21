/**
 * index.js — LLM subsystem entry point
 * @version 1.1.0
 * @date 2026-05-17
 *
 * Composes all subsystems into a single ask() function.
 * Clients and config are constructed once at module load from process.env.
 *
 * Usage:
 *   import { ask } from './src/llm/index.js';
 *
 *   const result = await ask({
 *     user_id:    'user-123',
 *     intent:     'research',
 *     input_text: 'What did Sorensen build at Willow Run?',
 *   });
 *   // result: { answer, tokens_prompt, tokens_completion, strategy, cache_hit }
 *
 * Optional: pass `loadContextChunks` to override the Qdrant loader
 * (useful in tests or when context is pre-loaded in memory).
 */

import { buildConfig }          from './config.js';
import { run }                  from './controller.js';
import { modelClient as createUnifiedClient } from '../../../../../apps/cic-pms/src/unifiedModelClient.js';
import { createEmbeddingClient} from '../clients/embeddingClient.js';
import { createContextStore }   from '../context/contextStore.js';

// ---------------------------------------------------------------------------
// Module-level singletons — constructed once, validated at import time
// ---------------------------------------------------------------------------

const config          = buildConfig();
const embedding_client = createEmbeddingClient();
const contextStore    = createContextStore();

/**
 * Adapter to satisfy the legacy complete({ model, prompt, max_tokens }) contract
 * using the new .run(payload) unified interface with fallback support.
 */
const model_client = {
  async complete({ model, prompt, max_tokens, correlationId }) {
    // Determine the primary model to try first
    const primaryModel = model || config.model || "gemini";
    
    // We use the unified client which already has the fallback chain defined.
    // However, the unified client's runWithFallback starts with the MODEL_CHAIN.
    // To respect the 'model' parameter, we can wrap it.
    
    // For now, we'll just use the unified modelClient factory which handles the fallback chain.
    // We'll use the 'gemini' case as the entry point because it's the primary.
    const client = createUnifiedClient("gemini");
    const res = await client.run({ model: primaryModel, prompt, max_tokens }, { correlationId });
    
    return {
      text: res.output,
      tokens_prompt: res.usage?.prompt_tokens || 0,
      tokens_completion: res.usage?.completion_tokens || 0
    };
  }
};

/**
 * @typedef {Object} AskParams
 * @property {string}    user_id
 * @property {string}    intent
 * @property {string}    input_text
 * @property {string}    [correlation_id]
 * @property {Function}  [loadContextChunks]  — override default Qdrant loader
 */

/**
 * @typedef {Object} AskResult
 * @property {string}  answer
 * @property {number}  tokens_prompt
 * @property {number}  tokens_completion
 * @property {"cached"|"full"|"summary"} strategy
 * @property {boolean} cache_hit
 */

/**
 * Submit a query through the full BOB token + context synergy pipeline.
 *
 * @param {AskParams} params
 * @returns {Promise<AskResult>}
 */
export async function ask({ user_id, intent, input_text, correlation_id, loadContextChunks }) {
  return run({
    user_id,
    intent,
    input_text,
    correlation_id,
    model_client,
    embedding_client,
    config,
    loadContextChunks: loadContextChunks ?? contextStore.loadContextChunks.bind(contextStore),
  });
}

/**
 * Store a context chunk so it is available for future ask() calls.
 * Embeds the text and writes to Qdrant.
 *
 * @param {{ user_id: string, intent: string, text: string }} chunk
 */
export async function ingestChunk({ user_id, intent, text }) {
  const vector = await embedding_client.embed(text);
  await contextStore.storeChunk({ user_id, intent, text, vector });
}

// Re-export subsystem factories for callers that need custom instances
export { buildConfig, createEmbeddingClient, createContextStore, run };

// ---------------------------------------------------------------------------
// createBOB — Phase 18 BOB spec compatibility alias
// Returns a bound async function matching the BOB pipeline contract.
// Callers: const BOB = createBOB(config); await BOB({ user_id, intent, input_text, ... });
// ---------------------------------------------------------------------------

/**
 * Factory-style BOB entry point (Phase 18 BOB spec §2).
 * Creates isolated model/embedding/context instances from opts.
 * Production: call once at startup; reuse the returned function.
 *
 * @param {Partial<import('./config.js').ControllerConfig> & {
 *   modelClientOpts?: object,
 *   embeddingClientOpts?: object,
 *   contextStoreOpts?: object,
 * }} [opts]
 * @returns {Function} async BOB(params: AskParams) → AskResult
 */
export function createBOB(opts = {}) {
  const cfg   = buildConfig();
  const mc    = createModelClient(opts.modelClientOpts);
  const ec    = createEmbeddingClient(opts.embeddingClientOpts);
  const store = createContextStore(opts.contextStoreOpts);

  return async function BOB({ user_id, intent, input_text, loadContextChunks }) {
    return run({
      user_id,
      intent,
      input_text,
      model_client:      mc,
      embedding_client:  ec,
      config:            cfg,
      loadContextChunks: loadContextChunks ?? store.loadContextChunks.bind(store),
    });
  };
}
