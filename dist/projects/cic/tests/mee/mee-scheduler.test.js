"use strict";
// File: projects/cic/tests/mee/mee-scheduler.test.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const mee_scheduler_js_1 = require("../../src/mee/mee-scheduler.js");
const mee_autonomous_engine_js_1 = require("../../src/mee/mee-autonomous-engine.js");
const mee_autonomous_store_js_1 = require("../../src/mee/mee-autonomous-store.js");
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
(0, vitest_1.describe)("MeeScheduler Subsystem", () => {
    const tempDir = node_path_1.default.resolve(process.cwd(), "projects/cic/tests/mee/temp-scheduler-tests");
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
        engine = new mee_autonomous_engine_js_1.MeeAutonomousEngine(jobStore, planning, runs, safety, sandbox, proposalStore, synth, validator, rollback, undefined, undefined, undefined, memoryStore, orchestrator);
    });
    (0, vitest_1.afterEach)(() => {
        if (node_fs_1.default.existsSync(tempDir)) {
            node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
    });
    (0, vitest_1.it)("should run jobs in priority order and respect concurrency limits", async () => {
        // Create scheduler with concurrency limit 1
        const scheduler = new mee_scheduler_js_1.MeeScheduler(jobStore, runs, engine, tempDir, 1);
        // Create 3 jobs: Job 1 (Priority 1), Job 2 (Priority 10), Job 3 (Priority 5)
        const job1 = engine.createJob("Task 1");
        job1.priority = 1;
        jobStore.save(job1);
        const job2 = engine.createJob("Task 2");
        job2.priority = 10;
        jobStore.save(job2);
        const job3 = engine.createJob("Task 3");
        job3.priority = 5;
        jobStore.save(job3);
        // Run tick - should start job 2 (highest priority)
        await scheduler.tick();
        const state = scheduler.getQueueState();
        (0, vitest_1.expect)(state.activeCount).toBe(1);
        (0, vitest_1.expect)(state.activeJobIds[0]).toBe(job2.id);
        // Job 1 and Job 3 should be in pending/paused lists
        (0, vitest_1.expect)(state.pendingJobIds.includes(job1.id)).toBe(true);
        (0, vitest_1.expect)(state.pendingJobIds.includes(job3.id)).toBe(true);
    });
    (0, vitest_1.it)("should not start jobs whose dependencies are not completed", async () => {
        const scheduler = new mee_scheduler_js_1.MeeScheduler(jobStore, runs, engine, tempDir, 2);
        // Job 1 (Priority 1)
        const job1 = engine.createJob("Task 1");
        job1.priority = 1;
        jobStore.save(job1);
        // Job 2 depends on Job 1
        const job2 = engine.createJob("Task 2");
        job2.priority = 10;
        job2.dependsOnJobIds = [job1.id];
        jobStore.save(job2);
        // Run tick
        await scheduler.tick();
        const state = scheduler.getQueueState();
        // Job 2 has higher priority, but since Job 1 isn't completed, Job 2 cannot run. Only Job 1 should run.
        (0, vitest_1.expect)(state.activeCount).toBe(1);
        (0, vitest_1.expect)(state.activeJobIds[0]).toBe(job1.id);
    });
    (0, vitest_1.it)("should preempt a running job when a higher priority job is submitted and concurrency limit is met", async () => {
        const scheduler = new mee_scheduler_js_1.MeeScheduler(jobStore, runs, engine, tempDir, 1);
        // Start Job 1 with Priority 1
        const job1 = engine.createJob("Task 1");
        job1.priority = 1;
        jobStore.save(job1);
        await scheduler.tick();
        let state = scheduler.getQueueState();
        (0, vitest_1.expect)(state.activeJobIds[0]).toBe(job1.id);
        // Now submit a higher priority Job 2 (Priority 10)
        const job2 = engine.createJob("Task 2");
        job2.priority = 10;
        jobStore.save(job2);
        // Run tick - should preempt Job 1 and start Job 2
        await scheduler.tick();
        state = scheduler.getQueueState();
        (0, vitest_1.expect)(state.activeJobIds[0]).toBe(job2.id);
        (0, vitest_1.expect)(state.pausedJobIds[0]).toBe(job1.id);
        const freshJob1 = jobStore.get(job1.id);
        (0, vitest_1.expect)(freshJob1?.status).toBe("paused");
    });
});
//# sourceMappingURL=mee-scheduler.test.js.map