"use strict";
// File: projects/cic/tests/mee/mee-consensus.test.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const mee_consensus_engine_js_1 = require("../../src/mee/mee-consensus-engine.js");
const mee_agent_orchestrator_js_1 = require("../../src/mee/mee-agent-orchestrator.js");
const planner_agent_js_1 = require("../../src/mee/planner-agent.js");
const refactor_agent_js_1 = require("../../src/mee/refactor-agent.js");
const docs_agent_js_1 = require("../../src/mee/docs-agent.js");
const safety_agent_js_1 = require("../../src/mee/safety-agent.js");
const planning_engine_js_1 = require("../../src/mee/planning/planning-engine.js");
const mee_autonomous_engine_js_1 = require("../../src/mee/mee-autonomous-engine.js");
const mee_autonomous_store_js_1 = require("../../src/mee/mee-autonomous-store.js");
const mee_run_engine_js_1 = require("../../src/mee/mee-run-engine.js");
const mee_run_store_js_1 = require("../../src/mee/mee-run-store.js");
const safety_engine_js_1 = require("../../src/mee/safety/safety-engine.js");
const sandbox_engine_js_1 = require("../../src/mee/safety/sandbox-engine.js");
const rollback_engine_js_1 = require("../../src/mee/safety/rollback-engine.js");
const mee_synthesizer_js_1 = require("../../src/mee/mee-synthesizer.js");
const mee_validator_js_1 = require("../../src/mee/mee-validator.js");
const mee_proposal_store_js_1 = require("../../src/mee/mee-proposal-store.js");
const mee_memory_store_js_1 = require("../../src/mee/mee-memory-store.js");
(0, vitest_1.describe)("Mee Consensus & Negotiation Subsystem", () => {
    const tempDir = node_path_1.default.resolve(process.cwd(), "projects/cic/tests/mee/temp-consensus-tests");
    (0, vitest_1.beforeEach)(() => {
        if (node_fs_1.default.existsSync(tempDir)) {
            node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
        node_fs_1.default.mkdirSync(tempDir, { recursive: true });
    });
    (0, vitest_1.afterEach)(() => {
        if (node_fs_1.default.existsSync(tempDir)) {
            node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
    });
    (0, vitest_1.describe)("MeeConsensusEngine", () => {
        (0, vitest_1.it)("scores proposal based on critique severity weights", () => {
            const engine = new mee_consensus_engine_js_1.MeeConsensusEngine();
            const critiques = [
                { severity: "error", issue: "Failing compile" },
                { severity: "warn", issue: "Line smell" },
                { severity: "info", issue: "Doc smell" }
            ];
            const score = engine.scoreProposal("prop-1", critiques);
            // 100 - 40 (error) - 20 (warn) - 5 (info) = 35
            (0, vitest_1.expect)(score.score).toBe(35);
            (0, vitest_1.expect)(score.passed).toBe(false);
        });
        (0, vitest_1.it)("clamps score to 0 on excessive critiques", () => {
            const engine = new mee_consensus_engine_js_1.MeeConsensusEngine();
            const critiques = [
                { severity: "error", issue: "1" },
                { severity: "error", issue: "2" },
                { severity: "error", issue: "3" }
            ];
            const score = engine.scoreProposal("prop-1", critiques);
            (0, vitest_1.expect)(score.score).toBe(0);
            (0, vitest_1.expect)(score.passed).toBe(false);
        });
        (0, vitest_1.it)("determines decisions ready, needs_revision, and blocked correctly", () => {
            const engine = new mee_consensus_engine_js_1.MeeConsensusEngine(70);
            const r1 = engine.determineResult("prop-1", 80, [], 1, 3);
            (0, vitest_1.expect)(r1.decision).toBe("ready");
            const r2 = engine.determineResult("prop-1", 50, [{ severity: "error", issue: "1" }], 1, 3);
            (0, vitest_1.expect)(r2.decision).toBe("needs_revision");
            const r3 = engine.determineResult("prop-1", 50, [{ severity: "error", issue: "1" }], 3, 3);
            (0, vitest_1.expect)(r3.decision).toBe("blocked");
        });
    });
    (0, vitest_1.describe)("Agents", () => {
        (0, vitest_1.it)("should critique and refine plan tasks in PlannerAgent", async () => {
            const planning = new planning_engine_js_1.PlanningEngine();
            const planner = new planner_agent_js_1.PlannerAgent("agent-planner-1", "planner", planning);
            const taskCritique = {
                id: "task-1",
                agentId: "agent-planner-1",
                jobId: "job-1",
                createdAt: new Date().toISOString(),
                type: "critique",
                payload: {
                    plan: {
                        rootRequest: "Optimize code",
                        summary: "Optimization plan",
                        tasks: []
                    }
                },
                status: "pending"
            };
            const resCritique = await planner.handleTask(taskCritique);
            const dataCritique = JSON.parse(resCritique.content);
            (0, vitest_1.expect)(dataCritique.critiques.length).toBe(1);
            (0, vitest_1.expect)(dataCritique.critiques[0].severity).toBe("error");
            const taskRefine = {
                id: "task-2",
                agentId: "agent-planner-1",
                jobId: "job-1",
                createdAt: new Date().toISOString(),
                type: "refine",
                payload: {
                    plan: {
                        rootRequest: "Optimize code",
                        summary: "Optimization plan",
                        tasks: []
                    }
                },
                status: "pending"
            };
            const resRefine = await planner.handleTask(taskRefine);
            const dataRefine = JSON.parse(resRefine.content);
            (0, vitest_1.expect)(dataRefine.refinedPlan.tasks.length).toBe(1);
            (0, vitest_1.expect)(dataRefine.refinedPlan.tasks[0].id).toBe("task-refined-1");
        });
        (0, vitest_1.it)("should critique and refine patches in RefactorAgent", async () => {
            const refactor = new refactor_agent_js_1.RefactorAgent("agent-refactor-1");
            const taskCritique = {
                id: "task-3",
                agentId: "agent-refactor-1",
                jobId: "job-1",
                createdAt: new Date().toISOString(),
                type: "critique",
                payload: {
                    patches: [
                        { path: "src/index.ts", type: "modify", content: "const x = eval('2+2');" }
                    ]
                },
                status: "pending"
            };
            const resCritique = await refactor.handleTask(taskCritique);
            const dataCritique = JSON.parse(resCritique.content);
            (0, vitest_1.expect)(dataCritique.critiques.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(dataCritique.critiques[0].severity).toBe("error");
            const taskRefine = {
                id: "task-4",
                agentId: "agent-refactor-1",
                jobId: "job-1",
                createdAt: new Date().toISOString(),
                type: "refine",
                payload: {
                    patches: [
                        { path: "src/index.ts", type: "modify", content: "const x = eval('2+2');" }
                    ],
                    critiques: dataCritique.critiques
                },
                status: "pending"
            };
            const resRefine = await refactor.handleTask(taskRefine);
            const dataRefine = JSON.parse(resRefine.content);
            (0, vitest_1.expect)(dataRefine.refinedPatches[0].content).toContain("JSON.parse");
        });
        (0, vitest_1.it)("should critique and refine descriptions in DocsAgent", async () => {
            const docs = new docs_agent_js_1.DocsAgent("agent-docs-1");
            const taskCritique = {
                id: "task-5",
                agentId: "agent-docs-1",
                jobId: "job-1",
                createdAt: new Date().toISOString(),
                type: "critique",
                payload: {
                    proposal: {
                        title: "short",
                        planSummary: "brief"
                    }
                },
                status: "pending"
            };
            const resCritique = await docs.handleTask(taskCritique);
            const dataCritique = JSON.parse(resCritique.content);
            (0, vitest_1.expect)(dataCritique.critiques.length).toBe(2);
            const taskRefine = {
                id: "task-6",
                agentId: "agent-docs-1",
                jobId: "job-1",
                createdAt: new Date().toISOString(),
                type: "refine",
                payload: {
                    proposal: {
                        title: "short",
                        planSummary: "brief"
                    }
                },
                status: "pending"
            };
            const resRefine = await docs.handleTask(taskRefine);
            const dataRefine = JSON.parse(resRefine.content);
            (0, vitest_1.expect)(dataRefine.refinedProposal.title).toContain("Refined Proposal");
        });
        (0, vitest_1.it)("should critique and refine safety violations in SafetyAgent", async () => {
            const safety = new safety_agent_js_1.SafetyAgent("agent-safety-1");
            const taskCritique = {
                id: "task-7",
                agentId: "agent-safety-1",
                jobId: "job-1",
                createdAt: new Date().toISOString(),
                type: "critique",
                payload: {
                    patches: [
                        { path: "src/safe.ts", type: "modify", content: "child_process.exec('rm -rf');" },
                        { path: ".env", type: "modify", content: "SECRET=1" }
                    ]
                },
                status: "pending"
            };
            const resCritique = await safety.handleTask(taskCritique);
            const dataCritique = JSON.parse(resCritique.content);
            (0, vitest_1.expect)(dataCritique.critiques.length).toBe(2);
            (0, vitest_1.expect)(dataCritique.critiques[0].severity).toBe("error");
            const taskRefine = {
                id: "task-8",
                agentId: "agent-safety-1",
                jobId: "job-1",
                createdAt: new Date().toISOString(),
                type: "refine",
                payload: {
                    patches: [
                        { path: "src/safe.ts", type: "modify", content: "child_process.exec('rm -rf');" }
                    ]
                },
                status: "pending"
            };
            const resRefine = await safety.handleTask(taskRefine);
            const dataRefine = JSON.parse(resRefine.content);
            (0, vitest_1.expect)(dataRefine.refinedPatches[0].content).toContain("disabled for safety");
        });
    });
    (0, vitest_1.describe)("MeeAutonomousEngine Integration", () => {
        (0, vitest_1.it)("should run critique, score consensus, and succeed on clean input", async () => {
            const jobStore = new mee_autonomous_store_js_1.FileMeeAutonomousJobStore(tempDir);
            const runStore = new mee_run_store_js_1.FileMeeRunStore(tempDir);
            const proposalStore = new mee_proposal_store_js_1.MeeProposalStore();
            proposalStore.filePath = node_path_1.default.join(tempDir, "proposals.json");
            const planning = new planning_engine_js_1.PlanningEngine();
            const runs = new mee_run_engine_js_1.MeeRunEngine(runStore);
            const safetyEngine = new safety_engine_js_1.MeeSafetyEngine();
            const sandbox = new sandbox_engine_js_1.MeeSandboxEngine({ mockExec: true, mockResult: true });
            const synth = new mee_synthesizer_js_1.MeePatchSynthesizer();
            const validator = new mee_validator_js_1.MeeValidator();
            const rollback = new rollback_engine_js_1.MeeRollbackEngine();
            const memoryStore = new mee_memory_store_js_1.InMemoryMeeMemoryStore();
            const orchestrator = new mee_agent_orchestrator_js_1.MeeAgentOrchestrator(tempDir);
            orchestrator.registerAgent(new planner_agent_js_1.PlannerAgent("agent-planner-1", "planner", planning));
            orchestrator.registerAgent(new refactor_agent_js_1.RefactorAgent("agent-refactor-1"));
            orchestrator.registerAgent(new docs_agent_js_1.DocsAgent("agent-docs-1"));
            orchestrator.registerAgent(new safety_agent_js_1.SafetyAgent("agent-safety-1"));
            const engine = new mee_autonomous_engine_js_1.MeeAutonomousEngine(jobStore, planning, runs, safetyEngine, sandbox, proposalStore, synth, validator, rollback, undefined, // failureStore
            undefined, // selfHealing
            undefined, // healingPlanStore
            memoryStore, orchestrator);
            const job = engine.createJob("Verify workspace configurations");
            await engine.startJob(job.id);
            // Add a clean proposal
            const proposalId = job.proposalIds[0];
            const p = proposalStore.get(proposalId);
            (0, vitest_1.expect)(p).toBeDefined();
            if (p) {
                p.title = "Perfect Implementation Spec";
                p.planSummary = "Expanded plan summary to verify consensus gating passes without errors.";
                proposalStore.update(proposalId, p);
                // Run executeStep
                await engine.executeStep(job.id, proposalId, tempDir);
                // Verify job consensus persisted results
                const consensusResults = orchestrator.getConsensusForJob(job.id, job.proposalIds);
                (0, vitest_1.expect)(consensusResults.length).toBeGreaterThan(0);
                (0, vitest_1.expect)(consensusResults[0].decision).toBe("ready");
                (0, vitest_1.expect)(consensusResults[0].score).toBe(100);
                // Verify memory item logged
                const memories = memoryStore.queryByJob(job.id);
                (0, vitest_1.expect)(memories.some(m => m.tags.includes("consensus"))).toBe(true);
            }
        });
        (0, vitest_1.it)("should run refinement when critiques are raised, and succeed if refined patches pass", async () => {
            const jobStore = new mee_autonomous_store_js_1.FileMeeAutonomousJobStore(tempDir);
            const runStore = new mee_run_store_js_1.FileMeeRunStore(tempDir);
            const proposalStore = new mee_proposal_store_js_1.MeeProposalStore();
            proposalStore.filePath = node_path_1.default.join(tempDir, "proposals.json");
            const planning = new planning_engine_js_1.PlanningEngine();
            const runs = new mee_run_engine_js_1.MeeRunEngine(runStore);
            const safetyEngine = new safety_engine_js_1.MeeSafetyEngine();
            const sandbox = new sandbox_engine_js_1.MeeSandboxEngine({ mockExec: true, mockResult: true });
            const synth = new mee_synthesizer_js_1.MeePatchSynthesizer();
            const validator = new mee_validator_js_1.MeeValidator();
            const rollback = new rollback_engine_js_1.MeeRollbackEngine();
            const memoryStore = new mee_memory_store_js_1.InMemoryMeeMemoryStore();
            const orchestrator = new mee_agent_orchestrator_js_1.MeeAgentOrchestrator(tempDir);
            orchestrator.registerAgent(new planner_agent_js_1.PlannerAgent("agent-planner-1", "planner", planning));
            orchestrator.registerAgent(new refactor_agent_js_1.RefactorAgent("agent-refactor-1"));
            orchestrator.registerAgent(new docs_agent_js_1.DocsAgent("agent-docs-1"));
            orchestrator.registerAgent(new safety_agent_js_1.SafetyAgent("agent-safety-1"));
            const engine = new mee_autonomous_engine_js_1.MeeAutonomousEngine(jobStore, planning, runs, safetyEngine, sandbox, proposalStore, synth, validator, rollback, undefined, // failureStore
            undefined, // selfHealing
            undefined, // healingPlanStore
            memoryStore, orchestrator);
            // Create job
            const job = engine.createJob("Verify config");
            await engine.startJob(job.id);
            const proposalId = job.proposalIds[0];
            const p = proposalStore.get(proposalId);
            (0, vitest_1.expect)(p).toBeDefined();
            if (p) {
                // Trigger critiques: short title (warn), short summary (warn)
                p.title = "Short";
                p.planSummary = "Short";
                proposalStore.update(proposalId, p);
                // Run executeStep - should run refinement and succeed
                await engine.executeStep(job.id, proposalId, tempDir);
                const consensusResults = orchestrator.getConsensusForJob(job.id, job.proposalIds);
                (0, vitest_1.expect)(consensusResults.length).toBeGreaterThan(0);
                // First round should be needs_revision
                (0, vitest_1.expect)(consensusResults.some(r => r.decision === "needs_revision")).toBe(true);
                // Final round should be ready
                (0, vitest_1.expect)(consensusResults[consensusResults.length - 1].decision).toBe("ready");
                // Verify memory item logged refinement
                const memories = memoryStore.queryByJob(job.id);
                (0, vitest_1.expect)(memories.some(m => m.tags.includes("refinement"))).toBe(true);
            }
        });
    });
});
//# sourceMappingURL=mee-consensus.test.js.map