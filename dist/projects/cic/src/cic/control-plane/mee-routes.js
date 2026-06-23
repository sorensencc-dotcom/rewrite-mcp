"use strict";
// File: projects/cic/src/cic/control-plane/mee-routes.ts | Date: 2026-06-03 | v1.5.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMeeRoutes = registerMeeRoutes;
const mee_trigger_js_1 = require("../../mee/mee-trigger.js");
const mee_generator_js_1 = require("../../mee/mee-generator.js");
const mee_synthesizer_js_1 = require("../../mee/mee-synthesizer.js");
const mee_validator_js_1 = require("../../mee/mee-validator.js");
const mee_proposal_store_js_1 = require("../../mee/mee-proposal-store.js");
const auto_evolution_engine_js_1 = require("../../mee/auto-evolution-engine.js");
const mee_diff_engine_js_1 = require("../../mee/mee-diff-engine.js");
const mee_proposal_graph_js_1 = require("../../mee/mee-proposal-graph.js");
const mee_negotiation_agent_js_1 = require("../../mee/mee-negotiation-agent.js");
const mee_negotiation_engine_js_1 = require("../../mee/mee-negotiation-engine.js");
const ckg_store_js_1 = require("../../ckg/ckg-store.js");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const mee_schema_js_1 = require("../../mee/mee-schema.js");
const self_refactor_engine_js_1 = require("../../mee/self-refactor/self-refactor-engine.js");
const planning_engine_js_1 = require("../../mee/planning/planning-engine.js");
const mee_run_store_js_1 = require("../../mee/mee-run-store.js");
const mee_run_engine_js_1 = require("../../mee/mee-run-engine.js");
const safety_engine_js_1 = require("../../mee/safety/safety-engine.js");
const sandbox_engine_js_1 = require("../../mee/safety/sandbox-engine.js");
const rollback_engine_js_1 = require("../../mee/safety/rollback-engine.js");
const mee_autonomous_store_js_1 = require("../../mee/mee-autonomous-store.js");
const mee_autonomous_engine_js_1 = require("../../mee/mee-autonomous-engine.js");
const self_healing_engine_js_1 = require("../../mee/self-healing/self-healing-engine.js");
const mee_kg_js_1 = require("../../mee/mee-kg.js");
const mee_scheduler_js_1 = require("../../mee/mee-scheduler.js");
const llm_planning_engine_js_1 = require("../../mee/planning/llm-planning-engine.js");
// @ts-ignore
const llamaClient_js_1 = require("../../../ingestion/src/clients/llamaClient.js");
const mee_memory_store_js_1 = require("../../mee/mee-memory-store.js");
const mee_agent_orchestrator_js_1 = require("../../mee/mee-agent-orchestrator.js");
const planner_agent_js_1 = require("../../mee/planner-agent.js");
const refactor_agent_js_1 = require("../../mee/refactor-agent.js");
const docs_agent_js_1 = require("../../mee/docs-agent.js");
const safety_agent_js_1 = require("../../mee/safety-agent.js");
const mee_phase_spec_store_js_1 = require("../../mee/mee-phase-spec-store.js");
const mee_phase_generator_engine_js_1 = require("../../mee/mee-phase-generator-engine.js");
const research_agent_js_1 = require("../../mee/research-agent.js");
const mee_architecture_refactor_engine_js_1 = require("../../mee/mee-architecture-refactor-engine.js");
const mee_capability_expansion_engine_js_1 = require("../../mee/mee-capability-expansion-engine.js");
const mee_research_finding_store_js_1 = require("../../mee/mee-research-finding-store.js");
const mee_meta_rule_store_js_1 = require("../../mee/mee-meta-rule-store.js");
const mee_research_engine_js_1 = require("../../mee/mee-research-engine.js");
function registerMeeRoutes(router) {
    const workspaceRoot = process.cwd();
    const graphPath = node_path_1.default.resolve(workspaceRoot, "projects/cic/ckg/graph.json");
    const ckg = new ckg_store_js_1.CkgStore(graphPath);
    const trigger = new mee_trigger_js_1.MeeTriggerEngine(ckg);
    const generator = new mee_generator_js_1.MeePhaseGenerator();
    const synth = new mee_synthesizer_js_1.MeePatchSynthesizer();
    const validator = new mee_validator_js_1.MeeValidator();
    const store = new mee_proposal_store_js_1.MeeProposalStore();
    const autoEvolution = new auto_evolution_engine_js_1.AutoEvolutionEngine(trigger, generator, synth, validator, store);
    const diffEngine = new mee_diff_engine_js_1.MeeDiffEngine();
    const graphEngine = new mee_proposal_graph_js_1.MeeProposalGraph(synth, validator);
    const negotiationEngine = new mee_negotiation_engine_js_1.MeeNegotiationEngine();
    const selfRefactor = new self_refactor_engine_js_1.SelfRefactorEngine();
    const llama = (0, llamaClient_js_1.createLlamaClient)();
    const llmClient = {
        async generatePlan(input) {
            const prompt = `You are a planning agent for Cast Iron Charlie.
User Request: ${input.request}
Repository Summary: ${input.repoSummary || "N/A"}
Recent Failures: ${input.recentFailures || "N/A"}

Generate a plan tree consisting of tasks. Each task should have id, title, description, type, and dependsOn (array of dependency task ids).
Return the result strictly in this JSON format:
{
  "rootRequest": "${input.request}",
  "summary": "A short summary of the plan",
  "tasks": [
    {
      "id": "task-1",
      "title": "Create schema file",
      "description": "Define the types and interfaces for the new feature",
      "type": "feature",
      "dependsOn": []
    }
  ]
}
JSON:`;
            try {
                const res = await llama.complete({
                    model: "local-llama",
                    prompt,
                    max_tokens: 1024
                });
                const match = res.text.match(/\{[\s\S]*\}/);
                if (match) {
                    return JSON.parse(match[0]);
                }
            }
            catch (err) {
                console.error("LLM planning failed:", err);
            }
            return {
                rootRequest: input.request,
                summary: `Failed to generate LLM plan. Falling back.`,
                tasks: []
            };
        }
    };
    const healingLLMClient = {
        async suggestHealing(input) {
            const prompt = `You are a self-healing assistant for Cast Iron Charlie.
Original Request: ${input.request}
Failure Message: ${input.failure.errorMessage}
Error Code: ${input.failure.errorCode}
Failing Proposal IDs: ${input.failure.failingProposalIds.join(", ")}
Sandbox Output: ${JSON.stringify(input.failure.sandboxOutput)}

Suggest a healing plan with a summary and a list of suggested tasks to fix this.
Return the result strictly in this JSON format:
{
  "summary": "Short summary of what went wrong and how to fix it",
  "tasks": [
    {
      "title": "Fix target function signature",
      "description": "Adjust the function parameters to match the new schema",
      "type": "fix"
    }
  ]
}
JSON:`;
            try {
                const res = await llama.complete({
                    model: "local-llama",
                    prompt,
                    max_tokens: 1024
                });
                const match = res.text.match(/\{[\s\S]*\}/);
                if (match) {
                    return JSON.parse(match[0]);
                }
            }
            catch (err) {
                console.error("LLM healing suggestion failed:", err);
            }
            return {
                summary: `Self-healing plan for failure: ${input.failure.errorMessage}`,
                tasks: [{ title: "Manual Review Needed", description: "Review the failure and fix it manually", type: "fix" }]
            };
        }
    };
    const selfHealing = new self_healing_engine_js_1.SelfHealingEngine(healingLLMClient);
    const llmPlanning = new llm_planning_engine_js_1.LLMPlanningEngine(llmClient);
    const planningEngine = new planning_engine_js_1.PlanningEngine("deterministic", llmPlanning);
    const runStore = new mee_run_store_js_1.FileMeeRunStore(node_path_1.default.join(workspaceRoot, "projects/cic/data/runs"));
    const runEngine = new mee_run_engine_js_1.MeeRunEngine(runStore);
    const safetyEngine = new safety_engine_js_1.MeeSafetyEngine();
    const sandboxEngine = new sandbox_engine_js_1.MeeSandboxEngine();
    const rollbackEngine = new rollback_engine_js_1.MeeRollbackEngine();
    const autonomousJobStore = new mee_autonomous_store_js_1.FileMeeAutonomousJobStore(node_path_1.default.join(workspaceRoot, "projects/cic/data/jobs"));
    const failureContextStore = new mee_autonomous_store_js_1.FileMeeRunFailureContextStore(node_path_1.default.join(workspaceRoot, "projects/cic/data/failures"));
    const healingPlanStore = new mee_autonomous_store_js_1.FileMeeHealingPlanStore(node_path_1.default.join(workspaceRoot, "projects/cic/data/healing-plans"));
    const memoryStore = new mee_memory_store_js_1.FileMeeMemoryStore(node_path_1.default.join(workspaceRoot, "projects/cic/data/memory"));
    const orchestrator = new mee_agent_orchestrator_js_1.MeeAgentOrchestrator(node_path_1.default.join(workspaceRoot, "projects/cic/data/orchestrator"));
    const plannerAgent = new planner_agent_js_1.PlannerAgent("agent-planner-1", "planner", planningEngine);
    const refactorAgent = new refactor_agent_js_1.RefactorAgent("agent-refactor-1", "refactor");
    const docsAgent = new docs_agent_js_1.DocsAgent("agent-docs-1", "docs");
    const safetyAgent = new safety_agent_js_1.SafetyAgent("agent-safety-1", "safety");
    const researchAgent = new research_agent_js_1.ResearchAgent("agent-research-1", "research");
    orchestrator.registerAgent(plannerAgent);
    orchestrator.registerAgent(refactorAgent);
    orchestrator.registerAgent(docsAgent);
    orchestrator.registerAgent(safetyAgent);
    orchestrator.registerAgent(researchAgent);
    const phaseSpecStore = new mee_phase_spec_store_js_1.FileMeePhaseSpecStore(workspaceRoot);
    const phaseGeneratorEngine = new mee_phase_generator_engine_js_1.MeePhaseGeneratorEngine();
    const refactorEngine = new mee_architecture_refactor_engine_js_1.MeeArchitectureRefactorEngine();
    const expansionEngine = new mee_capability_expansion_engine_js_1.MeeCapabilityExpansionEngine();
    const findingsStore = new mee_research_finding_store_js_1.FileMeeResearchFindingStore(workspaceRoot);
    const metaRulesStore = new mee_meta_rule_store_js_1.FileMeeMetaRuleStore(workspaceRoot);
    const researchEngine = new mee_research_engine_js_1.MeeResearchEngine(findingsStore, metaRulesStore, runStore, failureContextStore, llama);
    const kg = new mee_kg_js_1.MeeKnowledgeGraph(ckg);
    const autonomousEngine = new mee_autonomous_engine_js_1.MeeAutonomousEngine(autonomousJobStore, planningEngine, runEngine, safetyEngine, sandboxEngine, store, synth, validator, rollbackEngine, failureContextStore, selfHealing, healingPlanStore, memoryStore, orchestrator, kg);
    const autonomousScheduler = new mee_scheduler_js_1.MeeScheduler(autonomousJobStore, runEngine, autonomousEngine, workspaceRoot, 2 // concurrencyLimit
    );
    if (process.env.NODE_ENV !== "test") {
        autonomousScheduler.start();
    }
    router.post("/mee/propose", (req, res) => {
        try {
            const events = trigger.detectTriggers();
            const event = events[0] ?? null;
            if (!event) {
                return res.json({
                    ok: true,
                    data: { events: [], proposals: [], proposal: null }
                });
            }
            const plan = generator.generate(event);
            const propId = `prop-${node_crypto_1.default.randomUUID()}`;
            const patchSet = synth.synthesize({
                id: propId,
                title: plan.title,
                trigger: event,
                status: "pending",
                filesCreated: [],
                planSummary: plan.objectives.join("; "),
                timestamp: Date.now()
            });
            const filesCreated = patchSet.patches.map(p => p.path);
            const proposal = {
                id: propId,
                title: plan.title,
                trigger: event,
                status: "pending",
                filesCreated,
                planSummary: plan.objectives.join("; "),
                timestamp: Date.now()
            };
            store.add(proposal);
            res.json({
                ok: true,
                data: { events, proposal, plan }
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to create proposal.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/proposals", (_req, res) => {
        try {
            res.json({
                ok: true,
                data: store.loadAll()
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to load proposals.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/proposals/:id", (req, res) => {
        try {
            const proposal = store.get(req.params.id);
            if (!proposal) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: "not_found.proposal",
                        message: `Proposal ${req.params.id} not found.`,
                        details: { id: req.params.id }
                    }
                });
            }
            res.json({
                ok: true,
                data: proposal
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to load proposal details.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/triggers", (_req, res) => {
        try {
            const events = trigger.detectTriggers();
            res.json({
                ok: true,
                data: { events }
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to detect triggers.",
                    details: {}
                }
            });
        }
    });
    router.post("/mee/validate/:id", (req, res) => {
        try {
            const proposal = store.get(req.params.id);
            if (!proposal) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: "not_found.proposal",
                        message: `Proposal ${req.params.id} not found.`,
                        details: { id: req.params.id }
                    }
                });
            }
            const patchSet = synth.synthesize(proposal);
            // 1. Run safety checks
            const safetyReport = safetyEngine.analyze(patchSet.patches);
            store.update(proposal.id, { safetyReport });
            const hasOverride = req.body?.override === true;
            const isSafetyOk = safetyReport.passed || hasOverride;
            if (!isSafetyOk) {
                store.update(proposal.id, {
                    status: "rejected",
                    validationReport: {
                        passed: false,
                        compilePassed: false,
                        testsPassed: false,
                        driftPassed: false,
                        errors: [`Safety check failed: Risk level is ${safetyReport.riskLevel}. Issues: ${safetyReport.issues.join("; ")}`],
                        issues: safetyReport.issues.map(msg => ({ type: "safety_violation", message: msg }))
                    }
                });
                return res.json({
                    ok: true,
                    data: store.get(proposal.id)
                });
            }
            // 2. Run sandbox execution asynchronously
            (async () => {
                const sandboxResult = await sandboxEngine.validate(patchSet.patches);
                store.update(proposal.id, { sandboxResult });
                if (!sandboxResult.passed) {
                    store.update(proposal.id, {
                        status: "rejected",
                        validationReport: {
                            passed: false,
                            compilePassed: sandboxResult.compilePassed,
                            testsPassed: sandboxResult.testsPassed,
                            driftPassed: false,
                            errors: ["Sandbox build/test failed.", sandboxResult.output],
                            issues: [{ type: "sandbox_failure", message: "Sandbox build/test failed." }]
                        }
                    });
                    return;
                }
                // 3. Run real validation
                const report = await validator.validateAll(patchSet);
                store.update(proposal.id, {
                    status: report.passed ? "validated" : "rejected",
                    validationReport: report
                });
            })().catch((err) => {
                console.error("Async validation failed:", err);
                store.update(proposal.id, {
                    status: "rejected",
                    validationReport: {
                        passed: false,
                        compilePassed: false,
                        testsPassed: false,
                        driftPassed: false,
                        errors: [err.message || "Validation failed."],
                        issues: [{ type: "error", message: err.message || "Validation failed." }]
                    }
                });
            });
            res.json({
                ok: true,
                data: store.get(proposal.id)
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to start validation.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/validation/:id", (req, res) => {
        try {
            const proposal = store.get(req.params.id);
            if (!proposal) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: "not_found.proposal",
                        message: `Proposal ${req.params.id} not found.`,
                        details: { id: req.params.id }
                    }
                });
            }
            res.json({
                ok: true,
                data: proposal.validationReport || null
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to retrieve validation report.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/patch/:id", (req, res) => {
        try {
            const proposal = store.get(req.params.id);
            if (!proposal) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: "not_found.proposal",
                        message: `Proposal ${req.params.id} not found.`,
                        details: { id: req.params.id }
                    }
                });
            }
            const patchSet = synth.synthesize(proposal);
            res.json({
                ok: true,
                data: { proposal, patchSet }
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to synthesize patches.",
                    details: {}
                }
            });
        }
    });
    router.post("/mee/apply/:id", (req, res) => {
        let backupMap = null;
        try {
            const proposal = store.get(req.params.id);
            if (!proposal) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: "not_found.proposal",
                        message: `Proposal ${req.params.id} not found.`,
                        details: { id: req.params.id }
                    }
                });
            }
            const patchSet = synth.synthesize(proposal);
            // Snapshot state
            backupMap = rollbackEngine.snapshot(patchSet.patches);
            const created = [];
            for (const patch of patchSet.patches) {
                const full = node_path_1.default.join(process.cwd(), patch.path);
                node_fs_1.default.mkdirSync(node_path_1.default.dirname(full), { recursive: true });
                node_fs_1.default.writeFileSync(full, patch.content, "utf8");
                created.push(patch.path);
            }
            store.update(proposal.id, {
                status: "applied",
                filesCreated: created
            });
            res.json({
                ok: true,
                data: { proposal: store.get(proposal.id), patchSet }
            });
        }
        catch (err) {
            if (backupMap) {
                try {
                    rollbackEngine.restore(backupMap);
                    console.log(`Successfully rolled back after apply failure for proposal ${req.params.id}`);
                }
                catch (rollErr) {
                    console.error("Rollback restore failed:", rollErr);
                }
            }
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to apply patches. Rollback triggered.",
                    details: {}
                }
            });
        }
    });
    // --- Auto-Evolution endpoints ---
    router.get("/mee/auto/status", (_req, res) => {
        try {
            res.json({
                ok: true,
                data: autoEvolution.status()
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to retrieve auto-evolution status.",
                    details: {}
                }
            });
        }
    });
    router.post("/mee/auto/enable", (req, res) => {
        try {
            const { intervalSeconds, requireApproval } = req.body;
            const intervalMs = (intervalSeconds || 60) * 1000;
            autoEvolution.setRequireApproval(requireApproval !== false);
            autoEvolution.enable(intervalMs);
            res.json({
                ok: true,
                data: { status: autoEvolution.status() }
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to enable auto-evolution.",
                    details: {}
                }
            });
        }
    });
    router.post("/mee/auto/disable", (_req, res) => {
        try {
            autoEvolution.disable();
            res.json({
                ok: true,
                data: { status: autoEvolution.status() }
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to disable auto-evolution.",
                    details: {}
                }
            });
        }
    });
    // --- Phase 30F & 30G New endpoints ---
    router.get("/mee/diff/:id", (req, res) => {
        try {
            const proposal = store.get(req.params.id);
            if (!proposal) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: "not_found.proposal",
                        message: `Proposal ${req.params.id} not found.`,
                        details: { id: req.params.id }
                    }
                });
            }
            const patchSet = synth.synthesize(proposal);
            const diffs = patchSet.patches.map((p) => diffEngine.generateDiff(p));
            res.json({
                ok: true,
                data: { proposal, diffs }
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to generate diffs.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/proposals/graph", (_req, res) => {
        try {
            const proposals = store.loadAll();
            const graph = graphEngine.buildGraph(proposals);
            const nodesDTO = graph.nodes.map(n => ({
                id: n.id,
                title: n.proposal.title,
                status: n.proposal.status
            }));
            res.json({
                ok: true,
                data: {
                    nodes: nodesDTO,
                    edges: graph.edges,
                    conflicts: graph.conflicts
                }
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to build proposals graph.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/proposals/conflicts", (_req, res) => {
        try {
            const proposals = store.loadAll();
            const graph = graphEngine.buildGraph(proposals);
            res.json({
                ok: true,
                data: { conflicts: graph.conflicts }
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to load conflicts.",
                    details: {}
                }
            });
        }
    });
    router.post("/mee/proposals/validate-all", async (_req, res) => {
        try {
            const proposals = store.loadAll();
            const graph = graphEngine.buildGraph(proposals);
            // Block transaction if conflicts exist
            if (graph.conflicts.length > 0) {
                return res.status(400).json({
                    ok: false,
                    error: {
                        code: "validation.conflicts",
                        message: "Conflicts detected between proposals",
                        details: { conflicts: graph.conflicts }
                    }
                });
            }
            const ordered = graphEngine.topologicalSort(graph);
            const reports = [];
            // Validate sequentially
            for (const node of ordered) {
                if (node.patchSet) {
                    // Safety Check
                    const safetyReport = safetyEngine.analyze(node.patchSet.patches);
                    store.update(node.id, { safetyReport });
                    if (!safetyReport.passed) {
                        store.update(node.id, {
                            status: "rejected",
                            validationReport: {
                                passed: false,
                                compilePassed: false,
                                testsPassed: false,
                                driftPassed: false,
                                errors: [`Safety check failed: Risk level is ${safetyReport.riskLevel}. Issues: ${safetyReport.issues.join("; ")}`],
                                issues: safetyReport.issues.map(msg => ({ type: "safety_violation", message: msg }))
                            }
                        });
                        reports.push({
                            id: node.id,
                            passed: false,
                            issues: safetyReport.issues.map(msg => ({ type: "safety_violation", message: msg }))
                        });
                        continue;
                    }
                    // Sandbox Check
                    const sandboxResult = await sandboxEngine.validate(node.patchSet.patches);
                    store.update(node.id, { sandboxResult });
                    if (!sandboxResult.passed) {
                        store.update(node.id, {
                            status: "rejected",
                            validationReport: {
                                passed: false,
                                compilePassed: sandboxResult.compilePassed,
                                testsPassed: sandboxResult.testsPassed,
                                driftPassed: false,
                                errors: ["Sandbox validation failed."],
                                issues: [{ type: "sandbox_failure", message: "Sandbox build/test failed." }]
                            }
                        });
                        reports.push({
                            id: node.id,
                            passed: false,
                            issues: [{ type: "sandbox_failure", message: "Sandbox build/test failed." }]
                        });
                        continue;
                    }
                    // Real validation
                    const report = await validator.validateAll(node.patchSet);
                    store.update(node.id, {
                        status: report.passed ? "validated" : "rejected",
                        validationReport: report
                    });
                    reports.push({
                        id: node.id,
                        passed: report.passed,
                        issues: report.issues || []
                    });
                }
            }
            res.json({
                ok: true,
                data: {
                    ordered: ordered.map(n => n.id),
                    reports
                }
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to validate all proposals.",
                    details: {}
                }
            });
        }
    });
    router.post("/mee/proposals/apply-all", async (_req, res) => {
        try {
            const proposals = store.loadAll();
            const graph = graphEngine.buildGraph(proposals);
            // Abort entire transaction on conflicts
            if (graph.conflicts.length > 0) {
                return res.status(400).json({
                    ok: false,
                    error: {
                        code: "apply.conflicts",
                        message: "Cannot apply proposals due to unresolved conflicts",
                        details: { conflicts: graph.conflicts }
                    }
                });
            }
            const ordered = graphEngine.topologicalSort(graph);
            const applied = [];
            const failed = [];
            // Validate first sequentially
            for (const node of ordered) {
                if (!node.patchSet)
                    continue;
                const report = await validator.validateAll(node.patchSet);
                if (!report.passed) {
                    failed.push(node.id);
                }
            }
            // Abort on validation failures
            if (failed.length > 0) {
                return res.status(400).json({
                    ok: false,
                    error: {
                        code: "apply.validation_failed",
                        message: "One or more proposals failed validation",
                        details: { failed }
                    }
                });
            }
            // Apply patches
            const backups = [];
            try {
                for (const node of ordered) {
                    if (!node.patchSet)
                        continue;
                    // Snapshot state
                    const backupMap = rollbackEngine.snapshot(node.patchSet.patches);
                    backups.push({ id: node.id, backupMap });
                    const created = [];
                    for (const patch of node.patchSet.patches) {
                        const full = node_path_1.default.join(process.cwd(), patch.path);
                        node_fs_1.default.mkdirSync(node_path_1.default.dirname(full), { recursive: true });
                        node_fs_1.default.writeFileSync(full, patch.content, "utf8");
                        created.push(patch.path);
                    }
                    store.update(node.id, {
                        status: "applied",
                        filesCreated: created
                    });
                    applied.push(node.id);
                }
            }
            catch (err) {
                console.error("Apply all failed, initiating rollback in reverse order:", err);
                for (let i = backups.length - 1; i >= 0; i--) {
                    try {
                        rollbackEngine.restore(backups[i].backupMap);
                        store.update(backups[i].id, { status: "rejected" });
                    }
                    catch (rollErr) {
                        console.error(`Rollback restore failed for proposal ${backups[i].id}:`, rollErr);
                    }
                }
                throw err;
            }
            res.json({
                ok: true,
                data: {
                    applied,
                    skipped: []
                }
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to apply all proposals.",
                    details: {}
                }
            });
        }
    });
    // --- Phase 30H New Endpoints ---
    router.post("/mee/proposals/negotiate", (req, res) => {
        try {
            const proposals = store.loadAll();
            const agents = proposals.map((p) => new mee_negotiation_agent_js_1.MeeNegotiationAgent(p, synth.synthesize(p)));
            negotiationEngine.runUntilStable(agents);
            const consensus = negotiationEngine.produceConsensusPlan(agents);
            res.json({
                ok: true,
                data: {
                    consensus,
                    transcript: negotiationEngine.getTranscript()
                }
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to execute negotiation.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/proposals/negotiation/:id", (req, res) => {
        try {
            const transcript = negotiationEngine.getTranscript().filter((t) => t.agentA === req.params.id || t.agentB === req.params.id);
            res.json({
                ok: true,
                data: { transcript }
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to load negotiation transcript.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/proposals/consensus", (_req, res) => {
        try {
            const proposals = store.loadAll();
            const agents = proposals.map((p) => new mee_negotiation_agent_js_1.MeeNegotiationAgent(p, synth.synthesize(p)));
            const consensus = negotiationEngine.produceConsensusPlan(agents);
            res.json({
                ok: true,
                data: { consensus }
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to build consensus plan.",
                    details: {}
                }
            });
        }
    });
    router.post("/mee/refactor/scan", (req, res) => {
        try {
            const mode = req.body?.mode || "repo";
            let files = [];
            if (mode === "inline") {
                files = req.body?.files || [];
                if (!Array.isArray(files)) {
                    return res.status(400).json({
                        ok: false,
                        error: {
                            code: "validation.invalid_payload",
                            message: "files array is required in inline mode",
                            details: {}
                        }
                    });
                }
            }
            else if (mode === "paths") {
                const paths = req.body?.paths || [];
                if (!Array.isArray(paths)) {
                    return res.status(400).json({
                        ok: false,
                        error: {
                            code: "validation.invalid_payload",
                            message: "paths array is required in paths mode",
                            details: {}
                        }
                    });
                }
                for (const p of paths) {
                    const fullPath = node_path_1.default.resolve(process.cwd(), p);
                    if (node_fs_1.default.existsSync(fullPath)) {
                        const content = node_fs_1.default.readFileSync(fullPath, "utf8");
                        const relativePath = node_path_1.default.relative(process.cwd(), fullPath).replace(/\\/g, "/");
                        files.push({ path: relativePath, content });
                    }
                }
            }
            else {
                const targetDir = node_path_1.default.resolve(process.cwd(), "projects/cic/src/mee");
                const getFilesRecursively = (dir) => {
                    const results = [];
                    if (!node_fs_1.default.existsSync(dir))
                        return results;
                    const list = node_fs_1.default.readdirSync(dir);
                    for (const file of list) {
                        const fullPath = node_path_1.default.join(dir, file);
                        const stat = node_fs_1.default.statSync(fullPath);
                        if (stat && stat.isDirectory()) {
                            results.push(...getFilesRecursively(fullPath));
                        }
                        else if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
                            const content = node_fs_1.default.readFileSync(fullPath, "utf8");
                            const relativePath = node_path_1.default.relative(process.cwd(), fullPath).replace(/\\/g, "/");
                            results.push({ path: relativePath, content });
                        }
                    }
                    return results;
                };
                files = getFilesRecursively(targetDir);
            }
            const insights = selfRefactor.scan(files);
            res.json({ ok: true, data: { insights } });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Refactor scan failed.",
                    details: {}
                }
            });
        }
    });
    router.post("/mee/refactor/propose", (req, res) => {
        try {
            const insights = req.body?.insights;
            if (!insights || !Array.isArray(insights)) {
                return res.status(400).json({
                    ok: false,
                    error: {
                        code: "validation.invalid_payload",
                        message: "Insights array is required.",
                        details: {}
                    }
                });
            }
            if (!insights.every(mee_schema_js_1.isRefactorInsight)) {
                return res.status(400).json({
                    ok: false,
                    error: {
                        code: "validation.invalid_schema",
                        message: "One or more items in insights array do not match RefactorInsight schema.",
                        details: {}
                    }
                });
            }
            const plan = selfRefactor.generatePlan(insights);
            const proposal = selfRefactor.toProposal(plan);
            store.add(proposal);
            res.json({ ok: true, data: { proposalId: proposal.id, proposal } });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Refactor proposal generation failed.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/refactor/plan/:id", (req, res) => {
        try {
            const proposal = store.get(req.params.id);
            if (!proposal) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: "not_found.proposal",
                        message: `Proposal ${req.params.id} not found.`,
                        details: { id: req.params.id }
                    }
                });
            }
            if (!proposal.refactorPlan) {
                return res.status(400).json({
                    ok: false,
                    error: {
                        code: "validation.invalid_proposal",
                        message: "Proposal does not contain a refactor plan.",
                        details: { id: req.params.id }
                    }
                });
            }
            res.json({ ok: true, data: { plan: proposal.refactorPlan } });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to retrieve refactor plan.",
                    details: {}
                }
            });
        }
    });
    router.post("/mee/plan", (req, res) => {
        try {
            const { request } = req.body;
            if (!request) {
                return res.status(400).json({
                    ok: false,
                    error: { code: "validation.invalid_payload", message: "request is required" }
                });
            }
            const plan = planningEngine.generatePlan(request);
            const proposals = planningEngine.generateProposals(plan);
            proposals.forEach((p) => store.add(p));
            res.json({
                ok: true,
                data: {
                    plan,
                    proposalIds: proposals.map((p) => p.id),
                },
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Planning execution failed.",
                    details: {}
                }
            });
        }
    });
    router.post("/mee/runs", (req, res) => {
        try {
            const { proposalIds, planId } = req.body || {};
            if (!proposalIds || !Array.isArray(proposalIds) || proposalIds.length === 0) {
                return res.status(400).json({
                    ok: false,
                    error: {
                        code: "validation.invalid_payload",
                        message: "proposalIds array is required and must not be empty",
                        details: {}
                    }
                });
            }
            const run = runEngine.createRun({ proposalIds, planId });
            runEngine.startRun(run.id);
            return res.json({ ok: true, data: { run } });
        }
        catch (err) {
            return res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to create run.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/runs", (_req, res) => {
        try {
            const runs = runStore.listRuns();
            return res.json({ ok: true, data: { runs } });
        }
        catch (err) {
            return res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to list runs.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/runs/:id", (req, res) => {
        try {
            const run = runStore.getRun(req.params.id);
            if (!run) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: "not_found.run",
                        message: "Run not found",
                        details: { id: req.params.id }
                    }
                });
            }
            const checkpoints = runStore.getCheckpoints(run.id);
            return res.json({ ok: true, data: { run, checkpoints } });
        }
        catch (err) {
            return res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to retrieve run.",
                    details: {}
                }
            });
        }
    });
    router.post("/mee/runs/:id/checkpoint", (req, res) => {
        try {
            const { label, data } = req.body || {};
            const cp = runEngine.checkpoint(req.params.id, label, data || {});
            if (!cp) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: "not_found.run",
                        message: "Run not found",
                        details: { id: req.params.id }
                    }
                });
            }
            return res.json({ ok: true, data: { checkpoint: cp } });
        }
        catch (err) {
            return res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to create checkpoint.",
                    details: {}
                }
            });
        }
    });
    router.post("/mee/runs/:id/cancel", (req, res) => {
        try {
            const run = runEngine.cancelRun(req.params.id);
            if (!run) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: "not_found.run",
                        message: "Run not found",
                        details: { id: req.params.id }
                    }
                });
            }
            return res.json({ ok: true, data: { run } });
        }
        catch (err) {
            return res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to cancel run.",
                    details: {}
                }
            });
        }
    });
    router.post("/mee/proposals/:id/override", (req, res) => {
        try {
            const proposal = store.get(req.params.id);
            if (!proposal) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: "not_found.proposal",
                        message: `Proposal ${req.params.id} not found.`,
                        details: { id: req.params.id }
                    }
                });
            }
            if (proposal.safetyReport) {
                proposal.safetyReport.passed = true;
                store.update(proposal.id, { safetyReport: proposal.safetyReport });
            }
            return res.json({ ok: true, data: store.get(proposal.id) });
        }
        catch (err) {
            return res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to override safety check.",
                    details: {}
                }
            });
        }
    });
    router.post("/mee/autonomous/jobs", async (req, res) => {
        try {
            const { request, planningMode, priority, dependsOnJobIds } = req.body;
            if (!request) {
                return res.status(400).json({
                    ok: false,
                    error: { message: "Missing request parameter" }
                });
            }
            const job = autonomousEngine.createJob(request, planningMode);
            job.priority = priority !== undefined ? Number(priority) : 0;
            job.dependsOnJobIds = dependsOnJobIds || [];
            autonomousJobStore.save(job);
            res.json({
                ok: true,
                data: { job }
            });
        }
        catch (err) {
            res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to create autonomous job.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/autonomous/jobs", (_req, res) => {
        try {
            const jobs = autonomousJobStore.list();
            return res.json({ ok: true, data: { jobs } });
        }
        catch (err) {
            return res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to list autonomous jobs.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/autonomous/jobs/:id", (req, res) => {
        try {
            const job = autonomousJobStore.get(req.params.id);
            if (!job) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: "not_found.job",
                        message: "Autonomous job not found",
                        details: { id: req.params.id }
                    }
                });
            }
            return res.json({ ok: true, data: { job } });
        }
        catch (err) {
            return res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to retrieve autonomous job.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/autonomous/jobs/:id/healing-plan", (req, res) => {
        try {
            const plan = healingPlanStore.getByParentJob(req.params.id);
            if (!plan) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: "not_found.healing_plan",
                        message: "No healing plan found",
                        details: { id: req.params.id }
                    }
                });
            }
            return res.json({ ok: true, data: { plan } });
        }
        catch (err) {
            return res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to retrieve healing plan.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/autonomous/jobs/:id/failure-context", (req, res) => {
        try {
            const failure = failureContextStore.getByJob(req.params.id);
            if (!failure) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: "not_found.failure_context",
                        message: "No failure context found",
                        details: { id: req.params.id }
                    }
                });
            }
            return res.json({ ok: true, data: { failure } });
        }
        catch (err) {
            return res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to retrieve failure context.",
                    details: {}
                }
            });
        }
    });
    router.post("/mee/autonomous/jobs/:id/healing/start", async (req, res) => {
        try {
            const plan = healingPlanStore.getByParentJob(req.params.id);
            if (!plan) {
                return res.status(404).json({
                    ok: false,
                    error: {
                        code: "not_found.healing_plan",
                        message: "No healing plan found to trigger healing.",
                        details: { id: req.params.id }
                    }
                });
            }
            const job = autonomousEngine.createJob(plan.summary);
            job.parentJobId = req.params.id;
            autonomousJobStore.save(job);
            const started = await autonomousEngine.startJob(job.id);
            return res.json({ ok: true, data: { job: started || job } });
        }
        catch (err) {
            return res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to start healing job.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/autonomous/jobs/:id/agents", (req, res) => {
        try {
            const jobId = req.params.id;
            const tasks = orchestrator.getTasksForJob(jobId);
            const exchanges = orchestrator.getExchangesForJob(jobId);
            return res.json({
                ok: true,
                data: { tasks, exchanges }
            });
        }
        catch (err) {
            return res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to retrieve job agents info.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/autonomous/jobs/:id/memory", (req, res) => {
        try {
            const jobId = req.params.id;
            const items = memoryStore.queryByJob(jobId);
            return res.json({
                ok: true,
                data: { items }
            });
        }
        catch (err) {
            return res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to retrieve job memory items.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/autonomous/jobs/:id/consensus", (req, res) => {
        try {
            const jobId = req.params.id;
            const job = autonomousJobStore.get(jobId);
            if (!job) {
                return res.status(404).json({
                    ok: false,
                    error: { message: "Job not found" }
                });
            }
            const consensus = orchestrator.getConsensusForJob(jobId, job.proposalIds);
            return res.json({
                ok: true,
                data: { consensus }
            });
        }
        catch (err) {
            return res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to retrieve job consensus.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/autonomous/jobs/:id/kg", (req, res) => {
        try {
            const graph = kg.getGraph();
            return res.json({
                ok: true,
                data: { graph }
            });
        }
        catch (err) {
            return res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to retrieve knowledge graph.",
                    details: {}
                }
            });
        }
    });
    router.get("/mee/autonomous/scheduler/status", (_req, res) => {
        try {
            const status = autonomousScheduler.getQueueState();
            return res.json({
                ok: true,
                data: status
            });
        }
        catch (err) {
            return res.status(500).json({
                ok: false,
                error: {
                    code: "internal.exception",
                    message: err.message || "Failed to retrieve scheduler status.",
                    details: {}
                }
            });
        }
    });
    // --- Phase 43: Autonomous Phase Generation (APG) ---
    router.get("/mee/phases", (_req, res) => {
        try {
            res.json({ ok: true, data: phaseSpecStore.loadAll() });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: { message: err.message } });
        }
    });
    router.post("/mee/phases/generate", async (req, res) => {
        try {
            const gaps = trigger.detectTriggers();
            const findings = gaps.map((gap) => ({
                id: `finding-${node_crypto_1.default.randomUUID()}`,
                title: `Research Discovery: ${gap.type}`,
                description: `Discovered discrepancies in CKG: ${JSON.stringify(gap.payload)}`,
                evidence: [gap.id],
                severity: "high",
                category: "gap",
                timestamp: Date.now()
            }));
            if (findings.length === 0) {
                findings.push({
                    id: `finding-${node_crypto_1.default.randomUUID()}`,
                    title: "Research Discovery: Codebase Verification",
                    description: "Routine verification audit has flagged component test density optimizations.",
                    evidence: [],
                    severity: "low",
                    category: "opportunity",
                    timestamp: Date.now()
                });
            }
            const activePhases = phaseSpecStore.loadAll();
            const nextPhaseNumber = Math.max(42, ...activePhases.map((p) => p.phaseNumber)) + 1;
            const spec = phaseGeneratorEngine.generatePhaseSpec(findings, nextPhaseNumber);
            phaseSpecStore.add(spec);
            const consensusResult = await phaseGeneratorEngine.runValidationRound(spec, orchestrator, `job-spec-${node_crypto_1.default.randomUUID()}`);
            res.json({ ok: true, data: { spec, consensusResult } });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: { message: err.message } });
        }
    });
    router.post("/mee/phases/:id/approve", async (req, res) => {
        try {
            const phase = phaseSpecStore.get(req.params.id);
            if (!phase) {
                return res.status(404).json({ ok: false, error: { message: "Phase spec not found" } });
            }
            phaseSpecStore.update(phase.id, { status: "approved" });
            const requestText = `Implement objectives for Phase ${phase.phaseNumber}: ${phase.title}. Objectives: ${phase.objectives.join("; ")}`;
            const job = autonomousEngine.createJob(requestText, "hybrid");
            await autonomousEngine.startJob(job.id);
            res.json({ ok: true, data: { phase: phaseSpecStore.get(phase.id), job } });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: { message: err.message } });
        }
    });
    router.post("/mee/phases/:id/reject", (req, res) => {
        try {
            const phase = phaseSpecStore.get(req.params.id);
            if (!phase) {
                return res.status(404).json({ ok: false, error: { message: "Phase spec not found" } });
            }
            phaseSpecStore.update(phase.id, { status: "rejected" });
            res.json({ ok: true, data: phaseSpecStore.get(phase.id) });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: { message: err.message } });
        }
    });
    // --- Phase 44: Autonomous Architecture Refactoring (AAR) ---
    router.get("/mee/refactor/opportunities", (_req, res) => {
        try {
            const opps = refactorEngine.scan(kg);
            res.json({ ok: true, data: { opportunities: opps } });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: { message: err.message } });
        }
    });
    router.post("/mee/refactor/propose", (req, res) => {
        try {
            const { opportunity } = req.body;
            if (!opportunity) {
                return res.status(400).json({ ok: false, error: { message: "Opportunity is required" } });
            }
            const proposal = refactorEngine.proposeRefactor(opportunity);
            store.add(proposal);
            res.json({ ok: true, data: { proposal } });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: { message: err.message } });
        }
    });
    router.post("/mee/refactor/apply", async (req, res) => {
        try {
            const { proposalId } = req.body;
            const proposal = store.get(proposalId);
            if (!proposal) {
                return res.status(404).json({ ok: false, error: { message: "Proposal not found" } });
            }
            await refactorEngine.applyRefactorPatch(proposal, workspaceRoot);
            proposal.status = "applied";
            store.update(proposal.id, { status: "applied" });
            res.json({ ok: true, data: { proposal } });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: { message: err.message } });
        }
    });
    // --- Phase 45: Autonomous Capability Expansion (ACE) ---
    router.get("/mee/expansion/specs", (_req, res) => {
        try {
            const specs = expansionEngine.detectGaps(kg);
            res.json({ ok: true, data: { specs } });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: { message: err.message } });
        }
    });
    router.post("/mee/expansion/propose", (req, res) => {
        try {
            const { spec } = req.body;
            if (!spec) {
                return res.status(400).json({ ok: false, error: { message: "Capability spec is required" } });
            }
            const proposal = expansionEngine.generateProposal(spec);
            store.add(proposal);
            res.json({ ok: true, data: { proposal } });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: { message: err.message } });
        }
    });
    router.post("/mee/expansion/apply", async (req, res) => {
        try {
            const { spec } = req.body;
            if (!spec) {
                return res.status(400).json({ ok: false, error: { message: "Capability spec is required" } });
            }
            await expansionEngine.applyExpansion(spec, kg, workspaceRoot);
            res.json({ ok: true, data: { spec } });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: { message: err.message } });
        }
    });
    // --- Phase 42: Autonomous Research Loop & Mode ---
    router.get("/mee/research/findings", (_req, res) => {
        try {
            res.json({ ok: true, data: { findings: findingsStore.loadAll() } });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: { message: err.message } });
        }
    });
    router.post("/mee/research/scan", async (_req, res) => {
        try {
            const result = await researchEngine.runResearchScan(kg);
            res.json({ ok: true, data: result });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: { message: err.message } });
        }
    });
    router.post("/mee/research/findings/:id/approve", async (req, res) => {
        try {
            const finding = findingsStore.get(req.params.id);
            if (!finding) {
                return res.status(404).json({ ok: false, error: { message: "Finding not found" } });
            }
            findingsStore.update(finding.id, { status: "approved" });
            // Trigger APG phase generation from this approved finding
            const activePhases = phaseSpecStore.loadAll();
            const nextPhaseNumber = Math.max(45, ...activePhases.map((p) => p.phaseNumber)) + 1;
            const spec = phaseGeneratorEngine.generatePhaseSpec([finding], nextPhaseNumber);
            phaseSpecStore.add(spec);
            // Run multi-agent critique validation
            const consensusResult = await phaseGeneratorEngine.runValidationRound(spec, orchestrator, `job-spec-${node_crypto_1.default.randomUUID()}`);
            findingsStore.update(finding.id, { status: "promoted" });
            res.json({ ok: true, data: { finding: findingsStore.get(finding.id), spec, consensusResult } });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: { message: err.message } });
        }
    });
    router.post("/mee/research/findings/:id/reject", (req, res) => {
        try {
            const finding = findingsStore.get(req.params.id);
            if (!finding) {
                return res.status(404).json({ ok: false, error: { message: "Finding not found" } });
            }
            findingsStore.update(finding.id, { status: "rejected" });
            res.json({ ok: true, data: findingsStore.get(finding.id) });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: { message: err.message } });
        }
    });
    router.get("/mee/research/meta-rules", (_req, res) => {
        try {
            res.json({ ok: true, data: { rules: metaRulesStore.loadAll() } });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: { message: err.message } });
        }
    });
}
//# sourceMappingURL=mee-routes.js.map