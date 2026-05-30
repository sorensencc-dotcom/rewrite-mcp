import { describe, it, expect, beforeEach } from "vitest";
import { Harvester } from "../../../src/harvester/harvester.js";
import { qdrantMock } from "../../../src/indexer/qdrant-mock.js";
import { router } from "../../../src/cic/control-plane/index.js";
import { VectorIndex } from "../../../src/indexer/vector-index.js";
import { entityResolver } from "../../../src/linking/entity-resolver.js";
import { linkEngine } from "../../../src/linking/link-engine.js";
import { graphBuilder } from "../../../src/linking/graph-builder.js";

describe("Cross-Document Linking - Hybrid Integration Tests (Mode B)", () => {
  beforeEach(() => {
    qdrantMock.reset();
    entityResolver.clear();
    graphBuilder.clear();
  });

  it("should process multiple documents, resolve entities, compute cross-document links, enrich index payloads, and build the graph", async () => {
    const harvester = new Harvester();

    // Ingest Document 1
    const sourceText1 = "Charles Emil Sorensen was born in Lellinge, Sjælland, Denmark. Early Life.";
    const job1 = {
      type: "semantic",
      payload: {
        docId: "doc-hybrid-1",
        raw: sourceText1
      }
    };
    const result1 = await harvester.run(job1);

    // Verify first ingestion succeeded
    expect(result1.type).toBe("semantic_ingestion");
    expect(result1.docId).toBe("doc-hybrid-1");
    expect(result1.entity_ids).toHaveLength(result1.entities.length);
    expect(result1.link_count).toBe(0); // No other documents yet

    // Ingest Document 2 (Sharing entity "Sorensen, Charles Emil" and topic "Early Life")
    const sourceText2 = "Sorensen, Charles Emil emigrated to Chicago in 1883. Early Life.";
    const job2 = {
      type: "semantic",
      payload: {
        docId: "doc-hybrid-2",
        raw: sourceText2
      }
    };
    const result2 = await harvester.run(job2);

    // Verify second ingestion succeeded
    expect(result2.type).toBe("semantic_ingestion");
    expect(result2.docId).toBe("doc-hybrid-2");
    
    // Charles Sorensen should be mapped to the same ID!
    const charId1 = result1.entities.find((e: any) => e.name.includes("Sorensen") || e.name.includes("Charles"))?.id;
    const charId2 = result2.entities.find((e: any) => e.name.includes("Sorensen") || e.name.includes("Charles"))?.id;
    expect(charId1).toBeDefined();
    expect(charId1).toBe(charId2);

    // Should have established cross-document links: same_entity ("Charles") and related_topic ("Early Life")
    expect(result2.link_count).toBeGreaterThanOrEqual(1);

    // 3. Verify downstream payload enrichment in the index
    const index = new VectorIndex();
    const searchResult = await index.searchSemantic("Charles Sorensen", 2);
    expect(searchResult.length).toBeGreaterThan(0);

    const doc2IndexNode = searchResult.find(r => r.id === "doc-hybrid-2");
    expect(doc2IndexNode).toBeDefined();
    expect(doc2IndexNode.payload.entity_ids).toContain(charId1);
    expect(doc2IndexNode.payload.link_count).toBeGreaterThanOrEqual(1);
    expect(doc2IndexNode.payload.primary_topics).toContain("Early Life");
  });

  describe("Control Plane Route Handler Verification", () => {
    let harvester: Harvester;
    let charId: string;

    beforeEach(async () => {
      harvester = new Harvester();
      const r1 = await harvester.run({
        type: "semantic",
        payload: { docId: "doc-c1", raw: "Sorensen, Charles Emil was born in Lellinge. Early Life." }
      });
      const r2 = await harvester.run({
        type: "semantic",
        payload: { docId: "doc-c2", raw: "Charles Emil Sorensen worked at Ford. Early Life." }
      });
      charId = r1.entities.find((e: any) => e.name.includes("Sorensen"))?.id || "";
    });

    const constructMockResponse = () => {
      let jsonPayload: any = null;
      let statusValue: number = 200;
      return {
        res: {
          status(code: number) {
            statusValue = code;
            return this;
          },
          json(data: any) {
            jsonPayload = data;
            return this;
          }
        } as any,
        getPayload: () => jsonPayload,
        getStatus: () => statusValue
      };
    };

    it("GET /graph/summary should return node and edge counts", async () => {
      const handlers = (router.stack.find(s => s.route?.path === "/graph/summary")?.route?.stack || []);
      const handler = handlers[0]?.handle;
      expect(handler).toBeDefined();

      const mock = constructMockResponse();
      await handler({} as any, mock.res, () => {});

      expect(mock.getStatus()).toBe(200);
      const summary = mock.getPayload();
      expect(summary.nodes.documents).toBe(2);
      expect(summary.nodes.entities).toBeGreaterThan(0);
      expect(summary.edges.crossDocLinks).toBeGreaterThan(0);
      expect(summary.health.status).toBe("green");
    });

    it("GET /graph/entity/:id should return neighborhood for valid entity", async () => {
      const handlers = (router.stack.find(s => s.route?.path === "/graph/entity/:id")?.route?.stack || []);
      const handler = handlers[0]?.handle;
      expect(handler).toBeDefined();

      const mock = constructMockResponse();
      await handler({ params: { id: charId } } as any, mock.res, () => {});

      expect(mock.getStatus()).toBe(200);
      const neighborhood = mock.getPayload();
      expect(neighborhood.entity.name).toBe("Sorensen, Charles Emil");
      expect(neighborhood.documents).toHaveLength(2);
      expect(neighborhood.relationships.length).toBeGreaterThan(0);
    });

    it("GET /graph/entity/:id should return 404 for unknown entity ID", async () => {
      const handlers = (router.stack.find(s => s.route?.path === "/graph/entity/:id")?.route?.stack || []);
      const handler = handlers[0]?.handle;

      const mock = constructMockResponse();
      await handler({ params: { id: "ent-unknown-999" } } as any, mock.res, () => {});

      expect(mock.getStatus()).toBe(404);
      expect(mock.getPayload().error).toContain("not found");
    });

    it("GET /graph/document/:id should return neighborhood for valid document ID", async () => {
      const handlers = (router.stack.find(s => s.route?.path === "/graph/document/:id")?.route?.stack || []);
      const handler = handlers[0]?.handle;
      expect(handler).toBeDefined();

      const mock = constructMockResponse();
      await handler({ params: { id: "doc-c1" } } as any, mock.res, () => {});

      expect(mock.getStatus()).toBe(200);
      const neighborhood = mock.getPayload();
      expect(neighborhood.document.docId).toBe("doc-c1");
      expect(neighborhood.entities.length).toBeGreaterThan(0);
      expect(neighborhood.relatedDocuments.length).toBeGreaterThan(0);
    });

    it("GET /graph/document/:id should return 404 for unknown document ID", async () => {
      const handlers = (router.stack.find(s => s.route?.path === "/graph/document/:id")?.route?.stack || []);
      const handler = handlers[0]?.handle;

      const mock = constructMockResponse();
      await handler({ params: { id: "doc-unknown-999" } } as any, mock.res, () => {});

      expect(mock.getStatus()).toBe(404);
      expect(mock.getPayload().error).toContain("not found");
    });
  });
});
