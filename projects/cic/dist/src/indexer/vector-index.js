// File: projects/cic/src/indexer/vector-index.ts | Date: 2026-05-30 | v1.4.0
/**
 * Synchronous inline Qdrant indexing client and hybrid text matching store.
 * Scoped by tenant for Multi-Tenant Knowledge Fabric.
 */
import { QdrantClient } from "./qdrant-client.js";
import { EmbeddingPipeline } from "./embedding-pipeline.js";
import crypto from "crypto";
import { metricsCollector } from "../reasoning/metrics-collector.js";
export class VectorIndex {
    constructor(defaultCollection = "cic_semantic") {
        // Scoped clients: tenantId -> QdrantClient
        this.tenantClients = new Map();
        // Scoped keyword stores: tenantId -> Map
        this.tenantKeywordStores = new Map();
        this.pipeline = new EmbeddingPipeline();
        // Pre-initialize default tenant client
        this.tenantClients.set("default", new QdrantClient(defaultCollection));
        this.tenantKeywordStores.set("default", new Map());
    }
    getClient(tenantId) {
        if (!this.tenantClients.has(tenantId)) {
            const collectionName = tenantId === "default" ? "cic_semantic" : `cic_semantic_${tenantId}`;
            this.tenantClients.set(tenantId, new QdrantClient(collectionName));
        }
        return this.tenantClients.get(tenantId);
    }
    getKeywordStore(tenantId) {
        if (!this.tenantKeywordStores.has(tenantId)) {
            this.tenantKeywordStores.set(tenantId, new Map());
        }
        return this.tenantKeywordStores.get(tenantId);
    }
    async upsert(doc, tenantId = "default") {
        const tStart = Date.now();
        if (!doc || !doc.rawText) {
            throw new Error("Invalid SemanticDocument: rawText is required");
        }
        const docId = doc.docId || crypto.randomUUID();
        const vector = await this.pipeline.generateEmbedding(doc.rawText);
        const keywordStore = this.getKeywordStore(tenantId);
        const client = this.getClient(tenantId);
        // Save keyword state in-memory for hybrid search
        keywordStore.set(docId, {
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
        const ok = await client.upsert(points);
        metricsCollector.recordVectorUpsert(Date.now() - tStart);
        return { ok, id: docId };
    }
    async hybridSearch(query, limit = 10, tenantId = "default") {
        const tStart = Date.now();
        if (!query)
            return [];
        const keywordStore = this.getKeywordStore(tenantId);
        const client = this.getClient(tenantId);
        // 1. Vector Search
        const queryVector = await this.pipeline.generateEmbedding(query);
        const vectorResults = await client.search(queryVector, limit * 2);
        // 2. Keyword Search (Substring matching)
        const keywordResults = [];
        const queryWords = query.toLowerCase().split(/\s+/);
        for (const item of keywordStore.values()) {
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
        const rrfScores = new Map();
        const addRrfScore = (results, weight) => {
            results.forEach((item, index) => {
                const docId = item.id;
                const rank = index + 1;
                const rrfContribution = weight / (k + rank);
                if (!rrfScores.has(docId)) {
                    rrfScores.set(docId, { doc: item, score: 0 });
                }
                rrfScores.get(docId).score += rrfContribution;
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
    async indexSemanticDocument(doc, tenantId = "default") {
        await this.upsert(doc, tenantId);
    }
    async searchSemantic(query, topK = 10, tenantId = "default") {
        return this.hybridSearch(query, topK, tenantId);
    }
    getAllDocuments(tenantId = "default") {
        return Array.from(this.getKeywordStore(tenantId).values()).map(item => item.payload);
    }
    async getHealth(tenantId = "default") {
        return this.getClient(tenantId).getHealth();
    }
}
//# sourceMappingURL=vector-index.js.map