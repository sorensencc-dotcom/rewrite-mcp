import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || null;
const COLLECTION = process.env.CIC_CONTEXT_COLLECTION || 'cic_context';
const VECTOR_SIZE = 1536;

async function main() {
  console.log(`Checking Qdrant collection: ${COLLECTION}...`);

  const client = new QdrantClient({
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY || undefined,
  });

  try {
    // Correct JS REST method: list all collections
    const list = await client.getCollections();
    const names = list.collections.map(c => c.name);

    if (!names.includes(COLLECTION)) {
      console.log(`Collection not found. Creating: ${COLLECTION}`);
      await client.createCollection(COLLECTION, {
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
      });
      console.log(`Created collection: ${COLLECTION}`);
    } else {
      console.log(`Collection already exists: ${COLLECTION}`);
    }
  } catch (err) {
    console.error('Failed to initialize Qdrant:', err.message || err);
    process.exit(1);
  }
}

main();
