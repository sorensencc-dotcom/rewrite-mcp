"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const harvester_js_1 = require("../../../src/harvester/harvester.js");
const qdrant_mock_js_1 = require("../../../src/indexer/qdrant-mock.js");
const index_js_1 = require("../../../src/cic/control-plane/index.js");
const vector_index_js_1 = require("../../../src/indexer/vector-index.js");
const entity_resolver_js_1 = require("../../../src/linking/entity-resolver.js");
const graph_builder_js_1 = require("../../../src/linking/graph-builder.js");
(0, vitest_1.describe)("Cross-Document Linking - Hybrid Integration Tests (Mode B)", () => {
    (0, vitest_1.beforeEach)(() => {
        qdrant_mock_js_1.qdrantMock.reset();
        entity_resolver_js_1.entityResolver.clear();
        graph_builder_js_1.graphBuilder.clear();
    });
    (0, vitest_1.it)("should process multiple documents, resolve entities, compute cross-document links, enrich index payloads, and build the graph", async () => {
        const harvester = new harvester_js_1.Harvester();
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
        (0, vitest_1.expect)(result1.type).toBe("semantic_ingestion");
        (0, vitest_1.expect)(result1.docId).toBe("doc-hybrid-1");
        (0, vitest_1.expect)(result1.entity_ids).toHaveLength(result1.entities.length);
        (0, vitest_1.expect)(result1.link_count).toBe(0); // No other documents yet
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
        (0, vitest_1.expect)(result2.type).toBe("semantic_ingestion");
        (0, vitest_1.expect)(result2.docId).toBe("doc-hybrid-2");
        // Charles Sorensen should be mapped to the same ID!
        const charId1 = result1.entities.find((e) => e.name.includes("Sorensen") || e.name.includes("Charles"))?.id;
        const charId2 = result2.entities.find((e) => e.name.includes("Sorensen") || e.name.includes("Charles"))?.id;
        (0, vitest_1.expect)(charId1).toBeDefined();
        (0, vitest_1.expect)(charId1).toBe(charId2);
        // Should have established cross-document links: same_entity ("Charles") and related_topic ("Early Life")
        (0, vitest_1.expect)(result2.link_count).toBeGreaterThanOrEqual(1);
        // 3. Verify downstream payload enrichment in the index
        const index = new vector_index_js_1.VectorIndex();
        const searchResult = await index.searchSemantic("Charles Sorensen", 2);
        (0, vitest_1.expect)(searchResult.length).toBeGreaterThan(0);
        const doc2IndexNode = searchResult.find(r => r.id === "doc-hybrid-2");
        (0, vitest_1.expect)(doc2IndexNode).toBeDefined();
        (0, vitest_1.expect)(doc2IndexNode.payload.entity_ids).toContain(charId1);
        (0, vitest_1.expect)(doc2IndexNode.payload.link_count).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(doc2IndexNode.payload.primary_topics).toContain("Early Life");
    });
    (0, vitest_1.describe)("Control Plane Route Handler Verification", () => {
        let harvester;
        let charId;
        (0, vitest_1.beforeEach)(async () => {
            harvester = new harvester_js_1.Harvester();
            const r1 = await harvester.run({
                type: "semantic",
                payload: { docId: "doc-c1", raw: "Sorensen, Charles Emil was born in Lellinge. Early Life." }
            });
            const r2 = await harvester.run({
                type: "semantic",
                payload: { docId: "doc-c2", raw: "Charles Emil Sorensen worked at Ford. Early Life." }
            });
            charId = r1.entities.find((e) => e.name.includes("Sorensen"))?.id || "";
        });
        const constructMockResponse = () => {
            let jsonPayload = null;
            let statusValue = 200;
            return {
                res: {
                    status(code) {
                        statusValue = code;
                        return this;
                    },
                    json(data) {
                        jsonPayload = data;
                        return this;
                    }
                },
                getPayload: () => jsonPayload,
                getStatus: () => statusValue
            };
        };
        (0, vitest_1.it)("GET /graph/summary should return node and edge counts", async () => {
            const handlers = (index_js_1.router.stack.find(s => s.route?.path === "/graph/summary")?.route?.stack || []);
            const handler = handlers[0]?.handle;
            (0, vitest_1.expect)(handler).toBeDefined();
            const mock = constructMockResponse();
            await handler({}, mock.res, () => { });
            (0, vitest_1.expect)(mock.getStatus()).toBe(200);
            const summary = mock.getPayload();
            (0, vitest_1.expect)(summary.nodes.documents).toBe(2);
            (0, vitest_1.expect)(summary.nodes.entities).toBeGreaterThan(0);
            (0, vitest_1.expect)(summary.edges.crossDocLinks).toBeGreaterThan(0);
            (0, vitest_1.expect)(summary.health.status).toBe("green");
        });
        (0, vitest_1.it)("GET /graph/entity/:id should return neighborhood for valid entity", async () => {
            const handlers = (index_js_1.router.stack.find(s => s.route?.path === "/graph/entity/:id")?.route?.stack || []);
            const handler = handlers[0]?.handle;
            (0, vitest_1.expect)(handler).toBeDefined();
            const mock = constructMockResponse();
            await handler({ params: { id: charId } }, mock.res, () => { });
            (0, vitest_1.expect)(mock.getStatus()).toBe(200);
            const neighborhood = mock.getPayload();
            (0, vitest_1.expect)(neighborhood.entity.name).toBe("Sorensen, Charles Emil");
            (0, vitest_1.expect)(neighborhood.documents).toHaveLength(2);
            (0, vitest_1.expect)(neighborhood.relationships.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)("GET /graph/entity/:id should return 404 for unknown entity ID", async () => {
            const handlers = (index_js_1.router.stack.find(s => s.route?.path === "/graph/entity/:id")?.route?.stack || []);
            const handler = handlers[0]?.handle;
            const mock = constructMockResponse();
            await handler({ params: { id: "ent-unknown-999" } }, mock.res, () => { });
            (0, vitest_1.expect)(mock.getStatus()).toBe(404);
            (0, vitest_1.expect)(mock.getPayload().error).toContain("not found");
        });
        (0, vitest_1.it)("GET /graph/document/:id should return neighborhood for valid document ID", async () => {
            const handlers = (index_js_1.router.stack.find(s => s.route?.path === "/graph/document/:id")?.route?.stack || []);
            const handler = handlers[0]?.handle;
            (0, vitest_1.expect)(handler).toBeDefined();
            const mock = constructMockResponse();
            await handler({ params: { id: "doc-c1" } }, mock.res, () => { });
            (0, vitest_1.expect)(mock.getStatus()).toBe(200);
            const neighborhood = mock.getPayload();
            (0, vitest_1.expect)(neighborhood.document.docId).toBe("doc-c1");
            (0, vitest_1.expect)(neighborhood.entities.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(neighborhood.relatedDocuments.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)("GET /graph/document/:id should return 404 for unknown document ID", async () => {
            const handlers = (index_js_1.router.stack.find(s => s.route?.path === "/graph/document/:id")?.route?.stack || []);
            const handler = handlers[0]?.handle;
            const mock = constructMockResponse();
            await handler({ params: { id: "doc-unknown-999" } }, mock.res, () => { });
            (0, vitest_1.expect)(mock.getStatus()).toBe(404);
            (0, vitest_1.expect)(mock.getPayload().error).toContain("not found");
        });
    });
});
//# sourceMappingURL=linking-v2.hybrid.test.js.map