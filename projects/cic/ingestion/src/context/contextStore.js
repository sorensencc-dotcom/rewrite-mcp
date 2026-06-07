/**
 * contextStore.js
 * @version 1.0.0
 * @date 2026-05-17
 *
 * Qdrant-backed implementation of loadContextChunks().
 * Satisfies the controller's injection point:
 *   loadContextChunks(user_id, intent) → Promise<string[]>
 *
 * Strategy:
 *   - Scroll the collection filtered by user_id + intent (no vector search —
 *     the controller handles similarity via the synergyAnalyzer after embedding).
 *   - Return payload.text from each matching point, in score order (stored_at desc).
 *
 * Required env:
 *   QDRANT_URL              e.g. http://localhost:6333
 *   QDRANT_COLLECTION       collection name, default: cic_context
 *   QDRANT_API_KEY          optional (for Qdrant Cloud)
 *   CONTEXT_SCROLL_LIMIT    max chunks to fetch, default: 32
 */

import { QdrantClient } from '@qdrant/js-client-rest';

const MODULE = 'contextStore';

const DEFAULT_COLLECTION   = 'cic_context';
const DEFAULT_SCROLL_LIMIT = 32;

/**
 * Factory — call once at startup, reuse the returned loader.
 *
 * @param {{ url?: string, apiKey?: string, collection?: string, scrollLimit?: number }} [opts]
 * @returns {{ loadContextChunks: Function }}
 */
export function createContextStore(opts = {}) {
  const url        = opts.url        ?? process.env.QDRANT_URL;
  const apiKey     = opts.apiKey     ?? process.env.QDRANT_API_KEY ?? undefined;
  const collection = opts.collection ?? process.env.QDRANT_COLLECTION ?? DEFAULT_COLLECTION;
  const limit      = opts.scrollLimit
    ?? (parseInt(process.env.CONTEXT_SCROLL_LIMIT ?? '', 10) || DEFAULT_SCROLL_LIMIT);

  if (!url) throw new Error(`[${MODULE}] QDRANT_URL is not set`);

  const client = new QdrantClient({ url, apiKey });

  return {
    /**
     * Fetch candidate context chunks for (user_id, intent) from Qdrant.
     * Points must have payload shape: { user_id, intent, text, stored_at }.
     *
     * @param {string} user_id
     * @param {string} intent
     * @returns {Promise<string[]>}
     */
    async loadContextChunks(user_id, intent) {
      if (!user_id) throw new Error(`[${MODULE}] loadContextChunks: user_id is required`);
      if (!intent)  throw new Error(`[${MODULE}] loadContextChunks: intent is required`);

      let response;
      try {
        response = await client.scroll(collection, {
          filter: {
            must: [
              { key: 'user_id', match: { value: user_id } },
              { key: 'intent',  match: { value: intent  } },
            ],
          },
          limit,
          with_payload: true,
          with_vector:  false,
        });
      } catch (err) {
        if (err.message.includes('ECONNREFUSED') || err.message.includes('Not Found') || err.message.includes('FetchError')) {
          console.warn(`[${MODULE}] Using empty context due to Qdrant failure: ${err.message}`);
          return [];
        }
        err.message = `[${MODULE}] Qdrant scroll failed: ${err.message}`;
        err.context = { collection, user_id, intent };
        throw err;
      }

      const points = response?.result?.points ?? response?.points ?? [];

      // Sort by stored_at descending (most recent first = highest priority)
      points.sort((a, b) => {
        const tA = a.payload?.stored_at ?? 0;
        const tB = b.payload?.stored_at ?? 0;
        return tB - tA;
      });

      return points
        .map(p => p.payload?.text ?? p.payload?.content ?? '')
        .filter(t => typeof t === 'string' && t.length > 0);
    },

    /**
     * Store a context chunk back into Qdrant.
     * Requires a pre-computed embedding vector.
     *
     * @param {{ user_id: string, intent: string, text: string, vector: number[], id?: string }} chunk
     */
    async storeChunk({ user_id, intent, text, vector, id }) {
      if (!vector?.length) throw new Error(`[${MODULE}] storeChunk: vector is required`);

      const pointId = id ?? _uuid();
      try {
        await client.upsert(collection, {
          wait: true,
          points: [{
            id:      pointId,
            vector,
            payload: { user_id, intent, text, stored_at: Date.now() },
          }],
        });
      } catch (err) {
        err.message = `[${MODULE}] Qdrant upsert failed: ${err.message}`;
        err.context = { collection, user_id, intent, textLength: text?.length };
        throw err;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _uuid() {
  // crypto.randomUUID available in Node >= 14.17
  return crypto.randomUUID();
}
