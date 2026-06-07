/**
 * synergyAnalyzer.js
 * @version 1.1.0
 * @date 2026-05-17
 *
 * Reduces a set of context chunks by:
 *   1. Deduplicating near-duplicate chunks using cosine similarity.
 *   2. Packing surviving chunks into a token budget (max_tokens).
 *
 * v1.1.0 changes:
 *   - cosineSimilarity imported from utils.js instead of contextCache.js (D6)
 *   - estimateTokens imported from utils.js instead of promptCompiler.js (D5)
 */

import { cosineSimilarity } from './utils.js';
import { estimateTokens }   from './utils.js';

const MODULE = 'synergyAnalyzer';

const DEFAULT_DEDUP_THRESHOLD = 0.88;

/**
 * @typedef {Object} ReduceContextParams
 * @property {string[]}   chunks
 * @property {number[][]} embeddings
 * @property {number}     max_tokens
 * @property {number}     [dedupThreshold]
 */

/**
 * @typedef {Object} ReduceContextResult
 * @property {string[]} chunks
 * @property {number}   original_count
 * @property {number}   deduped_count
 * @property {number}   token_capped_count
 * @property {number}   estimated_tokens
 */

/**
 * Remove near-duplicate and over-budget chunks from the candidate set.
 *
 * @param {ReduceContextParams} params
 * @returns {ReduceContextResult}
 */
export function reduceContext({ chunks, embeddings, max_tokens, dedupThreshold = DEFAULT_DEDUP_THRESHOLD }) {
  if (!Array.isArray(chunks))     throw new Error(`[${MODULE}] 'chunks' must be an array`);
  if (!Array.isArray(embeddings)) throw new Error(`[${MODULE}] 'embeddings' must be an array`);
  if (chunks.length !== embeddings.length) {
    throw new Error(
      `[${MODULE}] chunks.length (${chunks.length}) !== embeddings.length (${embeddings.length})`
    );
  }
  if (!Number.isFinite(max_tokens) || max_tokens < 1) {
    throw new Error(`[${MODULE}] 'max_tokens' must be a positive integer`);
  }
  if (!Number.isFinite(dedupThreshold) || dedupThreshold < 0 || dedupThreshold > 1) {
    throw new Error(`[${MODULE}] 'dedupThreshold' must be in [0, 1]`);
  }

  const original_count = chunks.length;
  let deduped_count = 0;
  let token_capped_count = 0;

  /** @type {Array<{ chunk: string, embedding: number[] }>} */
  const accepted = [];
  let tokensSoFar = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk     = chunks[i];
    const embedding = embeddings[i];

    if (typeof chunk !== 'string' || !chunk.length) continue;
    if (!Array.isArray(embedding) || embedding.length === 0) {
      console.warn(`[${MODULE}] chunk[${i}] has no valid embedding — skipping`);
      continue;
    }

    // --- Deduplication pass ---
    let isDuplicate = false;
    for (const acc of accepted) {
      if (acc.embedding.length !== embedding.length) continue;
      const sim = cosineSimilarity(embedding, acc.embedding);
      if (sim >= dedupThreshold) {
        isDuplicate = true;
        break;
      }
    }

    if (isDuplicate) {
      deduped_count++;
      continue;
    }

    // --- Token budget pass ---
    const chunkTokens = estimateTokens(chunk);
    if (tokensSoFar + chunkTokens > max_tokens) {
      token_capped_count++;
      continue;
    }

    accepted.push({ chunk, embedding });
    tokensSoFar += chunkTokens;
  }

  return {
    chunks: accepted.map(a => a.chunk),
    original_count,
    deduped_count,
    token_capped_count,
    estimated_tokens: tokensSoFar,
  };
}
