// File: projects/cic/tests/runtime/tenant-isolation.contract.test.ts | Date: 2026-05-30 | v1.4.0
/**
 * Contract test suite verifying Multi-Tenant Knowledge Fabric isolation.
 * Assures complete data separation across registries, graph neighborhoods, and index collections.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { entityResolver } from "../../src/linking/entity-resolver.js";
import { graphBuilder } from "../../src/linking/graph-builder.js";
import { VectorIndex } from "../../src/indexer/vector-index.js";

describe("Multi-Tenant Knowledge Fabric Isolation Contract Tests", () => {
  beforeEach(() => {
    entityResolver.clear("tenant_A");
    entityResolver.clear("tenant_B");
    graphBuilder.clear("tenant_A");
    graphBuilder.clear("tenant_B");
  });

  describe("1. EntityResolver Scoping", () => {
    it("should keep resolved entities completely isolated between tenants", () => {
      // Resolve entity in tenant_A
      const entA = entityResolver.resolve(
        { name: "Charles Emil Sorensen", type: "PEOPLE", context: "Denmark emigration record", confidence: 0.95 },
        "tenant_A"
      );

      // Resolve entity in tenant_B
      const entB = entityResolver.resolve(
        { name: "Charles Emil Sorensen", type: "PEOPLE", context: "Ford motor co hiring registry", confidence: 0.90 },
        "tenant_B"
      );

      // Assure different memory records or context scopes
      expect(entA.id).toBe(entB.id); // Same canonical ID resolved from the same comp key hash
      
      const canonicalsA = entityResolver.getCanonicalEntities("tenant_A");
      const canonicalsB = entityResolver.getCanonicalEntities("tenant_B");

      expect(canonicalsA.length).toBe(1);
      expect(canonicalsB.length).toBe(1);
      
      // Enriched context under tenant_A should not bleed into tenant_B
      expect(canonicalsA[0].context).toContain("Denmark emigration record");
      expect(canonicalsB[0].context).not.toContain("Denmark emigration record");
    });
  });

  describe("2. GraphBuilder Scoping", () => {
    it("should partition document neighborhoods and traversal summaries", () => {
      const docA = {
        docId: "doc_A",
        summary: "Charles Sorensen born in Denmark",
        timestamp: "1905-05-30T00:00:00Z",
        rawText: "Charles Sorensen leaves Lellinge, Denmark.",
        entities: [
          { id: "ent_sorensen", name: "Charles Sorensen", type: "PEOPLE", context: "Emigration", confidence: 0.95 }
        ],
        relationships: []
      };

      const docB = {
        docId: "doc_B",
        summary: "Charles Sorensen manager of Willow Run",
        timestamp: "1943-06-01T00:00:00Z",
        rawText: "Charles Sorensen directs Willow Run assembly lines.",
        entities: [
          { id: "ent_sorensen", name: "Charles Sorensen", type: "PEOPLE", context: "Willow Run", confidence: 0.90 }
        ],
        relationships: []
      };

      // Add to respective partitions
      graphBuilder.addDocumentGraph(docA, [], "tenant_A");
      graphBuilder.addDocumentGraph(docB, [], "tenant_B");

      // Verify summaries are completely separate
      const summaryA = graphBuilder.getSummary("tenant_A");
      const summaryB = graphBuilder.getSummary("tenant_B");

      expect(summaryA.nodes.documents).toBe(1);
      expect(summaryA.nodes.entities).toBe(1);
      expect(summaryB.nodes.documents).toBe(1);
      expect(summaryB.nodes.entities).toBe(1);

      // Verify neighborhoods do not bleed
      const neighA = graphBuilder.getEntityNeighborhood("ent_sorensen", "tenant_A");
      const neighB = graphBuilder.getEntityNeighborhood("ent_sorensen", "tenant_B");

      expect(neighA.documents.map(d => d.docId)).toContain("doc_A");
      expect(neighA.documents.map(d => d.docId)).not.toContain("doc_B");

      expect(neighB.documents.map(d => d.docId)).toContain("doc_B");
      expect(neighB.documents.map(d => d.docId)).not.toContain("doc_A");
    });
  });

  describe("3. VectorIndex Scoping", () => {
    it("should search and isolate hybrid text matches by tenant keyword store", async () => {
      const vectorIndex = new VectorIndex("test_collection");

      const docA = {
        docId: "doc_A",
        rawText: "Charles Sorensen emigrated from Lellinge, Denmark in 1905 on the SS Hellig Olav.",
        summary: "Danish emigration beat"
      };

      const docB = {
        docId: "doc_B",
        rawText: "Charles Sorensen directed Willow Run bomber production in Michigan in 1943.",
        summary: "Willow Run manufacturing beat"
      };

      // Upsert into isolated tenant stores
      await vectorIndex.upsert(docA, "tenant_A");
      await vectorIndex.upsert(docB, "tenant_B");

      // Perform hybrid search queries
      const searchA = await vectorIndex.hybridSearch("Denmark", 5, "tenant_A");
      const searchB = await vectorIndex.hybridSearch("Denmark", 5, "tenant_B");

      expect(searchA.length).toBe(1);
      expect(searchA[0].id).toBe("doc_A");
      
      // searchB must NEVER return doc_A from tenant_A (proving complete isolation)
      expect(searchB.some(item => item.id === "doc_A")).toBe(false);
    });
  });
});
