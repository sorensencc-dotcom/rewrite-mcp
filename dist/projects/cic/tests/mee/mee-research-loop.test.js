"use strict";
// File: projects/cic/tests/mee/mee-research-loop.test.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const mee_research_finding_store_js_1 = require("../../src/mee/mee-research-finding-store.js");
const mee_meta_rule_store_js_1 = require("../../src/mee/mee-meta-rule-store.js");
const mee_research_engine_js_1 = require("../../src/mee/mee-research-engine.js");
const mee_run_store_js_1 = require("../../src/mee/mee-run-store.js");
const mee_autonomous_store_js_1 = require("../../src/mee/mee-autonomous-store.js");
const mee_kg_js_1 = require("../../src/mee/mee-kg.js");
const ckg_store_js_1 = require("../../src/ckg/ckg-store.js");
const mee_phase_generator_engine_js_1 = require("../../src/mee/mee-phase-generator-engine.js");
const mee_phase_spec_store_js_1 = require("../../src/mee/mee-phase-spec-store.js");
(0, vitest_1.describe)("Phase 42 — Autonomous Research Loop & Mode", () => {
    const tempDir = node_path_1.default.resolve(process.cwd(), "projects/cic/tests/mee/temp-research-tests");
    const tempGraphPath = node_path_1.default.join(tempDir, "graph.json");
    let ckg;
    let kg;
    let findingsStore;
    let metaRulesStore;
    let runStore;
    let failureStore;
    (0, vitest_1.beforeEach)(() => {
        if (node_fs_1.default.existsSync(tempDir)) {
            try {
                node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
            }
            catch (e) { }
        }
        node_fs_1.default.mkdirSync(tempDir, { recursive: true });
        ckg = new ckg_store_js_1.CkgStore(tempGraphPath);
        kg = new mee_kg_js_1.MeeKnowledgeGraph(ckg);
        findingsStore = new mee_research_finding_store_js_1.FileMeeResearchFindingStore(tempDir);
        metaRulesStore = new mee_meta_rule_store_js_1.FileMeeMetaRuleStore(tempDir);
        findingsStore.saveAll([]);
        metaRulesStore.saveAll([]);
        runStore = new mee_run_store_js_1.FileMeeRunStore(node_path_1.default.join(tempDir, "runs"));
        failureStore = new mee_autonomous_store_js_1.FileMeeRunFailureContextStore(node_path_1.default.join(tempDir, "failures"));
    });
    (0, vitest_1.afterEach)(() => {
        if (node_fs_1.default.existsSync(tempDir)) {
            node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
    });
    (0, vitest_1.it)("should persist findings to FileMeeResearchFindingStore", () => {
        const finding = {
            id: "find-1",
            title: "Complexity hotspot in engine",
            description: "nested conditions detected",
            evidence: [],
            severity: "medium",
            category: "opportunity",
            status: "draft",
            timestamp: Date.now()
        };
        findingsStore.add(finding);
        const all = findingsStore.loadAll();
        (0, vitest_1.expect)(all.length).toBe(1);
        (0, vitest_1.expect)(all[0].id).toBe("find-1");
        findingsStore.update("find-1", { status: "approved" });
        const updated = findingsStore.get("find-1");
        (0, vitest_1.expect)(updated?.status).toBe("approved");
    });
    (0, vitest_1.it)("should persist meta-rules to FileMeeMetaRuleStore", () => {
        const rule = {
            id: "rule-1",
            name: "Throttle concurrency limit",
            description: "reduce concurrency on failures",
            heuristicType: "scheduler_concurrency",
            weight: 0.9,
            conditions: ["run_failure"],
            action: "reduce_limit_to_1",
            timestamp: Date.now()
        };
        metaRulesStore.add(rule);
        const all = metaRulesStore.loadAll();
        (0, vitest_1.expect)(all.length).toBe(1);
        (0, vitest_1.expect)(all[0].id).toBe("rule-1");
    });
    (0, vitest_1.it)("should execute manual research scan and generate discoveries", async () => {
        // Record a failure node and a run context
        kg.recordProposalNode("prop-1", "Failing Proposal", "Summary", ["src/main.ts"]);
        kg.recordFailureNode("fail-1", "prop-1", "Vitest timeout", "Execution failed");
        // Add run history and failure context
        runStore.saveRun({
            id: "run-fail",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: "failed",
            proposalIds: ["prop-1"],
            currentStepIndex: 0,
            totalSteps: 2
        });
        failureStore.save({
            runId: "run-fail",
            createdAt: new Date().toISOString(),
            failingProposalIds: ["prop-1"],
            errorMessage: "Vitest timeout",
            errorCode: "vitest.timeout"
        });
        const engine = new mee_research_engine_js_1.MeeResearchEngine(findingsStore, metaRulesStore, runStore, failureStore);
        const result = await engine.runResearchScan(kg);
        (0, vitest_1.expect)(result.findings.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.rules.length).toBeGreaterThan(0);
        const savedFindings = findingsStore.loadAll();
        (0, vitest_1.expect)(savedFindings.length).toBe(result.findings.length);
        (0, vitest_1.expect)(savedFindings[0].severity).toBe("high");
        (0, vitest_1.expect)(savedFindings[0].category).toBe("bug");
        (0, vitest_1.expect)(savedFindings[0].evidence).toContain("run-fail");
        const savedRules = metaRulesStore.loadAll();
        (0, vitest_1.expect)(savedRules[0].heuristicType).toBe("scheduler_concurrency");
    });
    (0, vitest_1.it)("should approve finding and generate draft phase spec", () => {
        const finding = {
            id: "find-2",
            title: "Verification Finding",
            description: "Test density optimizations",
            evidence: [],
            severity: "low",
            category: "opportunity",
            status: "draft",
            timestamp: Date.now()
        };
        findingsStore.add(finding);
        const specStore = new mee_phase_spec_store_js_1.FileMeePhaseSpecStore(tempDir);
        const generator = new mee_phase_generator_engine_js_1.MeePhaseGeneratorEngine();
        const spec = generator.generatePhaseSpec([finding], 46);
        specStore.add(spec);
        (0, vitest_1.expect)(spec.phaseNumber).toBe(46);
        (0, vitest_1.expect)(spec.findings[0].id).toBe("find-2");
        (0, vitest_1.expect)(specStore.loadAll().length).toBe(1);
    });
});
//# sourceMappingURL=mee-research-loop.test.js.map