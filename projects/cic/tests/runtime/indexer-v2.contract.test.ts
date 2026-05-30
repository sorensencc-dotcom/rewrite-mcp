import { describe, it, expect, beforeEach } from "vitest";
import { EmbeddingPipeline } from "../../src/indexer/embedding-pipeline.js";
import { VectorIndex } from "../../src/indexer/vector-index.js";
import { IndexHealth } from "../../src/indexer/index-health.js";
import { qdrantMock } from "../../src/indexer/qdrant-mock.js";

describe("Semantic Indexer v2 - Contract & Unit Tests", () => {
  beforeEach(() => {
    qdrantMock.reset();
  });

  describe("EmbeddingPipeline", () => {
    it("should generate 1536-dimensional normalized vectors", async () => {
      const pipeline = new EmbeddingPipeline();
      const text = "Charles Emil Sorensen was born in Lellinge, Denmark.";
      const vector = await pipeline.generateEmbedding(text);

      expect(vector).toBeInstanceOf(Array);
      expect(vector.length).toBe(1536);

      // Verify normalization: magnitude must be approximately 1.0
      const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    it("should support embedText and embedDocument explicit interfaces", async () => {
      const pipeline = new EmbeddingPipeline();
      const text = "Deterministic text sample";
      const vecFromText = await pipeline.embedText(text);
      const vecFromDoc = await pipeline.embedDocument({ rawText: text });

      expect(vecFromText).toEqual(vecFromDoc);
      expect(vecFromText.length).toBe(1536);
    });

    it("should produce deterministic vectors for identical inputs", async () => {
      const pipeline = new EmbeddingPipeline();
      const text = "Cast Iron Charlie documentary series";
      const vec1 = await pipeline.generateEmbedding(text);
      const vec2 = await pipeline.generateEmbedding(text);

      expect(vec1).toEqual(vec2);
    });

    it("should throw a validation error when given empty or missing text", async () => {
      const pipeline = new EmbeddingPipeline();
      await expect(pipeline.generateEmbedding("")).rejects.toThrow(
        "Text content is required for embedding generation"
      );
    });
  });

  describe("VectorIndex", () => {
    it("should store and index a valid SemanticDocument", async () => {
      const index = new VectorIndex("test_collection");
      const doc = {
        docId: "doc-001",
        rawText: "Charles Emil Sorensen emigrated to Chicago.",
        entities: [{ name: "Sorensen, Charles Emil", type: "PEOPLE" }],
        relationships: [{ subject: "Sorensen, Charles Emil", predicate: "emigrated_to", object: "Chicago" }],
        topics: ["Migration"],
        summary: "Charles Sorensen's migration in 1883"
      };

      const result = await index.upsert(doc);
      expect(result.ok).toBe(true);
      expect(result.id).toBe("doc-001");

      const health = await index.getHealth();
      expect(health.status).toBe("green");
      expect(health.vectors).toBe(1);
    });

    it("should generate a random UUID if docId is not provided", async () => {
      const index = new VectorIndex("test_collection");
      const doc = {
        rawText: "Lellinge is a small village in Sjælland."
      };

      const result = await index.upsert(doc);
      expect(result.ok).toBe(true);
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("string");
    });

    it("should enforce payload schema boundaries on upserted elements", async () => {
      const index = new VectorIndex("test_collection");
      await expect(index.upsert(null)).rejects.toThrow("Invalid SemanticDocument");
      await expect(index.upsert({})).rejects.toThrow("Invalid SemanticDocument");
    });

    it("should execute Reciprocal Rank Fusion (RRF) hybrid search successfully", async () => {
      const index = new VectorIndex("test_collection");
      
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
      expect(searchResults).toBeInstanceOf(Array);
      expect(searchResults.length).toBeGreaterThan(0);

      // Inspect schema shape of search items
      const topResult = searchResults[0];
      expect(topResult).toHaveProperty("id");
      expect(topResult).toHaveProperty("rrf_score");
      expect(topResult).toHaveProperty("payload");
      expect(topResult.payload).toHaveProperty("rawText");
      expect(topResult.payload.topics).toBeInstanceOf(Array);
    });

    it("should support indexSemanticDocument and searchSemantic explicit interfaces", async () => {
      const index = new VectorIndex("test_collection");
      
      const doc = {
        docId: "checklist-doc-1",
        rawText: "Charles Emil Sorensen and Henry Ford worked closely.",
        entities: [{ name: "Ford, Henry", type: "PEOPLE" }],
        topics: ["Career"]
      };

      await index.indexSemanticDocument(doc);
      
      const searchResults = await index.searchSemantic("Henry Ford closely", 3);
      expect(searchResults).toBeInstanceOf(Array);
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].id).toBe("checklist-doc-1");
    });
  });

  describe("IndexHealth", () => {
    it("should compile and return correct diagnostic statuses", async () => {
      const reporter = new IndexHealth("test_collection");
      const healthReport = await reporter.report();

      expect(healthReport).toHaveProperty("collection", "test_collection");
      expect(healthReport).toHaveProperty("status");
      expect(healthReport).toHaveProperty("vectors");
      expect(healthReport).toHaveProperty("last_upsert");
      expect(healthReport).toHaveProperty("embedding_version", "v2.0.0");
    });
  });
});
