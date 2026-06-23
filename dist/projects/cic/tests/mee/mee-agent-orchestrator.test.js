"use strict";
// File: projects/cic/tests/mee/mee-agent-orchestrator.test.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const mee_agent_orchestrator_js_1 = require("../../src/mee/mee-agent-orchestrator.js");
(0, vitest_1.describe)("MeeAgentOrchestrator", () => {
    const testDir = node_path_1.default.resolve(process.cwd(), "projects/cic/data/test-orchestrator");
    (0, vitest_1.beforeEach)(() => {
        if (node_fs_1.default.existsSync(testDir)) {
            node_fs_1.default.rmSync(testDir, { recursive: true, force: true });
        }
    });
    (0, vitest_1.afterEach)(() => {
        if (node_fs_1.default.existsSync(testDir)) {
            node_fs_1.default.rmSync(testDir, { recursive: true, force: true });
        }
    });
    const dummyJob = {
        id: "job-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "pending",
        request: "Add new schema",
        proposalIds: [],
    };
    const dummyPlan = {
        rootRequest: "Add new schema",
        summary: "Plan to add new schema",
        tasks: [],
    };
    class MockPlannerAgent {
        constructor(id, role) {
            this.id = id;
            this.role = role;
        }
        async handleTask(task) {
            return {
                id: "exchange-res-1",
                taskId: task.id,
                agentId: this.id,
                createdAt: new Date().toISOString(),
                direction: "response",
                content: JSON.stringify({ refinedPlan: { rootRequest: "Refined Plan", summary: "Refined", tasks: [] } }),
            };
        }
    }
    (0, vitest_1.it)("should register agent and schedule plan refinement task", () => {
        const orchestrator = new mee_agent_orchestrator_js_1.MeeAgentOrchestrator(testDir);
        const agent = new MockPlannerAgent("planner-1", "planner");
        orchestrator.registerAgent(agent);
        const tasks = orchestrator.scheduleTasksForPlan(dummyJob, dummyPlan);
        (0, vitest_1.expect)(tasks.length).toBe(1);
        (0, vitest_1.expect)(tasks[0].agentId).toBe("planner-1");
        (0, vitest_1.expect)(tasks[0].type).toBe("plan_refinement");
        (0, vitest_1.expect)(tasks[0].status).toBe("pending");
        const loadedTasks = orchestrator.loadTasks();
        (0, vitest_1.expect)(loadedTasks).toEqual(tasks);
    });
    (0, vitest_1.it)("should dispatch task and record exchanges", async () => {
        const orchestrator = new mee_agent_orchestrator_js_1.MeeAgentOrchestrator(testDir);
        const agent = new MockPlannerAgent("planner-1", "planner");
        orchestrator.registerAgent(agent);
        const tasks = orchestrator.scheduleTasksForPlan(dummyJob, dummyPlan);
        const taskId = tasks[0].id;
        await orchestrator.dispatchTask(taskId);
        const updatedTasks = orchestrator.loadTasks();
        (0, vitest_1.expect)(updatedTasks[0].status).toBe("completed");
        const exchanges = orchestrator.loadExchanges();
        (0, vitest_1.expect)(exchanges.length).toBe(2); // Request and Response exchanges
        (0, vitest_1.expect)(exchanges[0].direction).toBe("request");
        (0, vitest_1.expect)(exchanges[1].direction).toBe("response");
        const history = orchestrator.getTaskHistory(taskId);
        (0, vitest_1.expect)(history.length).toBe(2);
        const jobTasks = orchestrator.getTasksForJob(dummyJob.id);
        (0, vitest_1.expect)(jobTasks.length).toBe(1);
        const jobExchanges = orchestrator.getExchangesForJob(dummyJob.id);
        (0, vitest_1.expect)(jobExchanges.length).toBe(2);
    });
    (0, vitest_1.it)("should mark task as failed if agent throws", async () => {
        const orchestrator = new mee_agent_orchestrator_js_1.MeeAgentOrchestrator(testDir);
        const failingAgent = {
            id: "failing-1",
            role: "planner",
            handleTask: async () => {
                throw new Error("Agent processing error");
            },
        };
        orchestrator.registerAgent(failingAgent);
        const tasks = orchestrator.scheduleTasksForPlan(dummyJob, dummyPlan);
        const taskId = tasks[0].id;
        await orchestrator.dispatchTask(taskId);
        const updatedTasks = orchestrator.loadTasks();
        (0, vitest_1.expect)(updatedTasks[0].status).toBe("failed");
        (0, vitest_1.expect)(updatedTasks[0].errorMessage).toBe("Agent processing error");
    });
});
//# sourceMappingURL=mee-agent-orchestrator.test.js.map