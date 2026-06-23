"use strict";
// File: projects/cic/tests/mee/abm-healing-flow.test.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
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
const self_healing_engine_js_1 = require("../../src/mee/self-healing/self-healing-engine.js");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
(0, vitest_1.describe)("ABM Self-Healing Flow", () => {
    const tempDir = node_path_1.default.resolve(process.cwd(), "projects/cic/tests/mee/temp-healing-tests");
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
    let failureStore;
    let healingPlanStore;
    let selfHealing;
    let engine;
    (0, vitest_1.beforeEach)(() => {
        if (node_fs_1.default.existsSync(tempDir)) {
            node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
        node_fs_1.default.mkdirSync(tempDir, { recursive: true });
        jobStore = new mee_autonomous_store_js_1.FileMeeAutonomousJobStore(tempDir);
        runStore = new mee_run_store_js_1.FileMeeRunStore(tempDir);
        failureStore = new mee_autonomous_store_js_1.FileMeeRunFailureContextStore(tempDir);
        healingPlanStore = new mee_autonomous_store_js_1.FileMeeHealingPlanStore(tempDir);
        proposalStore = new mee_proposal_store_js_1.MeeProposalStore();
        proposalStore.filePath = node_path_1.default.join(tempDir, "proposals.json");
        planning = new planning_engine_js_1.PlanningEngine();
        runs = new mee_run_engine_js_1.MeeRunEngine(runStore);
        safety = new safety_engine_js_1.MeeSafetyEngine();
        sandbox = new sandbox_engine_js_1.MeeSandboxEngine({ mockExec: true, mockResult: true });
        synth = new mee_synthesizer_js_1.MeePatchSynthesizer();
        validator = new mee_validator_js_1.MeeValidator();
        rollback = new rollback_engine_js_1.MeeRollbackEngine();
        const mockHealingLLM = {
            suggestHealing: async (input) => ({
                summary: "Mock fix suggestion",
                tasks: [{ title: "Auto Fix", description: "Fix build", type: "fix" }],
            }),
        };
        selfHealing = new self_healing_engine_js_1.SelfHealingEngine(mockHealingLLM);
        engine = new mee_autonomous_engine_js_1.MeeAutonomousEngine(jobStore, planning, runs, safety, sandbox, proposalStore, synth, validator, rollback, failureStore, selfHealing, healingPlanStore);
    });
    (0, vitest_1.afterEach)(() => {
        if (node_fs_1.default.existsSync(tempDir)) {
            node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
    });
    (0, vitest_1.it)("captures failure context and generates healing plan when sandbox checks fail", async () => {
        // Force sandbox validation to fail
        sandbox.validate = async () => ({
            passed: false,
            compilePassed: false,
            testsPassed: false,
            output: "Compilation failed mock error."
        });
        const job = engine.createJob("Build complex feature");
        await engine.startJob(job.id);
        const started = jobStore.get(job.id);
        (0, vitest_1.expect)(started?.proposalIds.length).toBeGreaterThan(0);
        const proposalId = started.proposalIds[0];
        // Execute step - should trigger sandbox failure
        await engine.executeStep(job.id, proposalId, tempDir);
        // Verify job status
        const updatedJob = jobStore.get(job.id);
        (0, vitest_1.expect)(updatedJob?.status).toBe("failed");
        (0, vitest_1.expect)(updatedJob?.error?.code).toBe("sandbox_failed");
        // Verify failure context was saved
        const failure = failureStore.getByJob(job.id);
        (0, vitest_1.expect)(failure).toBeDefined();
        (0, vitest_1.expect)(failure?.errorCode).toBe("sandbox_failed");
        (0, vitest_1.expect)(failure?.failingProposalIds).toContain(proposalId);
        (0, vitest_1.expect)(failure?.sandboxOutput?.buildOutput).toContain("Compilation failed mock error");
        // Verify healing plan was saved
        const healingPlan = healingPlanStore.getByParentJob(job.id);
        (0, vitest_1.expect)(healingPlan).toBeDefined();
        (0, vitest_1.expect)(healingPlan?.parentJobId).toBe(job.id);
        (0, vitest_1.expect)(healingPlan?.summary).toBe("Mock fix suggestion");
        (0, vitest_1.expect)(healingPlan?.suggestedTasks.length).toBe(1);
        (0, vitest_1.expect)(healingPlan?.suggestedTasks[0].title).toBe("Auto Fix");
    });
});
//# sourceMappingURL=abm-healing-flow.test.js.map