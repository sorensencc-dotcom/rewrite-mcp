"use strict";
// File: projects/cic/src/cic/control-plane/index.ts | Date: 2026-05-30 | v1.4.0
/**
 * TS Express router for the CIC control plane interface.
 * Mounts metrics collectors, vector indexers, graph persistences, and v1 public studio APIs.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = __importDefault(require("express"));
const pms_template_registry_js_1 = require("../../pms/pms.template-registry.js");
const orchestrator_js_1 = require("../../rtk/automation/orchestrator.js");
const vector_index_js_1 = require("../../indexer/vector-index.js");
const graph_builder_js_1 = require("../../linking/graph-builder.js");
const entity_resolver_js_1 = require("../../linking/entity-resolver.js");
const composer_js_1 = require("../../pms/v2/composer.js");
const reasoning_orchestrator_js_1 = require("../../reasoning/reasoning-orchestrator.js");
const reason_trace_js_1 = require("../../reasoning/reason-trace.js");
const metrics_router_js_1 = require("../../reasoning/metrics-router.js");
const v1_router_js_1 = require("./v1-router.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const snapshotDir = path_1.default.resolve(__dirname, "../../data/snapshots");
const traceDir = path_1.default.resolve(__dirname, "../../data/traces");
exports.router = express_1.default.Router();
const pmsRegistry = new pms_template_registry_js_1.PMSTemplateRegistry();
pmsRegistry.load();
// Middleware: Tenant Extraction Middleware
exports.router.use((req, res, next) => {
    req.tenantId = req.headers["x-tenant-id"] || "default";
    next();
});
// Mount Telemetry Metrics
exports.router.use("/metrics", metrics_router_js_1.metricsRouter);
// Mount public documented v1 endpoints
exports.router.use("/v1", v1_router_js_1.v1Router);
const vectorIndex = new vector_index_js_1.VectorIndex();
exports.router.get("/pms/templates", (req, res) => {
    const templates = [...pmsRegistry["templates"].values()];
    res.json({ templates });
});
exports.router.post("/pms/resolve", async (req, res) => {
    try {
        const { templateId, vars } = req.body;
        if (!templateId) {
            return res.status(400).json({ error: "Missing required parameter: templateId" });
        }
        const resolved = await composer_js_1.pmsComposer.resolve(templateId, vars || {});
        res.json(resolved);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.router.get("/rtk/automation/state", (req, res) => {
    res.json(orchestrator_js_1.orchestrator.getStateTracker().getState());
});
exports.router.get("/index/health", async (req, res) => {
    try {
        const health = await vectorIndex.getHealth(req.tenantId);
        res.json({ health });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.router.post("/index/search", async (req, res) => {
    try {
        const { query, limit, top_k } = req.body;
        if (!query) {
            return res.status(400).json({ error: "Missing required parameter: query" });
        }
        const finalLimit = top_k !== undefined ? Number(top_k) : (limit !== undefined ? Number(limit) : undefined);
        const results = await vectorIndex.searchSemantic(query, finalLimit, req.tenantId);
        res.json({ results });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.router.get("/graph/entity/:id", (req, res) => {
    try {
        const { id } = req.params;
        const neighborhood = graph_builder_js_1.graphBuilder.getEntityNeighborhood(id, req.tenantId);
        res.json(neighborhood);
    }
    catch (err) {
        if (err.message.includes("not found")) {
            res.status(404).json({ error: err.message });
        }
        else {
            res.status(500).json({ error: err.message });
        }
    }
});
exports.router.get("/graph/document/:id", (req, res) => {
    try {
        const { id } = req.params;
        const neighborhood = graph_builder_js_1.graphBuilder.getDocumentNeighborhood(id, req.tenantId);
        res.json(neighborhood);
    }
    catch (err) {
        if (err.message.includes("not found")) {
            res.status(404).json({ error: err.message });
        }
        else {
            res.status(500).json({ error: err.message });
        }
    }
});
exports.router.get("/graph/summary", (req, res) => {
    try {
        const summary = graph_builder_js_1.graphBuilder.getSummary(req.tenantId);
        res.json(summary);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Helper function for GraphQL-style BFS traversal
function traverseGraph(startId, tenantId, maxDepth = 2, edgeTypes) {
    const visited = new Set([startId]);
    const resultNodes = [];
    const resultEdges = [];
    let queue = [{ id: startId, depth: 0 }];
    while (queue.length > 0) {
        const current = queue.shift();
        if (current.depth >= maxDepth)
            continue;
        // Is it an entity or document?
        const isEntity = current.id.startsWith("ent_") || current.id.startsWith("ent-");
        if (isEntity) {
            try {
                const neighborhood = graph_builder_js_1.graphBuilder.getEntityNeighborhood(current.id, tenantId);
                // Add start node metadata if depth is 0
                if (!resultNodes.some(n => n.id === current.id)) {
                    resultNodes.push(neighborhood.entity);
                }
                // Check documents
                for (const doc of neighborhood.documents) {
                    if (edgeTypes && !edgeTypes.includes("docEntityLink"))
                        continue;
                    if (!visited.has(doc.docId)) {
                        visited.add(doc.docId);
                        queue.push({ id: doc.docId, depth: current.depth + 1 });
                    }
                    resultEdges.push({
                        id: `${current.id}->${doc.docId}`,
                        source: current.id,
                        target: doc.docId,
                        type: "docEntityLink"
                    });
                }
                // Check relationships
                for (const rel of neighborhood.relationships) {
                    if (edgeTypes && !edgeTypes.includes(rel.predicate))
                        continue;
                    if (!visited.has(rel.targetEntityId)) {
                        visited.add(rel.targetEntityId);
                        queue.push({ id: rel.targetEntityId, depth: current.depth + 1 });
                    }
                    resultEdges.push({
                        id: `${current.id}->${rel.targetEntityId}:${rel.predicate}`,
                        source: current.id,
                        target: rel.targetEntityId,
                        type: rel.predicate,
                        details: rel.details,
                        confidence: rel.confidence
                    });
                }
            }
            catch {
                // Ignored
            }
        }
        else {
            // It is a document
            try {
                const neighborhood = graph_builder_js_1.graphBuilder.getDocumentNeighborhood(current.id, tenantId);
                if (!resultNodes.some(n => n.id === current.id)) {
                    resultNodes.push(neighborhood.document);
                }
                // Check entities in this document
                for (const ent of neighborhood.entities) {
                    if (edgeTypes && !edgeTypes.includes("docEntityLink"))
                        continue;
                    if (!visited.has(ent.id)) {
                        visited.add(ent.id);
                        queue.push({ id: ent.id, depth: current.depth + 1 });
                    }
                    resultEdges.push({
                        id: `${current.id}->${ent.id}`,
                        source: current.id,
                        target: ent.id,
                        type: "docEntityLink"
                    });
                }
                // Check related documents
                for (const relDoc of neighborhood.relatedDocuments) {
                    if (edgeTypes && !edgeTypes.includes(relDoc.type))
                        continue;
                    if (!visited.has(relDoc.docId)) {
                        visited.add(relDoc.docId);
                        queue.push({ id: relDoc.docId, depth: current.depth + 1 });
                    }
                    resultEdges.push({
                        id: `${current.id}->${relDoc.docId}:${relDoc.type}`,
                        source: current.id,
                        target: relDoc.docId,
                        type: relDoc.type,
                        details: relDoc.details,
                        confidence: relDoc.confidence
                    });
                }
            }
            catch {
                // Ignored
            }
        }
    }
    return { nodes: resultNodes, edges: resultEdges };
}
// POST /graph/query endpoint for GraphQL-style traversal, filtering and temporal slicing
exports.router.post("/graph/query", (req, res) => {
    try {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ error: "Missing query payload" });
        }
        const { type, filter, traverse } = query;
        if (type === "slice") {
            if (!filter || !filter.timestamp) {
                return res.status(400).json({ error: "Missing required parameter filter.timestamp for slice query" });
            }
            const sliceResult = graph_builder_js_1.graphBuilder.sliceAtDate(filter.timestamp, req.tenantId);
            return res.json({ slice: sliceResult });
        }
        if (type === "traversal") {
            if (!filter || !filter.id) {
                return res.status(400).json({ error: "Missing required parameter filter.id for traversal query" });
            }
            const depth = traverse?.depth !== undefined ? Number(traverse.depth) : 2;
            const edgeTypes = traverse?.edgeTypes;
            const traversalResult = traverseGraph(filter.id, req.tenantId, depth, edgeTypes);
            return res.json(traversalResult);
        }
        return res.status(400).json({ error: `Unsupported query type '${type}'` });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /graph/snapshot for manual snapshot triggers
exports.router.post("/graph/snapshot", async (req, res) => {
    try {
        const { tag } = req.body;
        const snapshotPath = await graph_builder_js_1.graphBuilder.createSnapshot(tag, req.tenantId);
        res.json({ ok: true, snapshotPath: path_1.default.basename(snapshotPath) });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /graph/snapshot/list for getting a list of saved snapshots
exports.router.get("/graph/snapshot/list", (req, res) => {
    try {
        const targetDir = req.tenantId === "default"
            ? snapshotDir
            : path_1.default.resolve(__dirname, `../../data/tenants/${req.tenantId}/snapshots`);
        if (fs_1.default.existsSync(targetDir)) {
            const files = fs_1.default.readdirSync(targetDir).filter(f => f.endsWith(".json"));
            res.json({ snapshots: files });
        }
        else {
            res.json({ snapshots: [] });
        }
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- RAG PERSISTENCE EXTENSIONS ---
// POST /graph/persist/flush: Flushes memory caches to files
exports.router.post("/graph/persist/flush", (req, res) => {
    try {
        entity_resolver_js_1.entityResolver.save(undefined, req.tenantId);
        graph_builder_js_1.graphBuilder.save(undefined, req.tenantId);
        res.json({ ok: true, message: "Persisted state flushed atomically to disk." });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /graph/persist/stats: Retrieves persist sizing and stats
exports.router.get("/graph/persist/stats", (req, res) => {
    try {
        const summary = graph_builder_js_1.graphBuilder.getSummary(req.tenantId);
        const entityCount = entity_resolver_js_1.entityResolver.getCanonicalEntities(req.tenantId).length;
        const targetSnapshotDir = req.tenantId === "default"
            ? snapshotDir
            : path_1.default.resolve(__dirname, `../../data/tenants/${req.tenantId}/snapshots`);
        const snapshotCount = fs_1.default.existsSync(targetSnapshotDir) ? fs_1.default.readdirSync(targetSnapshotDir).filter(f => f.endsWith(".json")).length : 0;
        const traceCount = fs_1.default.existsSync(traceDir) ? fs_1.default.readdirSync(traceDir).filter(f => f.endsWith(".json")).length : 0;
        res.json({
            entity_registry_size: entityCount,
            relationship_count: summary.edges.entityRelationships,
            cross_doc_link_count: summary.edges.crossDocLinks,
            document_count: summary.nodes.documents,
            snapshot_count: snapshotCount,
            trace_count: traceCount
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /graph/persist/snapshot: Directly trigger a persist snapshot
exports.router.post("/graph/persist/snapshot", async (req, res) => {
    try {
        const { tag } = req.body;
        const snapshotPath = await graph_builder_js_1.graphBuilder.createSnapshot(tag, req.tenantId);
        res.json({ ok: true, snapshotPath: path_1.default.basename(snapshotPath) });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- RETRIEVAL-AUGMENTED REASONING ENDPOINTS ---
// POST /reason/query: Triggers multi-hop RAG loops and returns trace
exports.router.post("/reason/query", async (req, res) => {
    try {
        const { query, timeWindow, maxDocuments, maxTokens } = req.body;
        if (!query) {
            return res.status(400).json({ error: "Missing required parameter: query" });
        }
        const trace = await reasoning_orchestrator_js_1.reasoningOrchestrator.reason(query, { timeWindow, maxDocuments, maxTokens });
        res.json(trace);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /reason/trace/:id: Fetches full audit trace by ID
exports.router.get("/reason/trace/:id", (req, res) => {
    try {
        const { id } = req.params;
        const trace = reason_trace_js_1.reasonTraceManager.load(id);
        if (!trace) {
            return res.status(404).json({ error: `Reasoning trace '${id}' not found.` });
        }
        res.json(trace);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /reason/replay: Re-runs planning/evaluation with original constraints
exports.router.post("/reason/replay", async (req, res) => {
    try {
        const { traceId, maxDocuments, maxTokens } = req.body;
        if (!traceId) {
            return res.status(400).json({ error: "Missing required parameter: traceId" });
        }
        const originalTrace = reason_trace_js_1.reasonTraceManager.load(traceId);
        if (!originalTrace) {
            return res.status(404).json({ error: `Original trace '${traceId}' not found for replay.` });
        }
        const limit = maxDocuments !== undefined ? maxDocuments : originalTrace.plan.evidenceBudget.maxDocuments;
        const tokens = maxTokens !== undefined ? maxTokens : originalTrace.plan.evidenceBudget.maxTokens;
        const replayedTrace = await reasoning_orchestrator_js_1.reasoningOrchestrator.reason(originalTrace.query, {
            timeWindow: originalTrace.plan.temporalSlice,
            maxDocuments: limit,
            maxTokens: tokens
        });
        res.json({ ok: true, replayedTrace });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
//# sourceMappingURL=index.js.map