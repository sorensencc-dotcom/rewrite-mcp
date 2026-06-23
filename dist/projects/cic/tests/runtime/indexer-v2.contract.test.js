"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const embedding_pipeline_js_1 = require("../../src/indexer/embedding-pipeline.js");
const vector_index_js_1 = require("../../src/indexer/vector-index.js");
const index_health_js_1 = require("../../src/indexer/index-health.js");
const qdrant_mock_js_1 = require("../../src/indexer/qdrant-mock.js");
(0, vitest_1.describe)("Semantic Indexer v2 - Contract & Unit Tests", () => {
    (0, vitest_1.beforeEach)(() => {
        qdrant_mock_js_1.qdrantMock.reset();
    });
    (0, vitest_1.describe)("EmbeddingPipeline", () => {
        (0, vitest_1.it)("should generate 1536-dimensional normalized vectors", async () => {
            const pipeline = new embedding_pipeline_js_1.EmbeddingPipeline();
            const text = "Charles Emil Sorensen was born in Lellinge, Denmark.";
            const vector = await pipeline.generateEmbedding(text);
            (0, vitest_1.expect)(vector).toBeInstanceOf(Array);
            (0, vitest_1.expect)(vector.length).toBe(1536);
            // Verify normalization: magnitude must be approximately 1.0
            const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
            (0, vitest_1.expect)(magnitude).toBeCloseTo(1.0, 5);
        });
        (0, vitest_1.it)("should support embedText and embedDocument explicit interfaces", async () => {
            const pipeline = new embedding_pipeline_js_1.EmbeddingPipeline();
            const text = "Deterministic text sample";
            const vecFromText = await pipeline.embedText(text);
            const vecFromDoc = await pipeline.embedDocument({ rawText: text });
            (0, vitest_1.expect)(vecFromText).toEqual(vecFromDoc);
            (0, vitest_1.expect)(vecFromText.length).toBe(1536);
        });
        (0, vitest_1.it)("should produce deterministic vectors for identical inputs", async () => {
            const pipeline = new embedding_pipeline_js_1.EmbeddingPipeline();
            const text = "Cast Iron Charlie documentary series";
            const vec1 = await pipeline.generateEmbedding(text);
            const vec2 = await pipeline.generateEmbedding(text);
            (0, vitest_1.expect)(vec1).toEqual(vec2);
        });
        (0, vitest_1.it)("should throw a validation error when given empty or missing text", async () => {
            const pipeline = new embedding_pipeline_js_1.EmbeddingPipeline();
            await (0, vitest_1.expect)(pipeline.generateEmbedding("")).rejects.toThrow("Text content is required for embedding generation");
        });
    });
    (0, vitest_1.describe)("VectorIndex", () => {
        (0, vitest_1.it)("should store and index a valid SemanticDocument", async () => {
            const index = new vector_index_js_1.VectorIndex("test_collection");
            const doc = {
                docId: "doc-001",
                rawText: "Charles Emil Sorensen emigrated to Chicago.",
                entities: [{ name: "Sorensen, Charles Emil", type: "PEOPLE" }],
                relationships: [{ subject: "Sorensen, Charles Emil", predicate: "emigrated_to", object: "Chicago" }],
                topics: ["Migration"],
                summary: "Charles Sorensen's migration in 1883"
            };
            const result = await index.upsert(doc);
            (0, vitest_1.expect)(result.ok).toBe(true);
            (0, vitest_1.expect)(result.id).toBe("doc-001");
            const health = await index.getHealth();
            (0, vitest_1.expect)(health.status).toBe("green");
            (0, vitest_1.expect)(health.vectors).toBe(1);
        });
        (0, vitest_1.it)("should generate a random UUID if docId is not provided", async () => {
            const index = new vector_index_js_1.VectorIndex("test_collection");
            const doc = {
                rawText: "Lellinge is a small village in Sjælland."
            };
            const result = await index.upsert(doc);
            (0, vitest_1.expect)(result.ok).toBe(true);
            (0, vitest_1.expect)(result.id).toBeDefined();
            (0, vitest_1.expect)(typeof result.id).toBe("string");
        });
        (0, vitest_1.it)("should enforce payload schema boundaries on upserted elements", async () => {
            const index = new vector_index_js_1.VectorIndex("test_collection");
            await (0, vitest_1.expect)(index.upsert(null)).rejects.toThrow("Invalid SemanticDocument");
            await (0, vitest_1.expect)(index.upsert({})).rejects.toThrow("Invalid SemanticDocument");
        });
        (0, vitest_1.it)("should execute Reciprocal Rank Fusion (RRF) hybrid search successfully", async () => {
            const index = new vector_index_js_1.VectorIndex("test_collection");
            // Upsert multiple test documents
            await index.upsert({
                docId: "doc-denmark",
                rawText: "Sorensen was born in Lellinge, Denmark.",
                topics: ["Origins"]
            });
            await index.upsert({
                docId: "doc-chicago",
                rawText: "He moved to Chicago in May 1883 with his parents.",
                topics: ["Migration"]
            });
            const searchResults = await index.hybridSearch("Denmark origins", 5);
            (0, vitest_1.expect)(searchResults).toBeInstanceOf(Array);
            (0, vitest_1.expect)(searchResults.length).toBeGreaterThan(0);
            // Inspect schema shape of search items
            const topResult = searchResults[0];
            (0, vitest_1.expect)(topResult).toHaveProperty("id");
            (0, vitest_1.expect)(topResult).toHaveProperty("rrf_score");
            (0, vitest_1.expect)(topResult).toHaveProperty("payload");
            (0, vitest_1.expect)(topResult.payload).toHaveProperty("rawText");
            (0, vitest_1.expect)(topResult.payload.topics).toBeInstanceOf(Array);
        });
        (0, vitest_1.it)("should support indexSemanticDocument and searchSemantic explicit interfaces", async () => {
            const index = new vector_index_js_1.VectorIndex("test_collection");
            const doc = {
                docId: "checklist-doc-1",
                rawText: "Charles Emil Sorensen and Henry Ford worked closely.",
                entities: [{ name: "Ford, Henry", type: "PEOPLE" }],
                topics: ["Career"]
            };
            await index.indexSemanticDocument(doc);
            const searchResults = await index.searchSemantic("Henry Ford closely", 3);
            (0, vitest_1.expect)(searchResults).toBeInstanceOf(Array);
            (0, vitest_1.expect)(searchResults.length).toBe(1);
            (0, vitest_1.expect)(searchResults[0].id).toBe("checklist-doc-1");
        });
    });
    (0, vitest_1.describe)("IndexHealth", () => {
        (0, vitest_1.it)("should compile and return correct diagnostic statuses", async () => {
            const reporter = new index_health_js_1.IndexHealth("test_collection");
            const healthReport = await reporter.report();
            (0, vitest_1.expect)(healthReport).toHaveProperty("collection", "test_collection");
            (0, vitest_1.expect)(healthReport).toHaveProperty("status");
            (0, vitest_1.expect)(healthReport).toHaveProperty("vectors");
            (0, vitest_1.expect)(healthReport).toHaveProperty("last_upsert");
            (0, vitest_1.expect)(healthReport).toHaveProperty("embedding_version", "v2.0.0");
        });
    });
});
//# sourceMappingURL=indexer-v2.contract.test.js.map