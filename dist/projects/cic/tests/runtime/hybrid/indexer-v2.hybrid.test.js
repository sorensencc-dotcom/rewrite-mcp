"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const express_1 = __importDefault(require("express"));
const harvester_js_1 = require("../../../src/harvester/harvester.js");
const qdrant_mock_js_1 = require("../../../src/indexer/qdrant-mock.js");
const index_js_1 = require("../../../src/cic/control-plane/index.js");
const vector_index_js_1 = require("../../../src/indexer/vector-index.js");
(0, vitest_1.describe)("Semantic Indexer v2 - Hybrid Integration Tests (Mode B)", () => {
    (0, vitest_1.beforeEach)(() => {
        qdrant_mock_js_1.qdrantMock.reset();
    });
    (0, vitest_1.it)("should process a full end-to-end semantic ingestion job via the Harvester", async () => {
        const harvester = new harvester_js_1.Harvester();
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
        (0, vitest_1.expect)(result.type).toBe("semantic_ingestion");
        (0, vitest_1.expect)(result.chain_execution).toBe("completed");
        (0, vitest_1.expect)(result.index_status).toBe("synced");
        (0, vitest_1.expect)(result.docId).toBe("doc-hybrid-999");
        // 2. Verify extracted semantic payload properties are propagated
        (0, vitest_1.expect)(result.entities).toBeInstanceOf(Array);
        (0, vitest_1.expect)(result.entities.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.entities[0]).toMatchObject({
            name: "Sorensen, Charles Emil",
            type: "PEOPLE"
        });
        (0, vitest_1.expect)(result.relationships).toBeInstanceOf(Array);
        (0, vitest_1.expect)(result.relationships.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.relationships[0]).toMatchObject({
            subject: "Sorensen, Charles Emil",
            object: "Lellinge",
            predicate: "born_in"
        });
        (0, vitest_1.expect)(result.topics).toContain("Early Life");
        // 3. Verify downstream persistence in QdrantMock collection
        const health = await qdrant_mock_js_1.qdrantMock.getHealth("cic_semantic");
        (0, vitest_1.expect)(health.status).toBe("green");
        (0, vitest_1.expect)(health.vectors).toBe(1);
        (0, vitest_1.expect)(health.last_upsert).toBeDefined();
    });
    (0, vitest_1.describe)("Control Plane Route Handler Verification", () => {
        // We mount our control plane router to a test express app to verify HTTP status & payload mappings
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use("/", index_js_1.router);
        (0, vitest_1.it)("GET /index/health should return correct index health status", async () => {
            // Index a mock document to seed health state
            const index = new vector_index_js_1.VectorIndex();
            await index.upsert({
                docId: "seeded-doc",
                rawText: "Seeded test payload for control plane diagnostics"
            });
            // Construct a mock response helper
            let jsonPayload = null;
            let statusValue = 200;
            const mockRes = {
                status(code) {
                    statusValue = code;
                    return this;
                },
                json(data) {
                    jsonPayload = data;
                    return this;
                }
            };
            // Direct router invocation for GET /index/health
            const handlers = (index_js_1.router.stack.find(s => s.route?.path === "/index/health")?.route?.stack || []);
            const getHealthHandler = handlers[0]?.handle;
            (0, vitest_1.expect)(getHealthHandler).toBeDefined();
            await getHealthHandler({}, mockRes, () => { });
            (0, vitest_1.expect)(statusValue).toBe(200);
            (0, vitest_1.expect)(jsonPayload).toHaveProperty("health");
            (0, vitest_1.expect)(jsonPayload.health.status).toBe("green");
            (0, vitest_1.expect)(jsonPayload.health.vectors).toBe(1);
            (0, vitest_1.expect)(jsonPayload.health.collection).toBe("cic_semantic");
        });
        (0, vitest_1.it)("POST /index/search should execute and return structured hybrid results", async () => {
            // Seed the vector index with unique substring keyword and semantic context
            const index = new vector_index_js_1.VectorIndex();
            await index.upsert({
                docId: "doc-match-1",
                rawText: "Danish origins of Charles Emil Sorensen"
            });
            let jsonPayload = null;
            let statusValue = 200;
            const mockRes = {
                status(code) {
                    statusValue = code;
                    return this;
                },
                json(data) {
                    jsonPayload = data;
                    return this;
                }
            };
            // Retrieve POST /index/search router handler
            const searchHandlers = (index_js_1.router.stack.find(s => s.route?.path === "/index/search")?.route?.stack || []);
            const postSearchHandler = searchHandlers[0]?.handle;
            (0, vitest_1.expect)(postSearchHandler).toBeDefined();
            // Trigger standard query
            await postSearchHandler({
                body: { query: "Danish origins", limit: 2 }
            }, mockRes, () => { });
            (0, vitest_1.expect)(statusValue).toBe(200);
            (0, vitest_1.expect)(jsonPayload).toHaveProperty("results");
            (0, vitest_1.expect)(jsonPayload.results).toBeInstanceOf(Array);
            (0, vitest_1.expect)(jsonPayload.results.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(jsonPayload.results[0].id).toBe("doc-match-1");
            (0, vitest_1.expect)(jsonPayload.results[0]).toHaveProperty("rrf_score");
            // Verify top_k parameter support
            let topKPayload = null;
            const mockTopKRes = {
                status(code) { return this; },
                json(data) {
                    topKPayload = data;
                    return this;
                }
            };
            await postSearchHandler({
                body: { query: "Danish origins", top_k: 1 }
            }, mockTopKRes, () => { });
            (0, vitest_1.expect)(topKPayload).toHaveProperty("results");
            (0, vitest_1.expect)(topKPayload.results.length).toBe(1);
            // Verify validation boundaries: Missing Query
            let errPayload = null;
            let errStatus = 200;
            const mockErrRes = {
                status(code) {
                    errStatus = code;
                    return this;
                },
                json(data) {
                    errPayload = data;
                    return this;
                }
            };
            await postSearchHandler({
                body: {}
            }, mockErrRes, () => { });
            (0, vitest_1.expect)(errStatus).toBe(400);
            (0, vitest_1.expect)(errPayload).toHaveProperty("error", "Missing required parameter: query");
        });
    });
});
//# sourceMappingURL=indexer-v2.hybrid.test.js.map