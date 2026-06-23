"use strict";
// File: projects/cic/tests/mee/mee-verification-regression.test.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const mee_schema_js_1 = require("../../src/mee/mee-schema.js");
const mee_research_finding_store_js_1 = require("../../src/mee/mee-research-finding-store.js");
const mee_phase_spec_store_js_1 = require("../../src/mee/mee-phase-spec-store.js");
const mee_meta_rule_store_js_1 = require("../../src/mee/mee-meta-rule-store.js");
(0, vitest_1.describe)("MEE Strict Schema Validation & Store Constraints", () => {
    let tempDir;
    (0, vitest_1.beforeEach)(() => {
        tempDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), "mee-test-"));
    });
    (0, vitest_1.afterEach)(() => {
        node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
    });
    (0, vitest_1.describe)("Type Guards", () => {
        const validFinding = {
            id: "finding-1",
            title: "Test Finding",
            description: "Test finding description",
            evidence: ["evidence-1"],
            severity: "low",
            category: "opportunity",
            timestamp: Date.now(),
            status: "draft"
        };
        const validPhaseSpec = {
            id: "phase-spec-1",
            phaseNumber: 42,
            title: "Test Phase",
            purpose: "Test purpose",
            objectives: ["objective-1"],
            tasks: ["task-1"],
            requiredCapabilities: ["capability-1"],
            estimatedImpact: 80,
            feasibility: 90,
            risk: 10,
            alignment: 100,
            score: 85,
            status: "draft",
            findings: [validFinding],
            timestamp: Date.now()
        };
        const validMetaRule = {
            id: "rule-1",
            name: "Test Heuristic",
            description: "Test description",
            heuristicType: "consensus_weight",
            weight: 0.75,
            conditions: ["condition-1"],
            action: "action-1",
            timestamp: Date.now()
        };
        const validRefactorInsight = {
            id: "insight-1",
            file: "test-file.ts",
            type: "complexity",
            message: "Complexity is too high",
            severity: "medium",
            location: {
                startLine: 10,
                endLine: 20
            }
        };
        (0, vitest_1.it)("should pass valid ResearchFinding objects", () => {
            (0, vitest_1.expect)((0, mee_schema_js_1.isResearchFinding)(validFinding)).toBe(true);
        });
        (0, vitest_1.it)("should reject invalid ResearchFinding objects", () => {
            const invalid = { ...validFinding, severity: "invalid_severity" };
            (0, vitest_1.expect)((0, mee_schema_js_1.isResearchFinding)(invalid)).toBe(false);
        });
        (0, vitest_1.it)("should pass valid MeePhaseSpec objects", () => {
            (0, vitest_1.expect)((0, mee_schema_js_1.isMeePhaseSpec)(validPhaseSpec)).toBe(true);
        });
        (0, vitest_1.it)("should reject invalid MeePhaseSpec objects", () => {
            const invalid = { ...validPhaseSpec, phaseNumber: "not-a-number" };
            (0, vitest_1.expect)((0, mee_schema_js_1.isMeePhaseSpec)(invalid)).toBe(false);
        });
        (0, vitest_1.it)("should pass valid MeeMetaRule objects", () => {
            (0, vitest_1.expect)((0, mee_schema_js_1.isMeeMetaRule)(validMetaRule)).toBe(true);
        });
        (0, vitest_1.it)("should reject invalid MeeMetaRule objects", () => {
            const invalid = { ...validMetaRule, weight: 1.5 }; // weight must be between 0.0 and 1.0
            (0, vitest_1.expect)((0, mee_schema_js_1.isMeeMetaRule)(invalid)).toBe(false);
        });
        (0, vitest_1.it)("should pass valid RefactorInsight objects", () => {
            (0, vitest_1.expect)((0, mee_schema_js_1.isRefactorInsight)(validRefactorInsight)).toBe(true);
        });
        (0, vitest_1.it)("should reject invalid RefactorInsight objects", () => {
            const invalid = { ...validRefactorInsight, type: "invalid_type" };
            (0, vitest_1.expect)((0, mee_schema_js_1.isRefactorInsight)(invalid)).toBe(false);
        });
    });
    (0, vitest_1.describe)("File Store Enforcements", () => {
        (0, vitest_1.it)("FileMeeResearchFindingStore should reject invalid finding on add", () => {
            const store = new mee_research_finding_store_js_1.FileMeeResearchFindingStore(tempDir);
            const invalidFinding = { id: "invalid-finding", severity: "critical" }; // missing required properties
            (0, vitest_1.expect)(() => store.add(invalidFinding)).toThrow("Invalid ResearchFinding schema");
        });
        (0, vitest_1.it)("FileMeePhaseSpecStore should reject invalid phase on add", () => {
            const store = new mee_phase_spec_store_js_1.FileMeePhaseSpecStore(tempDir);
            const invalidPhase = { id: "invalid-phase", status: "draft" }; // missing required properties
            (0, vitest_1.expect)(() => store.add(invalidPhase)).toThrow("Invalid MeePhaseSpec schema");
        });
        (0, vitest_1.it)("FileMeeMetaRuleStore should reject invalid meta rule on add", () => {
            const store = new mee_meta_rule_store_js_1.FileMeeMetaRuleStore(tempDir);
            const invalidRule = { id: "invalid-rule", weight: 2.0 }; // weight exceeds bounds
            (0, vitest_1.expect)(() => store.add(invalidRule)).toThrow("Invalid MeeMetaRule schema");
        });
    });
});
//# sourceMappingURL=mee-verification-regression.test.js.map