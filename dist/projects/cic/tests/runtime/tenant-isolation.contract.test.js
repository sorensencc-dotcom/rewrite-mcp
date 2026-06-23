"use strict";
// File: projects/cic/tests/runtime/tenant-isolation.contract.test.ts | Date: 2026-05-30 | v1.4.0
/**
 * Contract test suite verifying Multi-Tenant Knowledge Fabric isolation.
 * Assures complete data separation across registries, graph neighborhoods, and index collections.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const entity_resolver_js_1 = require("../../src/linking/entity-resolver.js");
const graph_builder_js_1 = require("../../src/linking/graph-builder.js");
const vector_index_js_1 = require("../../src/indexer/vector-index.js");
(0, vitest_1.describe)("Multi-Tenant Knowledge Fabric Isolation Contract Tests", () => {
    (0, vitest_1.beforeEach)(() => {
        entity_resolver_js_1.entityResolver.clear("tenant_A");
        entity_resolver_js_1.entityResolver.clear("tenant_B");
        graph_builder_js_1.graphBuilder.clear("tenant_A");
        graph_builder_js_1.graphBuilder.clear("tenant_B");
    });
    (0, vitest_1.describe)("1. EntityResolver Scoping", () => {
        (0, vitest_1.it)("should keep resolved entities completely isolated between tenants", () => {
            // Resolve entity in tenant_A
            const entA = entity_resolver_js_1.entityResolver.resolve({ name: "Charles Emil Sorensen", type: "PEOPLE", context: "Denmark emigration record", confidence: 0.95 }, "tenant_A");
            // Resolve entity in tenant_B
            const entB = entity_resolver_js_1.entityResolver.resolve({ name: "Charles Emil Sorensen", type: "PEOPLE", context: "Ford motor co hiring registry", confidence: 0.90 }, "tenant_B");
            // Assure different memory records or context scopes
            (0, vitest_1.expect)(entA.id).toBe(entB.id); // Same canonical ID resolved from the same comp key hash
            const canonicalsA = entity_resolver_js_1.entityResolver.getCanonicalEntities("tenant_A");
            const canonicalsB = entity_resolver_js_1.entityResolver.getCanonicalEntities("tenant_B");
            (0, vitest_1.expect)(canonicalsA.length).toBe(1);
            (0, vitest_1.expect)(canonicalsB.length).toBe(1);
            // Enriched context under tenant_A should not bleed into tenant_B
            (0, vitest_1.expect)(canonicalsA[0].context).toContain("Denmark emigration record");
            (0, vitest_1.expect)(canonicalsB[0].context).not.toContain("Denmark emigration record");
        });
    });
    (0, vitest_1.describe)("2. GraphBuilder Scoping", () => {
        (0, vitest_1.it)("should partition document neighborhoods and traversal summaries", () => {
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
            graph_builder_js_1.graphBuilder.addDocumentGraph(docA, [], "tenant_A");
            graph_builder_js_1.graphBuilder.addDocumentGraph(docB, [], "tenant_B");
            // Verify summaries are completely separate
            const summaryA = graph_builder_js_1.graphBuilder.getSummary("tenant_A");
            const summaryB = graph_builder_js_1.graphBuilder.getSummary("tenant_B");
            (0, vitest_1.expect)(summaryA.nodes.documents).toBe(1);
            (0, vitest_1.expect)(summaryA.nodes.entities).toBe(1);
            (0, vitest_1.expect)(summaryB.nodes.documents).toBe(1);
            (0, vitest_1.expect)(summaryB.nodes.entities).toBe(1);
            // Verify neighborhoods do not bleed
            const neighA = graph_builder_js_1.graphBuilder.getEntityNeighborhood("ent_sorensen", "tenant_A");
            const neighB = graph_builder_js_1.graphBuilder.getEntityNeighborhood("ent_sorensen", "tenant_B");
            (0, vitest_1.expect)(neighA.documents.map(d => d.docId)).toContain("doc_A");
            (0, vitest_1.expect)(neighA.documents.map(d => d.docId)).not.toContain("doc_B");
            (0, vitest_1.expect)(neighB.documents.map(d => d.docId)).toContain("doc_B");
            (0, vitest_1.expect)(neighB.documents.map(d => d.docId)).not.toContain("doc_A");
        });
    });
    (0, vitest_1.describe)("3. VectorIndex Scoping", () => {
        (0, vitest_1.it)("should search and isolate hybrid text matches by tenant keyword store", async () => {
            const vectorIndex = new vector_index_js_1.VectorIndex("test_collection");
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
            (0, vitest_1.expect)(searchA.length).toBe(1);
            (0, vitest_1.expect)(searchA[0].id).toBe("doc_A");
            // searchB must NEVER return doc_A from tenant_A (proving complete isolation)
            (0, vitest_1.expect)(searchB.some(item => item.id === "doc_A")).toBe(false);
        });
    });
});
//# sourceMappingURL=tenant-isolation.contract.test.js.map