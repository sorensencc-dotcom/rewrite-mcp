/**
 * provision-qdrant.js
 * @version 1.0.0
 * @date 2026-05-17
 *
 * One-shot Qdrant provisioning script for Phase 18.
 * Creates the `cic_context` collection if it does not already exist.
 *
 * Collection spec (BOB §3):
 *   name:              cic_context
 *   vectors.size:      1536    (OpenAI text-embedding-3-small)
 *   vectors.distance:  Cosine
 *
 * Payload index:  user_id (keyword), intent (keyword), stored_at (integer)
 *
 * Usage:
 *   QDRANT_URL=http://localhost:6333 node scripts/provision-qdrant.js
 *   QDRANT_URL=https://cloud.qdrant.io QDRANT_API_KEY=xxx node scripts/provision-qdrant.js
 *
 * Idempotent — safe to run multiple times.
 */

import { QdrantClient } from '@qdrant/js-client-rest';

const COLLECTION    = process.env.QDRANT_COLLECTION ?? 'cic_context';
const VECTOR_SIZE   = 1536;
const DISTANCE      = 'Cosine';
const QDRANT_URL    = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY ?? undefined;

if (!QDRANT_URL) {
  console.error('[provision-qdrant] QDRANT_URL is required');
  process.exit(1);
}

const client = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });

async function provision() {
  // Check existing collections
  const { collections } = await client.getCollections();
  const exists = collections.some(c => c.name === COLLECTION);

  if (exists) {
    console.log(`[provision-qdrant] Collection "${COLLECTION}" already exists — skipping creation.`);
  } else {
    console.log(`[provision-qdrant] Creating collection "${COLLECTION}" (size=${VECTOR_SIZE}, distance=${DISTANCE})...`);
    await client.createCollection(COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: DISTANCE },
      optimizers_config: { default_segment_number: 2 },
      replication_factor: 1,
    });
    console.log(`[provision-qdrant] Collection "${COLLECTION}" created.`);
  }

  // Create payload indexes for efficient filtering
  const indexes = [
    { field_name: 'user_id',   field_schema: 'keyword' },
    { field_name: 'intent',    field_schema: 'keyword' },
    { field_name: 'stored_at', field_schema: 'integer' },
  ];

  for (const idx of indexes) {
    try {
      await client.createPayloadIndex(COLLECTION, idx);
      console.log(`[provision-qdrant] Index on "${idx.field_name}" ensured.`);
    } catch (err) {
      // Index already exists — not an error
      if (err.message?.includes('already exists')) {
        console.log(`[provision-qdrant] Index on "${idx.field_name}" already exists.`);
      } else {
        throw err;
      }
    }
  }

  // Verify
  const info = await client.getCollection(COLLECTION);
  console.log('[provision-qdrant] Verified:', JSON.stringify({
    name:        COLLECTION,
    status:      info.status,
    points:      info.points_count ?? 0,
    vector_size: info.config?.params?.vectors?.size,
    distance:    info.config?.params?.vectors?.distance,
  }, null, 2));
}

provision().catch(err => {
  console.error('[provision-qdrant] FATAL:', err.message);
  process.exit(1);
});
