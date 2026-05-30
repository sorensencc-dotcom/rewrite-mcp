import { QdrantClient } from "./qdrant-client.js";
import { EmbeddingPipeline } from "./embedding-pipeline.js";
import crypto from "crypto";
import { metricsCollector } from "../reasoning/metrics-collector.js";

export class VectorIndex {
  private client: QdrantClient;
  private pipeline: EmbeddingPipeline;
  private keywordStore: Map<string, { id: string; rawText: string; payload: any }> = new Map();

  constructor(collection: string = "cic_semantic") {
    this.client = new QdrantClient(collection);
    this.pipeline = new EmbeddingPipeline();
  }

  async upsert(doc: any): Promise<{ ok: boolean; id: string }> {
    const tStart = Date.now();
    if (!doc || !doc.rawText) {
      throw new Error("Invalid SemanticDocument: rawText is required");
    }

    const docId = doc.docId || crypto.randomUUID();
    const vector = await this.pipeline.generateEmbedding(doc.rawText);

    // Save keyword state in-memory for hybrid search
    this.keywordStore.set(docId, {
      id: docId,
      rawText: doc.rawText,
      payload: doc
    });

    const points = [{
      id: docId,
      vector,
      payload: {
        rawText: doc.rawText,
        entities: doc.entities || [],
        relationships: doc.relationships || [],
        topics: doc.topics || [],
        summary: doc.summary || "",
        timestamp: doc.timestamp || new Date().toISOString(),
        entity_ids: doc.entity_ids || [],
        link_count: doc.link_count ?? 0,
        primary_topics: doc.primary_topics || []
      }
    }];

    const ok = await this.client.upsert(points);
    metricsCollector.recordVectorUpsert(Date.now() - tStart);
    return { ok, id: docId };
  }

  async hybridSearch(query: string, limit: number = 10): Promise<any[]> {
    const tStart = Date.now();
    if (!query) return [];

    // 1. Vector Search
    const queryVector = await this.pipeline.generateEmbedding(query);
    const vectorResults = await this.client.search(queryVector, limit * 2);

    // 2. Keyword Search (Substring matching)
    const keywordResults: any[] = [];
    const queryWords = query.toLowerCase().split(/\s+/);
    
    for (const item of this.keywordStore.values()) {
      let score = 0;
      for (const word of queryWords) {
        if (item.rawText.toLowerCase().includes(word)) {
          score += 1;
        }
      }
      if (score > 0) {
        keywordResults.push({
          id: item.id,
          score,
          payload: item.payload
        });
      }
    }
    keywordResults.sort((a, b) => b.score - a.score);

    // 3. Reciprocal Rank Fusion (RRF)
    const k = 60; // constant parameter for RRF
    const rrfScores: Map<string, { doc: any; score: number }> = new Map();

    const addRrfScore = (results: any[], weight: number) => {
      results.forEach((item, index) => {
        const docId = item.id;
        const rank = index + 1;
        const rrfContribution = weight / (k + rank);

        if (!rrfScores.has(docId)) {
          rrfScores.set(docId, { doc: item, score: 0 });
        }
        rrfScores.get(docId)!.score += rrfContribution;
      });
    };

    addRrfScore(vectorResults, 1.0); // Vector ranking
    addRrfScore(keywordResults, 1.0); // Keyword ranking

    // Sort RRF scores and format output
    const fusedResults = Array.from(rrfScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => {
        return {
          id: item.doc.id,
          rrf_score: item.score,
          payload: item.doc.payload
        };
      });

    metricsCollector.recordVectorQuery(Date.now() - tStart);
    return fusedResults;
  }

  async indexSemanticDocument(doc: any): Promise<void> {
    await this.upsert(doc);
  }

  async searchSemantic(query: string, topK: number = 10): Promise<any[]> {
    return this.hybridSearch(query, topK);
  }

  getAllDocuments(): any[] {
    return Array.from(this.keywordStore.values()).map(item => item.payload);
  }

  async getHealth(): Promise<any> {
    return this.client.getHealth();
  }
}
