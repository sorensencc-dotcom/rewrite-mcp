import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import { Harvester } from "../../../src/harvester/harvester.js";
import { qdrantMock } from "../../../src/indexer/qdrant-mock.js";
import { router } from "../../../src/cic/control-plane/index.js";
import { VectorIndex } from "../../../src/indexer/vector-index.js";

describe("Semantic Indexer v2 - Hybrid Integration Tests (Mode B)", () => {
  beforeEach(() => {
    qdrantMock.reset();
  });

  it("should process a full end-to-end semantic ingestion job via the Harvester", async () => {
    const harvester = new Harvester();
    const sourceText = "Charles Emil Sorensen was born on September 7, 1881 in Lellinge, Sjælland, Denmark. He emigrated to Chicago in May 1883 with his father Soren Sorensen and mother Karen Sorensen.";

    const job = {
      type: "semantic",
      payload: {
        docId: "doc-hybrid-999",
        raw: sourceText
      }
    };

    const result = await harvester.run(job);

    // 1. Verify harvester response format & values
    expect(result.type).toBe("semantic_ingestion");
    expect(result.chain_execution).toBe("completed");
    expect(result.index_status).toBe("synced");
    expect(result.docId).toBe("doc-hybrid-999");
    
    // 2. Verify extracted semantic payload properties are propagated
    expect(result.entities).toBeInstanceOf(Array);
    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.entities[0]).toMatchObject({
      name: "Sorensen, Charles Emil",
      type: "PEOPLE"
    });

    expect(result.relationships).toBeInstanceOf(Array);
    expect(result.relationships.length).toBeGreaterThan(0);
    expect(result.relationships[0]).toMatchObject({
      subject: "Sorensen, Charles Emil",
      object: "Lellinge",
      predicate: "born_in"
    });

    expect(result.topics).toContain("Early Life");

    // 3. Verify downstream persistence in QdrantMock collection
    const health = await qdrantMock.getHealth("cic_semantic");
    expect(health.status).toBe("green");
    expect(health.vectors).toBe(1);
    expect(health.last_upsert).toBeDefined();
  });

  describe("Control Plane Route Handler Verification", () => {
    // We mount our control plane router to a test express app to verify HTTP status & payload mappings
    const app = express();
    app.use(express.json());
    app.use("/", router);

    it("GET /index/health should return correct index health status", async () => {
      // Index a mock document to seed health state
      const index = new VectorIndex();
      await index.upsert({
        docId: "seeded-doc",
        rawText: "Seeded test payload for control plane diagnostics"
      });

      // Construct a mock response helper
      let jsonPayload: any = null;
      let statusValue: number = 200;

      const mockRes: any = {
        status(code: number) {
          statusValue = code;
          return this;
        },
        json(data: any) {
          jsonPayload = data;
          return this;
        }
      };

      // Direct router invocation for GET /index/health
      const handlers = (router.stack.find(s => s.route?.path === "/index/health")?.route?.stack || []);
      const getHealthHandler = handlers[0]?.handle;

      expect(getHealthHandler).toBeDefined();

      await getHealthHandler({} as any, mockRes, () => {});

      expect(statusValue).toBe(200);
      expect(jsonPayload).toHaveProperty("health");
      expect(jsonPayload.health.status).toBe("green");
      expect(jsonPayload.health.vectors).toBe(1);
      expect(jsonPayload.health.collection).toBe("cic_semantic");
    });

    it("POST /index/search should execute and return structured hybrid results", async () => {
      // Seed the vector index with unique substring keyword and semantic context
      const index = new VectorIndex();
      await index.upsert({
        docId: "doc-match-1",
        rawText: "Danish origins of Charles Emil Sorensen"
      });

      let jsonPayload: any = null;
      let statusValue: number = 200;

      const mockRes: any = {
        status(code: number) {
          statusValue = code;
          return this;
        },
        json(data: any) {
          jsonPayload = data;
          return this;
        }
      };

      // Retrieve POST /index/search router handler
      const searchHandlers = (router.stack.find(s => s.route?.path === "/index/search")?.route?.stack || []);
      const postSearchHandler = searchHandlers[0]?.handle;

      expect(postSearchHandler).toBeDefined();

      // Trigger standard query
      await postSearchHandler({
        body: { query: "Danish origins", limit: 2 }
      } as any, mockRes, () => {});

      expect(statusValue).toBe(200);
      expect(jsonPayload).toHaveProperty("results");
      expect(jsonPayload.results).toBeInstanceOf(Array);
      expect(jsonPayload.results.length).toBeGreaterThan(0);
      expect(jsonPayload.results[0].id).toBe("doc-match-1");
      expect(jsonPayload.results[0]).toHaveProperty("rrf_score");

      // Verify top_k parameter support
      let topKPayload: any = null;
      const mockTopKRes: any = {
        status(code: number) { return this; },
        json(data: any) {
          topKPayload = data;
          return this;
        }
      };
      await postSearchHandler({
        body: { query: "Danish origins", top_k: 1 }
      } as any, mockTopKRes, () => {});
      expect(topKPayload).toHaveProperty("results");
      expect(topKPayload.results.length).toBe(1);

      // Verify validation boundaries: Missing Query
      let errPayload: any = null;
      let errStatus: number = 200;
      const mockErrRes: any = {
        status(code: number) {
          errStatus = code;
          return this;
        },
        json(data: any) {
          errPayload = data;
          return this;
        }
      };

      await postSearchHandler({
        body: {}
      } as any, mockErrRes, () => {});

      expect(errStatus).toBe(400);
      expect(errPayload).toHaveProperty("error", "Missing required parameter: query");
    });
  });
});
