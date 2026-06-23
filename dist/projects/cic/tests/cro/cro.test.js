"use strict";
// File: projects/cic/tests/cro/cro.test.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const runtime_executor_js_1 = require("../../src/cro/runtime-executor.js");
const agent_runner_js_1 = require("../../src/cro/agent-runner.js");
const agent_supervisor_js_1 = require("../../src/cro/agent-supervisor.js");
const cro_routes_js_1 = require("../../src/cic/control-plane/cro-routes.js");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
(0, vitest_1.describe)("Phase 26 — CIC Runtime Orchestrator (CRO)", () => {
    const tempExecutionsLog = node_path_1.default.resolve(__dirname, "../../.cro/temp-test-executions.jsonl");
    (0, vitest_1.beforeEach)(() => {
        if (node_fs_1.default.existsSync(tempExecutionsLog)) {
            node_fs_1.default.unlinkSync(tempExecutionsLog);
        }
    });
    (0, vitest_1.afterEach)(() => {
        if (node_fs_1.default.existsSync(tempExecutionsLog)) {
            node_fs_1.default.unlinkSync(tempExecutionsLog);
        }
    });
    (0, vitest_1.it)("CoreAgentRunner resolves agent output based on owner name", async () => {
        const runner = new agent_runner_js_1.CoreAgentRunner();
        // Dry Run check
        const task = {
            taskId: "t-1",
            goalId: "g-1",
            title: "Test Task",
            status: "pending",
            owner: "agent:TokenEconomyAgent",
            retryCount: 0
        };
        const dryResult = await runner.run(task, true);
        (0, vitest_1.expect)(dryResult.dryRun).toBe(true);
        // TokenEconomyAgent result
        const realResult = await runner.run(task, false);
        (0, vitest_1.expect)(realResult.action).toBe("retry_safeguards_deployed");
    });
    (0, vitest_1.it)("AgentSupervisor tracks execution state and handles retry recovery loops", async () => {
        const runner = new agent_runner_js_1.CoreAgentRunner();
        const supervisor = new agent_supervisor_js_1.AgentSupervisor(runner, 2); // max 2 retries
        const logs = [];
        const logCb = (m) => logs.push(m);
        // 1. Successful run
        const task1 = {
            taskId: "t-1",
            goalId: "g-1",
            title: "Task 1",
            status: "pending",
            owner: "agent:TokenEconomyAgent",
            retryCount: 0
        };
        const outcome1 = await supervisor.executeWithSupervision(task1, false, logCb);
        (0, vitest_1.expect)(outcome1.status).toBe("completed");
        (0, vitest_1.expect)(outcome1.retryCount).toBe(0);
        (0, vitest_1.expect)(logs.some(l => l.includes("completed successfully"))).toBe(true);
        // 2. Failed run with retries
        const task2 = {
            taskId: "t-2",
            goalId: "g-1",
            title: "Task 2",
            status: "pending",
            owner: "agent:UnknownAgent", // triggers error
            retryCount: 0
        };
        const outcome2 = await supervisor.executeWithSupervision(task2, false, logCb);
        (0, vitest_1.expect)(outcome2.status).toBe("failed");
        (0, vitest_1.expect)(outcome2.retryCount).toBe(3); // attempted 3 times (attempt 0, 1, 2) + failed status
        (0, vitest_1.expect)(logs.some(l => l.includes("failed permanently"))).toBe(true);
    });
    (0, vitest_1.it)("RuntimeExecutor schedules batch tasks respecting concurrency worker limits", async () => {
        const executor = new runtime_executor_js_1.RuntimeExecutor(node_path_1.default.resolve(__dirname, "../.."));
        // Override log path
        executor.logPath = tempExecutionsLog;
        // Set max workers to 2
        executor.maxWorkers = 2;
        const tasks = [
            { taskId: "t-1", goalId: "g-1", title: "Task 1", status: "pending", owner: "agent:TokenEconomyAgent", retryCount: 0 },
            { taskId: "t-2", goalId: "g-1", title: "Task 2", status: "pending", owner: "agent:RedesignAgent", retryCount: 0 },
            { taskId: "t-3", goalId: "g-1", title: "Task 3", status: "pending", owner: "agent:TokenEconomyAgent", retryCount: 0 }
        ];
        // Running batch with dry-run
        const episode = await executor.runBatch(tasks, true);
        (0, vitest_1.expect)(episode.status).toBe("dry_run");
        (0, vitest_1.expect)(episode.tasks.length).toBe(3);
        (0, vitest_1.expect)(episode.stats.totalExecuted).toBe(3);
        (0, vitest_1.expect)(episode.stats.totalFailed).toBe(0);
        (0, vitest_1.expect)(node_fs_1.default.existsSync(tempExecutionsLog)).toBe(false);
        // Running batch with commit
        const committedEpisode = await executor.runBatch(tasks, false);
        (0, vitest_1.expect)(committedEpisode.status).toBe("committed");
        (0, vitest_1.expect)(node_fs_1.default.existsSync(tempExecutionsLog)).toBe(true);
        const history = executor.getEpisodes();
        (0, vitest_1.expect)(history.length).toBe(1);
        (0, vitest_1.expect)(history[0].id).toBe(committedEpisode.id);
    });
    (0, vitest_1.it)("RuntimeExecutor respects queue backlog bounds and rejects massive batches", async () => {
        const executor = new runtime_executor_js_1.RuntimeExecutor(node_path_1.default.resolve(__dirname, "../.."));
        executor.maxQueueLength = 2; // limit to 2
        const tasks = [
            { taskId: "t-1", goalId: "g-1", title: "Task 1", status: "pending", owner: "agent:TokenEconomyAgent", retryCount: 0 },
            { taskId: "t-2", goalId: "g-1", title: "Task 2", status: "pending", owner: "agent:RedesignAgent", retryCount: 0 },
            { taskId: "t-3", goalId: "g-1", title: "Task 3", status: "pending", owner: "agent:TokenEconomyAgent", retryCount: 0 }
        ];
        await (0, vitest_1.expect)(executor.runBatch(tasks, true)).rejects.toThrow("Queue length limit exceeded");
    });
    (0, vitest_1.it)("registerCroRoutes registers REST routes", () => {
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
        (0, cro_routes_js_1.registerCroRoutes)(mockRouter);
        (0, vitest_1.expect)(registeredGets.has("/cro/episodes")).toBe(true);
        (0, vitest_1.expect)(registeredGets.has("/cro/episodes/:id")).toBe(true);
        (0, vitest_1.expect)(registeredPosts.has("/cro/execute")).toBe(true);
    });
});
//# sourceMappingURL=cro.test.js.map