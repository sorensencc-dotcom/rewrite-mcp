"use strict";
// File: projects/cic/tests/mee/mee-autonomous-engine.test.ts | Date: 2026-06-03 | v1.0.1
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
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
(0, vitest_1.describe)("MeeAutonomousEngine & Worker", () => {
    const tempDir = node_path_1.default.resolve(process.cwd(), "projects/cic/tests/mee/temp-autobuild-tests");
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
        engine = new mee_autonomous_engine_js_1.MeeAutonomousEngine(jobStore, planning, runs, safety, sandbox, proposalStore, synth, validator, rollback);
    });
    (0, vitest_1.afterEach)(() => {
        if (node_fs_1.default.existsSync(tempDir)) {
            node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
    });
    (0, vitest_1.it)("creates and starts a job", async () => {
        const request = "Refactor validator and improve UI";
        const job = engine.createJob(request);
        (0, vitest_1.expect)(job.status).toBe("pending");
        (0, vitest_1.expect)(job.request).toBe(request);
        (0, vitest_1.expect)(job.proposalIds.length).toBe(0);
        const started = await engine.startJob(job.id);
        (0, vitest_1.expect)(started).toBeDefined();
        (0, vitest_1.expect)(started?.status).toBe("running");
        (0, vitest_1.expect)(started?.proposalIds.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(started?.runId).toBeDefined();
        (0, vitest_1.expect)(started?.planId).toBeDefined();
    });
    (0, vitest_1.it)("completes job successfully via worker when all checks pass", async () => {
        const job = engine.createJob("Optimize UI styling and extractor");
        await engine.startJob(job.id);
        // Retrieve the updated job from store to have the runId
        const updatedJob = jobStore.get(job.id);
        (0, vitest_1.expect)(updatedJob).toBeDefined();
        (0, vitest_1.expect)(updatedJob?.runId).toBeDefined();
        const worker = new mee_autonomous_worker_js_1.MeeAutonomousWorker(jobStore, runs, engine, tempDir);
        // Start worker poll, and wait shortly for it to complete the tasks
        await worker.start(10);
        // Poll for status to change
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
        const run = runs.getRun(updatedJob.runId);
        (0, vitest_1.expect)(run?.status).toBe("completed");
        // Clean up created proposal md files
        const proposals = proposalStore.loadAll();
        for (const p of proposals) {
            const docPath = node_path_1.default.resolve(process.cwd(), `docs/mee/proposal-${p.id}.md`);
            if (node_fs_1.default.existsSync(docPath)) {
                let deleted = false;
                for (let attempt = 0; attempt < 5; attempt++) {
                    try {
                        node_fs_1.default.unlinkSync(docPath);
                        deleted = true;
                        break;
                    }
                    catch (e) {
                        await new Promise((r) => setTimeout(r, 50));
                    }
                }
                if (!deleted) {
                    try {
                        node_fs_1.default.unlinkSync(docPath);
                    }
                    catch (e) {
                        console.warn(`[Cleanup] Failed to unlink ${docPath}:`, e.message);
                    }
                }
            }
        }
    });
    (0, vitest_1.it)("fails job on safety block", async () => {
        // Force safety check to fail
        safety.analyze = () => ({
            passed: false,
            riskLevel: "critical",
            issues: ["Dangerous pattern execution blocked."]
        });
        const job = engine.createJob("Add new extractor");
        await engine.startJob(job.id);
        // Retrieve the updated job from store to have the runId
        const updatedJob = jobStore.get(job.id);
        (0, vitest_1.expect)(updatedJob).toBeDefined();
        (0, vitest_1.expect)(updatedJob?.runId).toBeDefined();
        const worker = new mee_autonomous_worker_js_1.MeeAutonomousWorker(jobStore, runs, engine, tempDir);
        await worker.start(10);
        let status = "running";
        let errorMsg = "";
        for (let i = 0; i < 20; i++) {
            await new Promise((resolve) => setTimeout(resolve, 20));
            const currentJob = jobStore.get(job.id);
            if (currentJob && currentJob.status !== "running") {
                status = currentJob.status;
                errorMsg = currentJob.error?.message || "";
                break;
            }
        }
        worker.stop();
        (0, vitest_1.expect)(status).toBe("failed");
        (0, vitest_1.expect)(errorMsg).toContain("Safety check failed");
        const run = runs.getRun(updatedJob.runId);
        (0, vitest_1.expect)(run?.status).toBe("failed");
    });
    (0, vitest_1.it)("fails job on sandbox failure", async () => {
        // Force sandbox validation to fail
        sandbox.validate = async () => ({
            passed: false,
            compilePassed: false,
            testsPassed: false,
            output: "Compilation failed in sandbox."
        });
        const job = engine.createJob("Fix build for new extractor");
        await engine.startJob(job.id);
        // Retrieve the updated job from store to have the runId
        const updatedJob = jobStore.get(job.id);
        (0, vitest_1.expect)(updatedJob).toBeDefined();
        (0, vitest_1.expect)(updatedJob?.runId).toBeDefined();
        const worker = new mee_autonomous_worker_js_1.MeeAutonomousWorker(jobStore, runs, engine, tempDir);
        await worker.start(10);
        let status = "running";
        let errorMsg = "";
        for (let i = 0; i < 20; i++) {
            await new Promise((resolve) => setTimeout(resolve, 20));
            const currentJob = jobStore.get(job.id);
            if (currentJob && currentJob.status !== "running") {
                status = currentJob.status;
                errorMsg = currentJob.error?.message || "";
                break;
            }
        }
        worker.stop();
        (0, vitest_1.expect)(status).toBe("failed");
        (0, vitest_1.expect)(errorMsg).toContain("Sandbox validation failed");
        const run = runs.getRun(updatedJob.runId);
        (0, vitest_1.expect)(run?.status).toBe("failed");
    });
});
//# sourceMappingURL=mee-autonomous-engine.test.js.map