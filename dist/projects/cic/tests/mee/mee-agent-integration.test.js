"use strict";
// File: projects/cic/tests/mee/mee-agent-integration.test.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const mee_autonomous_engine_js_1 = require("../../src/mee/mee-autonomous-engine.js");
const mee_autonomous_store_js_1 = require("../../src/mee/mee-autonomous-store.js");
const mee_autonomous_worker_js_1 = require("../../src/mee/mee-autonomous-worker.js");
const planning_engine_js_1 = require("../../src/mee/planning/planning-engine.js");
const mee_run_engine_js_1 = require("../../src/mee/mee-run-engine.js");
const mee_run_store_js_1 = require("../../src/mee/mee-run-store.js");
const safety_engine_js_1 = require("../../src/mee/safety/safety-engine.js");
const sandbox_engine_js_1 = require("../../src/mee/safety/sandbox-engine.js");
const rollback_engine_js_1 = require("../../src/mee/safety/rollback-engine.js");
const mee_synthesizer_js_1 = require("../../src/mee/mee-synthesizer.js");
const mee_validator_js_1 = require("../../src/mee/mee-validator.js");
const mee_proposal_store_js_1 = require("../../src/mee/mee-proposal-store.js");
const mee_memory_store_js_1 = require("../../src/mee/mee-memory-store.js");
const mee_agent_orchestrator_js_1 = require("../../src/mee/mee-agent-orchestrator.js");
const planner_agent_js_1 = require("../../src/mee/planner-agent.js");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
(0, vitest_1.describe)("Mee Autonomous Agent Integration", () => {
    const tempDir = node_path_1.default.resolve(process.cwd(), "projects/cic/tests/mee/temp-agent-integration-tests");
    let jobStore;
    let runStore;
    let proposalStore;
    let planning;
    let runs;
    let safety;
    let sandbox;
    let synth;
    let validator;
    let rollback;
    let memoryStore;
    let orchestrator;
    let engine;
    (0, vitest_1.beforeEach)(() => {
        if (node_fs_1.default.existsSync(tempDir)) {
            node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
        node_fs_1.default.mkdirSync(tempDir, { recursive: true });
        jobStore = new mee_autonomous_store_js_1.FileMeeAutonomousJobStore(tempDir);
        runStore = new mee_run_store_js_1.FileMeeRunStore(tempDir);
        proposalStore = new mee_proposal_store_js_1.MeeProposalStore();
        proposalStore.filePath = node_path_1.default.join(tempDir, "proposals.json");
        planning = new planning_engine_js_1.PlanningEngine();
        runs = new mee_run_engine_js_1.MeeRunEngine(runStore);
        safety = new safety_engine_js_1.MeeSafetyEngine();
        sandbox = new sandbox_engine_js_1.MeeSandboxEngine({ mockExec: true, mockResult: true });
        synth = new mee_synthesizer_js_1.MeePatchSynthesizer();
        validator = new mee_validator_js_1.MeeValidator();
        rollback = new rollback_engine_js_1.MeeRollbackEngine();
        memoryStore = new mee_memory_store_js_1.InMemoryMeeMemoryStore();
        orchestrator = new mee_agent_orchestrator_js_1.MeeAgentOrchestrator(tempDir);
        const plannerAgent = new planner_agent_js_1.PlannerAgent("agent-planner-1", "planner", planning);
        orchestrator.registerAgent(plannerAgent);
        engine = new mee_autonomous_engine_js_1.MeeAutonomousEngine(jobStore, planning, runs, safety, sandbox, proposalStore, synth, validator, rollback, undefined, // failureStore
        undefined, // selfHealing
        undefined, // healingPlanStore
        memoryStore, orchestrator);
    });
    (0, vitest_1.afterEach)(() => {
        if (node_fs_1.default.existsSync(tempDir)) {
            node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
    });
    (0, vitest_1.it)("routes plan through PlannerAgent and records tasks/exchanges", async () => {
        const request = "Optimize UI styling and extractor";
        const job = engine.createJob(request);
        // Start job - should invoke PlannerAgent
        const started = await engine.startJob(job.id);
        (0, vitest_1.expect)(started).toBeDefined();
        // Verify task is scheduled and completed
        const tasks = orchestrator.getTasksForJob(job.id);
        (0, vitest_1.expect)(tasks.length).toBe(1);
        (0, vitest_1.expect)(tasks[0].type).toBe("plan_refinement");
        (0, vitest_1.expect)(tasks[0].status).toBe("completed");
        // Verify exchanges are recorded
        const exchanges = orchestrator.getExchangesForJob(job.id);
        (0, vitest_1.expect)(exchanges.length).toBe(2);
        (0, vitest_1.expect)(exchanges[0].direction).toBe("request");
        (0, vitest_1.expect)(exchanges[1].direction).toBe("response");
    });
    (0, vitest_1.it)("records success memory item upon successful job completion", async () => {
        const job = engine.createJob("Optimize UI styling and extractor");
        await engine.startJob(job.id);
        const worker = new mee_autonomous_worker_js_1.MeeAutonomousWorker(jobStore, runs, engine, tempDir);
        await worker.start(10);
        // Poll for status to change to completed
        let status = "running";
        for (let i = 0; i < 20; i++) {
            await new Promise((resolve) => setTimeout(resolve, 20));
            const currentJob = jobStore.get(job.id);
            if (currentJob && currentJob.status !== "running") {
                status = currentJob.status;
                break;
            }
        }
        worker.stop();
        (0, vitest_1.expect)(status).toBe("completed");
        // Verify memory item recorded
        const memories = memoryStore.queryByJob(job.id);
        (0, vitest_1.expect)(memories.length).toBeGreaterThan(0);
        const successMemory = memories.find((m) => m.tags.includes("success"));
        (0, vitest_1.expect)(successMemory).toBeDefined();
        (0, vitest_1.expect)(successMemory?.summary).toContain("completed successfully");
        // Clean up created proposal md files
        const proposals = proposalStore.loadAll();
        proposals.forEach((p) => {
            const docPath = node_path_1.default.resolve(process.cwd(), `docs/mee/proposal-${p.id}.md`);
            if (node_fs_1.default.existsSync(docPath)) {
                node_fs_1.default.unlinkSync(docPath);
            }
        });
    });
});
//# sourceMappingURL=mee-agent-integration.test.js.map