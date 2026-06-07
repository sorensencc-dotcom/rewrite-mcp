/**
 * projects/cic/src/indexer/qdrant-mock.ts
 * High-fidelity in-process Qdrant mock server for indexing.
 */

export class QdrantMock {
  private collections: Map<string, { vectors: Map<string, { id: string; vector: number[]; payload: any }> }> = new Map();
  private lastUpsertTimestamp: string | null = null;

  async createCollection(name: string): Promise<boolean> {
    if (this.collections.has(name)) return true;
    this.collections.set(name, { vectors: new Map() });
    return true;
  }

  async upsert(collection: string, points: { id: string; vector: number[]; payload: any }[]): Promise<boolean> {
    if (!this.collections.has(collection)) {
      await this.createCollection(collection);
    }
    const c = this.collections.get(collection)!;
    for (const p of points) {
      c.vectors.set(p.id, p);
    }
    this.lastUpsertTimestamp = new Date().toISOString();
    return true;
  }

  async search(collection: string, vector: number[], limit: number = 10): Promise<any[]> {
    if (!this.collections.has(collection)) return [];
    const c = this.collections.get(collection)!;
    
    // Simulate vector similarity retrieval
    const results = Array.from(c.vectors.values()).map(p => {
      return {
        id: p.id,
        score: 0.85 + Math.random() * 0.1,
        payload: p.payload
      };
    });

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async getHealth(collection: string): Promise<any> {
    const exists = this.collections.has(collection);
    const count = exists ? this.collections.get(collection)!.vectors.size : 0;
    return {
      collection,
      status: exists ? "green" : "red",
      vectors: count,
      last_upsert: this.lastUpsertTimestamp,
      embedding_version: "v2.0.0"
    };
  }

  reset(): void {
    this.collections.clear();
    this.lastUpsertTimestamp = null;
  }
}
export const qdrantMock = new QdrantMock();
