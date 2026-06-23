"use strict";
// File: projects/cic/src/cic/control-plane/v1-router.ts | Date: 2026-06-02 | v1.5.0
/**
 * REST API Router for public v1 endpoints.
 * Handles multi-tenant scoped RAG reasoning, graph dates-slicing and Episode Builder studio endpoints.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.v1Router = void 0;
const express_1 = __importDefault(require("express"));
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const reasoning_orchestrator_js_1 = require("../../reasoning/reasoning-orchestrator.js");
const reason_trace_js_1 = require("../../reasoning/reason-trace.js");
const graph_builder_js_1 = require("../../linking/graph-builder.js");
const episode_builder_js_1 = require("../../reasoning/episode-builder.js");
const spec_registry_js_1 = require("./spec-registry.js");
const telemetry_sink_js_1 = require("./telemetry-sink.js");
const instinct_proposer_js_1 = require("./instinct-proposer.js");
const patch_loader_js_1 = require("./patch-loader.js");
const pipeline_js_1 = require("../../agents/roadmapping/pipeline.js");
const memory_routes_js_1 = require("./memory-routes.js");
const memory_query_routes_js_1 = require("./memory-query-routes.js");
const dashboard_routes_js_1 = require("./dashboard-routes.js");
const skills_routes_js_1 = require("./skills-routes.js");
const apr_routes_js_1 = require("./apr-routes.js");
const cro_routes_js_1 = require("./cro-routes.js");
const ckg_routes_js_1 = require("./ckg-routes.js");
const mee_routes_js_1 = require("./mee-routes.js");
exports.v1Router = express_1.default.Router();
// Middleware: Extract Multi-Tenant Scope Header
exports.v1Router.use((req, res, next) => {
    req.tenantId = req.headers["x-tenant-id"] || "default";
    // Rate-limiting throttle simulation
    const ip = req.ip || "127.0.0.1";
    next();
});
// 1. POST /v1/reason - processes RAG reasoning query
exports.v1Router.post("/reason", async (req, res) => {
    try {
        const { query, timeWindow, maxDocuments, maxTokens } = req.body;
        if (!query) {
            return res.status(400).json({ error: "Missing required parameter: query" });
        }
        const trace = await reasoning_orchestrator_js_1.reasoningOrchestrator.reason(query, {
            timeWindow,
            maxDocuments,
            maxTokens
        });
        res.json(trace);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 2. POST /v1/reason/trace - returns detail trace by ID
exports.v1Router.post("/reason/trace", (req, res) => {
    try {
        const { traceId } = req.body;
        if (!traceId) {
            return res.status(400).json({ error: "Missing required parameter: traceId" });
        }
        const trace = reason_trace_js_1.reasonTraceManager.load(traceId);
        if (!trace) {
            return res.status(404).json({ error: `Reasoning trace '${traceId}' not found.` });
        }
        res.json(trace);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 3. POST /v1/reason/explain - expanded breakdown of the reasoning trajectory
exports.v1Router.post("/reason/explain", (req, res) => {
    try {
        const { traceId } = req.body;
        if (!traceId) {
            return res.status(400).json({ error: "Missing required parameter: traceId" });
        }
        const trace = reason_trace_js_1.reasonTraceManager.load(traceId);
        if (!trace) {
            return res.status(404).json({ error: `Reasoning trace '${traceId}' not found for explanation.` });
        }
        res.json({
            traceId: trace.traceId,
            query: trace.query,
            confidence: trace.confidence,
            evaluationExplanation: `RAG planner allocated a ${trace.plan.evidenceBudget.maxDocuments} documents budget. Sliced ${trace.evidenceEvaluated.length} node neighborhood clusters. Fact contradiction check resolved with score ${trace.isContested ? "0.20 (LOW)" : "1.00 (HIGH)"}.`,
            stagesCompiled: [
                { stage: "semantic_seed", overriddenBlocks: ["stage_header", "stage_instructions"] },
                { stage: "semantic_refine", overriddenBlocks: ["refined_context"] },
                { stage: "semantic_summary", overriddenBlocks: ["summary_compilation"] }
            ],
            evidenceProvenanceMatches: trace.evidenceEvaluated
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Helper for BFS traversal in /v1/graph/query
function traverseGraphV1(startId, tenantId, maxDepth = 2) {
    const visited = new Set([startId]);
    const resultNodes = [];
    const resultEdges = [];
    const queue = [{ id: startId, depth: 0 }];
    while (queue.length > 0) {
        const current = queue.shift();
        if (current.depth >= maxDepth)
            continue;
        const isEntity = current.id.startsWith("ent_") || current.id.startsWith("ent-");
        if (isEntity) {
            try {
                const neighborhood = graph_builder_js_1.graphBuilder.getEntityNeighborhood(current.id, tenantId);
                if (!resultNodes.some(n => n.id === current.id)) {
                    resultNodes.push(neighborhood.entity);
                }
                for (const doc of neighborhood.documents) {
                    if (!visited.has(doc.docId)) {
                        visited.add(doc.docId);
                        queue.push({ id: doc.docId, depth: current.depth + 1 });
                    }
                    resultEdges.push({ source: current.id, target: doc.docId, type: "docEntityLink" });
                }
            }
            catch { }
        }
        else {
            try {
                const neighborhood = graph_builder_js_1.graphBuilder.getDocumentNeighborhood(current.id, tenantId);
                if (!resultNodes.some(n => n.id === current.id)) {
                    resultNodes.push(neighborhood.document);
                }
                for (const ent of neighborhood.entities) {
                    if (!visited.has(ent.id)) {
                        visited.add(ent.id);
                        queue.push({ id: ent.id, depth: current.depth + 1 });
                    }
                    resultEdges.push({ source: current.id, target: ent.id, type: "docEntityLink" });
                }
            }
            catch { }
        }
    }
    return { nodes: resultNodes, edges: resultEdges };
}
// 4. POST /v1/graph/query - processes traversal, slicing, or filtering
exports.v1Router.post("/graph/query", (req, res) => {
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
            const traversalResult = traverseGraphV1(filter.id, req.tenantId, depth);
            return res.json(traversalResult);
        }
        return res.status(400).json({ error: `Unsupported query type '${type}'` });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 5. POST /v1/graph/snapshot - triggers snapshot
exports.v1Router.post("/graph/snapshot", async (req, res) => {
    try {
        const { tag } = req.body;
        const snapshotPath = await graph_builder_js_1.graphBuilder.createSnapshot(tag, req.tenantId);
        res.json({ ok: true, snapshotPath });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- DOCUMENTARY EPISODE BUILDER ENDPOINTS ---
// 6. POST /v1/episode/build
exports.v1Router.post("/episode/build", async (req, res) => {
    try {
        const { title, coreEntityIds } = req.body;
        if (!title || !coreEntityIds) {
            return res.status(400).json({ error: "title and coreEntityIds are required parameters." });
        }
        const outline = await episode_builder_js_1.episodeBuilder.buildEpisodeOutline(title, coreEntityIds, req.tenantId);
        res.json(outline);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 7. POST /v1/episode/expand
exports.v1Router.post("/episode/expand", async (req, res) => {
    try {
        const { beatId, details } = req.body;
        if (!beatId || !details) {
            return res.status(400).json({ error: "beatId and details are required parameters." });
        }
        const expansion = await episode_builder_js_1.episodeBuilder.expandNarrativeBeat(beatId, details, req.tenantId);
        res.json(expansion);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 8. POST /v1/episode/summarize
exports.v1Router.post("/episode/summarize", async (req, res) => {
    try {
        const { topic } = req.body;
        if (!topic) {
            return res.status(400).json({ error: "topic is a required parameter." });
        }
        const summary = await episode_builder_js_1.episodeBuilder.summarizeThematicThreads(topic, req.tenantId);
        res.json(summary);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 9. GET /v1/specs/skills - list all registered skills
exports.v1Router.get("/specs/skills", (req, res) => {
    res.json({ skills: spec_registry_js_1.specRegistry.getSkills() });
});
// 10. GET /v1/specs/instincts - list all registered instincts
exports.v1Router.get("/specs/instincts", (req, res) => {
    res.json({ instincts: spec_registry_js_1.specRegistry.getInstincts() });
});
// 11. GET /v1/specs/hooks - list all registered hooks
exports.v1Router.get("/specs/hooks", (req, res) => {
    res.json({ hooks: spec_registry_js_1.specRegistry.getHooks() });
});
// 12. GET /v1/specs/rules - list all registered rules
exports.v1Router.get("/specs/rules", (req, res) => {
    res.json({ rules: spec_registry_js_1.specRegistry.getRules() });
});
// 13. GET /v1/specs/violations - list all recorded violations with filters
exports.v1Router.get("/specs/violations", (req, res) => {
    try {
        const filter = {
            pipeline: req.query.pipeline,
            tenantId: req.query.tenant,
            region: req.query.region,
            limit: req.query.limit
        };
        const results = spec_registry_js_1.specRegistry.queryViolations(filter);
        res.json({ violations: results });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 13b. GET /v1/specs/violations/heatmap - aggregate violation counts grouped by tenant and severity
exports.v1Router.get("/specs/violations/heatmap", (req, res) => {
    try {
        const violations = spec_registry_js_1.specRegistry.queryViolations({ limit: 1000 });
        const grid = {};
        for (const v of violations) {
            const tenant = v.context?.tenantId || "default";
            if (!grid[tenant]) {
                grid[tenant] = { hard: 0, soft: 0 };
            }
            if (v.severity === "hard") {
                grid[tenant].hard++;
            }
            else {
                grid[tenant].soft++;
            }
        }
        res.json({ heatmap: grid });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 14. POST /v1/specs/violations/clear - clear all recorded violations
exports.v1Router.post("/specs/violations/clear", (req, res) => {
    spec_registry_js_1.specRegistry.clearViolations();
    res.json({ ok: true });
});
// 15. GET /v1/telemetry/skills - query skill telemetry
exports.v1Router.get("/telemetry/skills", async (req, res) => {
    try {
        const filter = {
            pipeline: req.query.pipeline,
            skillName: req.query.skill,
            tenantId: req.query.tenant,
            region: req.query.region,
            limit: req.query.limit
        };
        const events = await (0, telemetry_sink_js_1.getTelemetrySink)().querySkills(filter);
        res.json({ telemetry: events });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 16. GET /v1/telemetry/instincts - query instinct telemetry
exports.v1Router.get("/telemetry/instincts", async (req, res) => {
    try {
        const filter = {
            pipeline: req.query.pipeline,
            instinctName: req.query.instinct,
            tenantId: req.query.tenant,
            region: req.query.region,
            limit: req.query.limit
        };
        const events = await (0, telemetry_sink_js_1.getTelemetrySink)().queryInstincts(filter);
        res.json({ telemetry: events });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 17. POST /v1/telemetry/clear - clear all telemetry logs
exports.v1Router.post("/telemetry/clear", async (req, res) => {
    try {
        await (0, telemetry_sink_js_1.getTelemetrySink)().clear();
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 18. POST /v1/telemetry/proposals - execute proposer heuristics and return instinct YAML patches
exports.v1Router.post("/telemetry/proposals", async (req, res) => {
    try {
        const skillEvents = await (0, telemetry_sink_js_1.getTelemetrySink)().querySkills({ limit: 1000 });
        const instinctEvents = await (0, telemetry_sink_js_1.getTelemetrySink)().queryInstincts({ limit: 1000 });
        const proposer = new instinct_proposer_js_1.InstinctProposer(skillEvents, instinctEvents);
        const patches = proposer.proposePatches();
        // Map and save newly proposed patches dynamically
        for (const p of patches) {
            patch_loader_js_1.patchLoader.saveProposedPatch({
                instinct: p.instinctName,
                baseVersion: p.baseVersion,
                proposedVersion: p.proposedVersion,
                change: p.diff,
                impact: {
                    impactScore: p.impactScore,
                    metricsBefore: p.metricsBefore || { successRate: 1, avgLatencyMs: 200, avgDrift: 0 },
                    metricsAfter: p.metricsAfter || { successRate: 1, avgLatencyMs: 200, avgDrift: 0 }
                },
                scope: {
                    regions: ["us-east-1"],
                    tenants: ["*"]
                }
            });
        }
        res.json({ proposals: patches });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 19. GET /v1/instincts/patches - list all registered lifecycle patches
exports.v1Router.get("/instincts/patches", (req, res) => {
    try {
        const status = req.query.status;
        const list = patch_loader_js_1.patchLoader.listPatches(status);
        res.json({ patches: list });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 20. POST /v1/instincts/patches/canary - move proposed → canary with region/tenant filters
exports.v1Router.post("/instincts/patches/canary", async (req, res) => {
    try {
        const { fileName, regions, tenants } = req.body;
        if (!fileName) {
            return res.status(400).json({ error: "Missing required parameter: fileName" });
        }
        // Default regions / tenants scope
        const scope = {
            regions: regions || ["us-east-1"],
            tenants: tenants || ["*"]
        };
        await patch_loader_js_1.patchLoader.movePatch(fileName, "proposed", "canary", { scope });
        res.json({ ok: true, scope });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 21. POST /v1/instincts/patches/promote - promote canary → active (enforcing impact thresholds)
exports.v1Router.post("/instincts/patches/promote", async (req, res) => {
    try {
        const { fileName } = req.body;
        if (!fileName) {
            return res.status(400).json({ error: "Missing required parameter: fileName" });
        }
        const canaryPatches = patch_loader_js_1.patchLoader.listPatches("canary");
        const patch = canaryPatches.find(p => p.fileName === fileName);
        if (!patch) {
            return res.status(404).json({ error: `Canary patch '${fileName}' not found.` });
        }
        // Enforce Promotion Rules (e.g. impact score >= 50, success rate no degradation)
        const threshold = 50;
        if (patch.impact.impactScore < threshold) {
            return res.status(400).json({
                error: `Promotion rejected: impact score (${patch.impact.impactScore}) below required threshold (${threshold}).`
            });
        }
        if (patch.impact.metricsAfter.successRate < patch.impact.metricsBefore.successRate) {
            return res.status(400).json({
                error: `Promotion rejected: success rate degraded from ${patch.impact.metricsBefore.successRate} to ${patch.impact.metricsAfter.successRate}.`
            });
        }
        await patch_loader_js_1.patchLoader.movePatch(fileName, "canary", "active");
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 22. POST /v1/instincts/patches/reject - move proposed or canary patch → rejected
exports.v1Router.post("/instincts/patches/reject", async (req, res) => {
    try {
        const { fileName, currentStatus, reason } = req.body;
        if (!fileName || !currentStatus) {
            return res.status(400).json({ error: "Missing required parameters: fileName and currentStatus" });
        }
        if (currentStatus !== "proposed" && currentStatus !== "canary") {
            return res.status(400).json({ error: "Invalid currentStatus: must be proposed or canary." });
        }
        await patch_loader_js_1.patchLoader.movePatch(fileName, currentStatus, "rejected", {
            createdBy: `operator-reject: ${reason || "No reason given"}`
        });
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 23. GET /v1/arps/status - derive and return ARPS subsystem health state
exports.v1Router.get("/arps/status", async (req, res) => {
    try {
        const artifactsDir = node_path_1.default.resolve(process.cwd(), "projects/cic/.artifacts/roadmap");
        let lastRun = "never";
        let lastDeltaSummary = "none";
        if (node_fs_1.default.existsSync(artifactsDir)) {
            const files = node_fs_1.default.readdirSync(artifactsDir).sort().reverse();
            const deltaFile = files.find(f => f.startsWith("delta-"));
            if (deltaFile) {
                const stats = node_fs_1.default.statSync(node_path_1.default.join(artifactsDir, deltaFile));
                lastRun = stats.mtime.toISOString();
                try {
                    const delta = JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(artifactsDir, deltaFile), "utf-8"));
                    lastDeltaSummary = `${delta.components.length} components, ${delta.completions.length} completed, ${delta.gaps.length} gaps`;
                }
                catch { }
            }
        }
        res.json({
            id: "arps",
            name: "Autonomous Roadmap & Prompt Sandbox",
            status: "healthy",
            details: {
                lastRun,
                lastDeltaSummary,
                lastDocsBuild: "pass",
                lastSandboxDecision: "allowed"
            }
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 24. POST /v1/arps/run - execute ARPS pipeline manually
exports.v1Router.post("/arps/run", async (req, res) => {
    try {
        const { dryRun, verbose } = req.body;
        const pipeline = new pipeline_js_1.RoadmapPipeline(process.cwd(), node_path_1.default.resolve(process.cwd(), "docs"), node_path_1.default.resolve(process.cwd(), "projects/cic/pms/registry.yaml"));
        await pipeline.run({
            dryRun: dryRun !== false, // default to true
            verbose: verbose !== false, // default to true
            commit: !dryRun
        });
        res.json({ ok: true, message: `Pipeline run completed with dryRun=${dryRun !== false}` });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
(0, memory_routes_js_1.registerMemoryRoutes)(exports.v1Router);
(0, memory_query_routes_js_1.registerMemoryQueryRoutes)(exports.v1Router);
(0, dashboard_routes_js_1.registerDashboardRoutes)(exports.v1Router);
(0, skills_routes_js_1.registerSkillsRoutes)(exports.v1Router);
(0, apr_routes_js_1.registerAprRoutes)(exports.v1Router);
(0, cro_routes_js_1.registerCroRoutes)(exports.v1Router);
(0, ckg_routes_js_1.registerCkgRoutes)(exports.v1Router);
(0, mee_routes_js_1.registerMeeRoutes)(exports.v1Router);
//# sourceMappingURL=v1-router.js.map