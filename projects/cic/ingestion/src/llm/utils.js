/**
 * utils.js
 * @version 1.1.0
 * @date 2026-05-17
 *
 * Canonical math + token utilities for the LLM subsystem.
 * Single source of truth — no inline copies elsewhere.
 *
 * Exports:
 *   estimateTokens(text)          → number
 *   cosineSimilarity(a, b)        → number
 */

const MODULE = 'utils';

// Approximate token estimate: 1 token ≈ 4 characters (GPT-era heuristic).
// Swap for a tiktoken binding or model-specific encoder for precision.
const CHARS_PER_TOKEN = 4;

/**
 * Rough token estimate for an arbitrary string.
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text) {
  if (typeof text !== 'string') return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Cosine similarity between two equal-length numeric vectors.
 * Returns a value in [-1, 1]. Returns 0 if either vector has zero magnitude.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    throw new Error(`[${MODULE}] cosineSimilarity: both arguments must be arrays`);
  }
  if (a.length !== b.length) {
    throw new Error(`[${MODULE}] cosineSimilarity: vector length mismatch (${a.length} vs ${b.length})`);
  }
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return dot / denom;
}
