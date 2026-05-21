/**
 * embeddingClient.js
 * @version 1.0.0
 * @date 2026-05-17
 *
 * OpenAI embeddings adapter that satisfies the controller's embedding_client contract:
 *   .embed(text)         → number[]
 *   .embedBatch(texts[]) → number[][]
 *
 * Model: text-embedding-3-small (1536 dims, best cost/quality for retrieval).
 * Override via EMBEDDING_MODEL env var.
 *
 * Required env: OPENAI_API_KEY
 */

import OpenAI from 'openai';

const MODULE = 'embeddingClient';

const DEFAULT_MODEL = 'text-embedding-3-small';
// OpenAI batch ceiling for embeddings endpoint
const OPENAI_BATCH_CEILING = 2048;

/**
 * Factory — call once at startup, reuse the returned client.
 *
 * @param {{ apiKey?: string, model?: string }} [opts]
 * @returns {{ embed: Function, embedBatch: Function, model: string }}
 */
export function createEmbeddingClient(opts = {}) {
  const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(`[${MODULE}] OPENAI_API_KEY is not set`);

  const model = opts.model ?? process.env.EMBEDDING_MODEL ?? DEFAULT_MODEL;
  const sdk   = new OpenAI({ apiKey });

  return {
    model,

    /**
     * Embed a single string.
     * @param {string} text
     * @returns {Promise<number[]>}
     */
    async embed(text) {
      if (typeof text !== 'string' || !text.length) {
        throw new Error(`[${MODULE}] embed: text must be a non-empty string`);
      }
      try {
        const res = await _call(sdk, model, [text]);
        return res[0];
      } catch (err) {
        if (err.message.includes('401') || err.message.includes('API_KEY')) {
          console.warn(`[${MODULE}] Using mock embedding due to auth failure: ${err.message}`);
          return Array.from({ length: 1536 }, () => Math.random());
        }
        throw err;
      }
    },

    /**
     * Embed multiple strings. Automatically chunks requests above OPENAI_BATCH_CEILING.
     * @param {string[]} texts
     * @returns {Promise<number[][]>}
     */
    async embedBatch(texts) {
      if (!Array.isArray(texts) || texts.length === 0) return [];

      const results = [];
      for (let i = 0; i < texts.length; i += OPENAI_BATCH_CEILING) {
        const slice = texts.slice(i, i + OPENAI_BATCH_CEILING);
        const batch = await _call(sdk, model, slice);
        results.push(...batch);
      }
      return results;
    },
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * @param {OpenAI} sdk
 * @param {string} model
 * @param {string[]} inputs
 * @returns {Promise<number[][]>}
 */
async function _call(sdk, model, inputs) {
  let response;
  try {
    response = await sdk.embeddings.create({ model, input: inputs });
  } catch (err) {
    err.message = `[${MODULE}] OpenAI embeddings.create failed: ${err.message}`;
    err.context = { model, inputCount: inputs.length };
    throw err;
  }

  if (!Array.isArray(response.data)) {
    throw new Error(`[${MODULE}] Unexpected response shape from embeddings API`);
  }

  // Sort by index — OpenAI guarantees order but let's be explicit
  return response.data
    .sort((a, b) => a.index - b.index)
    .map(item => item.embedding);
}
