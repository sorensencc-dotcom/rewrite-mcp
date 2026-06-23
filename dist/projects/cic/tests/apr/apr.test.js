"use strict";
// File: projects/cic/tests/apr/apr.test.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const autonomous_planner_js_1 = require("../../src/apr/autonomous-planner.js");
const multi_agent_coordinator_js_1 = require("../../src/apr/multi-agent-coordinator.js");
const task_allocator_js_1 = require("../../src/apr/task-allocator.js");
const skill_graph_store_js_1 = require("../../src/skills/skill-graph-store.js");
const apr_routes_js_1 = require("../../src/cic/control-plane/apr-routes.js");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
(0, vitest_1.describe)("Phase 25 — Autonomous Planner & Multi-Agent Reasoning (APR)", () => {
    const tempEpisodesLog = node_path_1.default.resolve(__dirname, "../../.apr/temp-test-episodes.jsonl");
    const tempGraphPath = node_path_1.default.resolve(__dirname, "../../skill-graph/temp-test-graph.json");
    (0, vitest_1.beforeEach)(() => {
        if (node_fs_1.default.existsSync(tempEpisodesLog)) {
            node_fs_1.default.unlinkSync(tempEpisodesLog);
        }
        if (node_fs_1.default.existsSync(tempGraphPath)) {
            node_fs_1.default.unlinkSync(tempGraphPath);
        }
    });
    (0, vitest_1.afterEach)(() => {
        if (node_fs_1.default.existsSync(tempEpisodesLog)) {
            node_fs_1.default.unlinkSync(tempEpisodesLog);
        }
        if (node_fs_1.default.existsSync(tempGraphPath)) {
            node_fs_1.default.unlinkSync(tempGraphPath);
        }
    });
    (0, vitest_1.it)("AutonomousPlanner generates correct goals and tasks based on inputs", () => {
        const planner = new autonomous_planner_js_1.AutonomousPlanner(node_path_1.default.resolve(__dirname, "../.."));
        // 1. Ingest nominal inputs
        const nominalPlan = planner.plan({});
        (0, vitest_1.expect)(nominalPlan.goals.length).toBe(1);
        (0, vitest_1.expect)(nominalPlan.goals[0].priority).toBe("low");
        (0, vitest_1.expect)(nominalPlan.tasks.length).toBe(1);
        (0, vitest_1.expect)(nominalPlan.tasks[0].owner).toBe("agent:RedesignAgent");
        // 2. Ingest failure trends
        const failurePlan = planner.plan({
            memoryTrends: { failuresCount: 4 }
        });
        (0, vitest_1.expect)(failurePlan.goals.some(g => g.source === "memory" && g.priority === "high")).toBe(true);
        (0, vitest_1.expect)(failurePlan.tasks.some(t => t.owner === "agent:TokenEconomyAgent")).toBe(true);
        // 3. Ingest skill hotspots
        const skillsPlan = planner.plan({
            skillHotspots: {
                orphanSkills: [{ id: "skill:custom/test", name: "test-skill" }]
            }
        });
        (0, vitest_1.expect)(skillsPlan.goals.some(g => g.source === "skills")).toBe(true);
        (0, vitest_1.expect)(skillsPlan.tasks.some(t => t.owner === "agent:RedesignAgent")).toBe(true);
    });
    (0, vitest_1.it)("MultiAgentCoordinator runs critique loop and logs committed episodes", () => {
        const coordinator = new multi_agent_coordinator_js_1.MultiAgentCoordinator(node_path_1.default.resolve(__dirname, "../.."));
        // Override logPath for tests
        coordinator.logPath = tempEpisodesLog;
        const samplePlan = {
            goals: [
                {
                    id: "g-1",
                    title: "Test Goal",
                    description: "Test Desc",
                    priority: "high",
                    source: "test",
                    status: "pending",
                    createdAt: new Date().toISOString()
                }
            ],
            tasks: [
                {
                    id: "t-1",
                    goalId: "g-1",
                    title: "Test Task",
                    description: "Test Desc",
                    owner: "agent:RedesignAgent",
                    status: "pending",
                    type: "AUTO_EXECUTABLE"
                }
            ]
        };
        // Dry Run should not write to disk
        const dryEpisode = coordinator.runLoop(samplePlan, true);
        (0, vitest_1.expect)(dryEpisode.status).toBe("dry_run");
        (0, vitest_1.expect)(dryEpisode.critiques.length).toBe(2);
        (0, vitest_1.expect)(node_fs_1.default.existsSync(tempEpisodesLog)).toBe(false);
        // Commit should write to disk
        const committedEpisode = coordinator.runLoop(samplePlan, false);
        (0, vitest_1.expect)(committedEpisode.status).toBe("committed");
        (0, vitest_1.expect)(node_fs_1.default.existsSync(tempEpisodesLog)).toBe(true);
        const episodes = coordinator.getEpisodes();
        (0, vitest_1.expect)(episodes.length).toBe(1);
        (0, vitest_1.expect)(episodes[0].id).toBe(committedEpisode.id);
    });
    (0, vitest_1.it)("TaskAllocator allocates tasks using Skill Graph", () => {
        const skillStore = new skill_graph_store_js_1.SkillGraphStore(tempGraphPath);
        const sampleGraph = {
            nodes: [
                { id: "agent:TokenEconomyAgent", type: "agent", name: "Token Economy Agent" }
            ],
            edges: []
        };
        skillStore.save(sampleGraph);
        const allocator = new task_allocator_js_1.TaskAllocator(skillStore);
        const task1 = {
            id: "t-1",
            goalId: "g-1",
            title: "Retry task",
            description: "Test retry",
            owner: "agent:TokenEconomyAgent",
            status: "pending",
            type: "AUTO_EXECUTABLE"
        };
        const task2 = {
            id: "t-2",
            goalId: "g-1",
            title: "Unknown agent task",
            description: "Test unknown",
            owner: "agent:UnknownAgent",
            status: "pending",
            type: "OPERATOR_REQUIRED"
        };
        const allocation1 = allocator.allocate(task1);
        (0, vitest_1.expect)(allocation1.owner).toBe("agent:TokenEconomyAgent");
        (0, vitest_1.expect)(allocation1.status).toBe("assigned");
        const allocation2 = allocator.allocate(task2);
        (0, vitest_1.expect)(allocation2.owner).toBe("operator");
        (0, vitest_1.expect)(allocation2.status).toBe("rejected"); // Operator required tasks return rejected status when auto routing
    });
    (0, vitest_1.it)("registerAprRoutes defines Express router paths", () => {
        const registeredGets = new Map();
        const registeredPosts = new Map();
        const mockRouter = {
            get(path, handler) {
                registeredGets.set(path, handler);
            },
            post(path, handler) {
                registeredPosts.set(path, handler);
            }
        };
        (0, apr_routes_js_1.registerAprRoutes)(mockRouter);
        (0, vitest_1.expect)(registeredGets.has("/apr/episodes")).toBe(true);
        (0, vitest_1.expect)(registeredGets.has("/apr/episodes/:id")).toBe(true);
        (0, vitest_1.expect)(registeredPosts.has("/apr/plan")).toBe(true);
    });
});
//# sourceMappingURL=apr.test.js.map