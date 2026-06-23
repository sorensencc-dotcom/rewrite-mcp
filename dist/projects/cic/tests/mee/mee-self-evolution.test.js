"use strict";
// File: projects/cic/tests/mee/mee-self-evolution.test.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const mee_phase_generator_engine_js_1 = require("../../src/mee/mee-phase-generator-engine.js");
const research_agent_js_1 = require("../../src/mee/research-agent.js");
const mee_phase_spec_store_js_1 = require("../../src/mee/mee-phase-spec-store.js");
const mee_architecture_refactor_engine_js_1 = require("../../src/mee/mee-architecture-refactor-engine.js");
const mee_capability_expansion_engine_js_1 = require("../../src/mee/mee-capability-expansion-engine.js");
const mee_kg_js_1 = require("../../src/mee/mee-kg.js");
const ckg_store_js_1 = require("../../src/ckg/ckg-store.js");
const mee_agent_orchestrator_js_1 = require("../../src/mee/mee-agent-orchestrator.js");
const planner_agent_js_1 = require("../../src/mee/planner-agent.js");
const safety_agent_js_1 = require("../../src/mee/safety-agent.js");
const planning_engine_js_1 = require("../../src/mee/planning/planning-engine.js");
(0, vitest_1.describe)("Mee Self-Evolution Subsystems (Phase 43, 44, 45)", () => {
    const tempDir = node_path_1.default.resolve(process.cwd(), "projects/cic/tests/mee/temp-evolution-tests");
    const tempGraphPath = node_path_1.default.join(tempDir, "graph.json");
    let ckg;
    let kg;
    (0, vitest_1.beforeEach)(() => {
        if (node_fs_1.default.existsSync(tempDir)) {
            node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
        node_fs_1.default.mkdirSync(tempDir, { recursive: true });
        ckg = new ckg_store_js_1.CkgStore(tempGraphPath);
        kg = new mee_kg_js_1.MeeKnowledgeGraph(ckg);
    });
    (0, vitest_1.afterEach)(() => {
        if (node_fs_1.default.existsSync(tempDir)) {
            node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
    });
    (0, vitest_1.describe)("Phase 43 — Autonomous Phase Generation (APG)", () => {
        (0, vitest_1.it)("should generate a valid Phase Spec from research findings", () => {
            const engine = new mee_phase_generator_engine_js_1.MeePhaseGeneratorEngine();
            const findings = [
                {
                    id: "find-1",
                    title: "Memory leak in task supervisor",
                    description: "Task queues accumulate metadata without clean references.",
                    evidence: ["run-1"],
                    severity: "high",
                    category: "bug",
                    timestamp: Date.now()
                }
            ];
            const spec = engine.generatePhaseSpec(findings, 46);
            (0, vitest_1.expect)(spec.phaseNumber).toBe(46);
            (0, vitest_1.expect)(spec.title).toContain("Memory leak");
            (0, vitest_1.expect)(spec.findings.length).toBe(1);
            (0, vitest_1.expect)(spec.score).toBeGreaterThan(0);
        });
        (0, vitest_1.it)("should score phase specs correctly", () => {
            const engine = new mee_phase_generator_engine_js_1.MeePhaseGeneratorEngine();
            const spec = engine.generatePhaseSpec([], 43);
            const score = engine.scorePhaseSpec(spec);
            (0, vitest_1.expect)(score).toBe(spec.score);
        });
        (0, vitest_1.it)("should run multi-agent critique validation on spec", async () => {
            const engine = new mee_phase_generator_engine_js_1.MeePhaseGeneratorEngine();
            const spec = engine.generatePhaseSpec([], 43);
            const orchestrator = new mee_agent_orchestrator_js_1.MeeAgentOrchestrator(tempDir);
            orchestrator.registerAgent(new planner_agent_js_1.PlannerAgent("planner-1", "planner", new planning_engine_js_1.PlanningEngine()));
            orchestrator.registerAgent(new safety_agent_js_1.SafetyAgent("safety-1", "safety"));
            orchestrator.registerAgent(new research_agent_js_1.ResearchAgent("research-1", "research"));
            const result = await engine.runValidationRound(spec, orchestrator, "job-1");
            (0, vitest_1.expect)(result.decision).toBeDefined();
            (0, vitest_1.expect)(result.score).toBeDefined();
        });
        (0, vitest_1.it)("should persist phases to FileMeePhaseSpecStore", () => {
            const store = new mee_phase_spec_store_js_1.FileMeePhaseSpecStore(tempDir);
            const spec = new mee_phase_generator_engine_js_1.MeePhaseGeneratorEngine().generatePhaseSpec([], 43);
            store.add(spec);
            const all = store.loadAll();
            (0, vitest_1.expect)(all.length).toBe(1);
            (0, vitest_1.expect)(all[0].id).toBe(spec.id);
            store.update(spec.id, { status: "approved" });
            const updated = store.get(spec.id);
            (0, vitest_1.expect)(updated?.status).toBe("approved");
        });
    });
    (0, vitest_1.describe)("Phase 44 — Autonomous Architecture Refactoring (AAR)", () => {
        (0, vitest_1.it)("should identify refactor opportunities in fragile modules", () => {
            // Record a failure node
            kg.recordProposalNode("prop-1", "Clean Proposal", "Summary", ["src/fragile.ts"]);
            kg.recordFailureNode("fail-1", "prop-1", "validation_failed", "Vitest failed");
            const engine = new mee_architecture_refactor_engine_js_1.MeeArchitectureRefactorEngine();
            const opportunities = engine.scan(kg);
            (0, vitest_1.expect)(opportunities.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(opportunities.some(o => o.file === "src/fragile.ts")).toBe(true);
        });
        (0, vitest_1.it)("should generate refactor proposals", () => {
            const engine = new mee_architecture_refactor_engine_js_1.MeeArchitectureRefactorEngine();
            const opp = {
                id: "opp-1",
                file: "src/fragile.ts",
                type: "complexity",
                description: "High volatility",
                severity: "high",
                suggestedAction: "Refactor nested ifs"
            };
            const proposal = engine.proposeRefactor(opp);
            (0, vitest_1.expect)(proposal.title).toContain("fragile.ts");
            (0, vitest_1.expect)(proposal.refactorPlan).toBeDefined();
            (0, vitest_1.expect)(proposal.refactorPlan?.patches.length).toBe(1);
        });
        (0, vitest_1.it)("should update architecture docs when refactor applied", async () => {
            const docPath = node_path_1.default.join(tempDir, "docs/cic/CIC_SYSTEM.md");
            node_fs_1.default.mkdirSync(node_path_1.default.dirname(docPath), { recursive: true });
            node_fs_1.default.writeFileSync(docPath, "# CIC System\n## 18. Self-Refactor & Evolution Log\n", "utf8");
            const engine = new mee_architecture_refactor_engine_js_1.MeeArchitectureRefactorEngine();
            const opp = {
                id: "opp-1",
                file: "src/fragile.ts",
                type: "complexity",
                description: "High volatility",
                severity: "high",
                suggestedAction: "Refactor nested ifs"
            };
            const proposal = engine.proposeRefactor(opp);
            await engine.applyRefactorPatch(proposal, tempDir);
            const content = node_fs_1.default.readFileSync(docPath, "utf8");
            (0, vitest_1.expect)(content).toContain("Refactor Log Entry");
            (0, vitest_1.expect)(content).toContain(proposal.id);
        });
    });
    (0, vitest_1.describe)("Phase 45 — Autonomous Capability Expansion (ACE)", () => {
        (0, vitest_1.it)("should detect capability gaps from CKG", () => {
            const engine = new mee_capability_expansion_engine_js_1.MeeCapabilityExpansionEngine();
            const gaps = engine.detectGaps(kg);
            (0, vitest_1.expect)(gaps.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(gaps[0].title).toBeDefined();
        });
        (0, vitest_1.it)("should generate capability proposal with create patch", () => {
            const engine = new mee_capability_expansion_engine_js_1.MeeCapabilityExpansionEngine();
            const spec = engine.detectGaps(kg)[0];
            const proposal = engine.generateProposal(spec);
            (0, vitest_1.expect)(proposal.title).toContain(spec.title);
            (0, vitest_1.expect)(proposal.patches.length).toBe(1);
            (0, vitest_1.expect)(proposal.patches[0].type).toBe("create");
        });
        (0, vitest_1.it)("should execute capability expansion on application", async () => {
            const docPath = node_path_1.default.join(tempDir, "docs/cic/CIC_SYSTEM.md");
            node_fs_1.default.mkdirSync(node_path_1.default.dirname(docPath), { recursive: true });
            node_fs_1.default.writeFileSync(docPath, "# CIC System\n## 19. Capability Expansion Registry\n", "utf8");
            const engine = new mee_capability_expansion_engine_js_1.MeeCapabilityExpansionEngine();
            const spec = engine.detectGaps(kg)[0];
            await engine.applyExpansion(spec, kg, tempDir);
            // Verify file written
            const targetFile = node_path_1.default.join(tempDir, "projects/cic/src/mee/expanded-capabilities.ts");
            (0, vitest_1.expect)(node_fs_1.default.existsSync(targetFile)).toBe(true);
            // Verify node appended to CKG
            const nodes = ckg.load().nodes;
            (0, vitest_1.expect)(nodes.some(n => n.id === `capability:${spec.id}`)).toBe(true);
            // Verify doc updated
            const docContent = node_fs_1.default.readFileSync(docPath, "utf8");
            (0, vitest_1.expect)(docContent).toContain("Capability Integration");
            (0, vitest_1.expect)(docContent).toContain(spec.id);
        });
    });
});
//# sourceMappingURL=mee-self-evolution.test.js.map