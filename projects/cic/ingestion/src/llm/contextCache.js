/**
 * contextCache.js
 * @version 1.1.0
 * @date 2026-05-17
 *
 * In-process LRU cache keyed by (user_id, intent).
 * Each bucket holds N most-recent entries with their embeddings.
 * Lookup returns the closest match by cosine similarity if it clears the threshold.
 *
 * v1.1.0 changes:
 *   - cosineSimilarity removed — imported from utils.js (D6)
 *   - True LRU: on cache hit, entry moves to tail of bucket (D7)
 *   - createContextCache() factory exported for isolated instances (D4)
 *   - Module-level _defaultCache kept as backward-compat fallback for run()
 *
 * Scope: single process / single Node instance.
 * For multi-process or persistent caching, swap the store for a Redis/Qdrant
 * backend while keeping this interface identical.
 */

import { cosineSimilarity } from './utils.js';

const MODULE = 'contextCache';

const DEFAULT_BUCKET_SIZE = 64; // entries per (user_id, intent) key

/**
 * @typedef {Object} LookupParams
 * @property {string}   user_id
 * @property {string}   intent
 * @property {number[]} input_embedding
 */

/**
 * @typedef {Object} LookupResult
 * @property {boolean} hit
 * @property {string}  [answer]
 * @property {number}  [tokens_prompt]
 * @property {number}  [tokens_completion]
 * @property {number}  [similarity]
 */

/**
 * @typedef {Object} StoreParams
 * @property {string}   user_id
 * @property {string}   intent
 * @property {number[]} input_embedding
 * @property {string}   answer
 * @property {number}   tokens_prompt
 * @property {number}   tokens_completion
 */

/**
 * @typedef {Object} CacheEntry
 * @property {number[]} embedding
 * @property {string}   answer
 * @property {number}   tokens_prompt
 * @property {number}   tokens_completion
 * @property {number}   storedAt
 */

// ---------------------------------------------------------------------------
// Factory — creates an isolated cache instance
// ---------------------------------------------------------------------------

/**
 * Create an isolated cache instance.
 * Use this when you need per-BOB-instance caches (createBOB pattern).
 *
 * @returns {{ lookup: Function, store: Function, invalidate: Function, flush: Function, size: Function }}
 */
export function createContextCache() {
  /** @type {Map<string, CacheEntry[]>} */
  const _store = new Map();

  function lookup({ user_id, intent, input_embedding }, similarityThreshold) {
    _assertEmbedding(input_embedding, 'lookup.input_embedding');
    const key = _key(user_id, intent);
    const bucket = _store.get(key);
    if (!bucket || bucket.length === 0) return { hit: false };

    let bestIdx = -1;
    let bestSim = -Infinity;

    for (let i = 0; i < bucket.length; i++) {
      const sim = cosineSimilarity(input_embedding, bucket[i].embedding);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = i;
      }
    }

    if (bestSim >= similarityThreshold) {
      const entry = bucket[bestIdx];
      // LRU: move hit entry to tail (most-recently-used position)
      bucket.splice(bestIdx, 1);
      entry.storedAt = Date.now();
      bucket.push(entry);
      return {
        hit: true,
        answer: entry.answer,
        tokens_prompt: entry.tokens_prompt,
        tokens_completion: entry.tokens_completion,
        similarity: bestSim,
      };
    }

    return { hit: false };
  }

  function store(
    { user_id, intent, input_embedding, answer, tokens_prompt, tokens_completion },
    bucketSize = DEFAULT_BUCKET_SIZE
  ) {
    _assertEmbedding(input_embedding, 'store.input_embedding');
    if (typeof answer !== 'string') throw new Error(`[${MODULE}] store: 'answer' must be a string`);

    const key = _key(user_id, intent);
    let bucket = _store.get(key);
    if (!bucket) {
      bucket = [];
      _store.set(key, bucket);
    }

    /** @type {CacheEntry} */
    const entry = {
      embedding: input_embedding,
      answer,
      tokens_prompt: tokens_prompt ?? 0,
      tokens_completion: tokens_completion ?? 0,
      storedAt: Date.now(),
    };

    bucket.push(entry);
    // LRU eviction: head = least recently used
    if (bucket.length > bucketSize) {
      bucket.splice(0, bucket.length - bucketSize);
    }
  }

  function invalidate(user_id, intent) {
    _store.delete(_key(user_id, intent));
  }

  function flush() {
    _store.clear();
  }

  function size() {
    let n = 0;
    for (const bucket of _store.values()) n += bucket.length;
    return n;
  }

  return { lookup, store, invalidate, flush, size };
}

// ---------------------------------------------------------------------------
// Module-level default instance — backward-compat for direct run() callers
// ---------------------------------------------------------------------------

const _default = createContextCache();

export const lookup     = _default.lookup.bind(_default);
export const store      = _default.store.bind(_default);
export const invalidate = _default.invalidate.bind(_default);
export const flush      = _default.flush.bind(_default);
export const size       = _default.size.bind(_default);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _key(user_id, intent) {
  if (!user_id) throw new Error(`[${MODULE}] missing required param 'user_id'`);
  if (!intent)  throw new Error(`[${MODULE}] missing required param 'intent'`);
  return `${user_id}::${intent}`;
}

function _assertEmbedding(vec, label) {
  if (!Array.isArray(vec) || vec.length === 0) {
    throw new Error(`[${MODULE}] ${label} must be a non-empty number[]`);
  }
}
