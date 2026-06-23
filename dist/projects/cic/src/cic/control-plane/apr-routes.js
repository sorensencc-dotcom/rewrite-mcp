"use strict";
// File: projects/cic/src/cic/control-plane/apr-routes.ts | Date: 2026-06-03 | v1.0.0
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAprRoutes = registerAprRoutes;
const autonomous_planner_js_1 = require("../../apr/autonomous-planner.js");
const multi_agent_coordinator_js_1 = require("../../apr/multi-agent-coordinator.js");
const task_allocator_js_1 = require("../../apr/task-allocator.js");
const skill_graph_store_js_1 = require("../../skills/skill-graph-store.js");
const memory_substrate_1 = require("../../../memory/memory-substrate");
const apr_memory_integration_js_1 = require("./apr-memory-integration.js");
const path = __importStar(require("path"));
function registerAprRoutes(router) {
    const workspaceRoot = process.cwd();
    const graphPath = path.resolve(workspaceRoot, "projects/cic/skill-graph/graph.json");
    const memoryLedgerPath = path.resolve(workspaceRoot, ".artifacts/memory/ledger.jsonl");
    const skillStore = new skill_graph_store_js_1.SkillGraphStore(graphPath);
    const substrate = new memory_substrate_1.MemorySubstrate({
        store_path: memoryLedgerPath
    });
    const memoryIntegration = new apr_memory_integration_js_1.AprMemoryIntegration(substrate);
    const planner = new autonomous_planner_js_1.AutonomousPlanner(workspaceRoot);
    const coordinator = new multi_agent_coordinator_js_1.MultiAgentCoordinator(workspaceRoot);
    const allocator = new task_allocator_js_1.TaskAllocator(skillStore);
    router.post("/apr/plan", async (req, res) => {
        try {
            const dryRun = req.body.dryRun !== false; // defaults to true
            const inputs = planner.loadInputs();
            // Inject memory-based context into planning
            const historyContext = await memoryIntegration.getHistoricalContext();
            const skillRecs = await memoryIntegration.getSkillRecommendations();
            const failurePatterns = await memoryIntegration.getFailurePatterns();
            inputs.memoryTrends = {
                ...inputs.memoryTrends,
                historicalSuccessRate: historyContext.successRate,
                riskFactors: historyContext.riskFactors,
                recommendedApproaches: historyContext.recommendedApproaches
            };
            const plan = planner.plan(inputs);
            // Allocate tasks using Skill Graph
            plan.tasks = plan.tasks.map(task => {
                const alloc = allocator.allocate(task);
                if (alloc.status === "assigned") {
                    task.status = "assigned";
                }
                return task;
            });
            const episode = coordinator.runLoop(plan, dryRun);
            res.json(episode);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    router.get("/apr/episodes", (_req, res) => {
        try {
            res.json(coordinator.getEpisodes());
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    router.get("/apr/episodes/:id", (req, res) => {
        try {
            const id = req.params.id;
            const episodes = coordinator.getEpisodes();
            const match = episodes.find(e => e.id === id);
            if (!match) {
                return res.status(404).json({ error: `Planning episode '${id}' not found.` });
            }
            res.json(match);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
}
//# sourceMappingURL=apr-routes.js.map