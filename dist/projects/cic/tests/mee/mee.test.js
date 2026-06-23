"use strict";
// File: projects/cic/tests/mee/mee.test.ts | Date: 2026-06-03 | v1.2.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const mee_trigger_js_1 = require("../../src/mee/mee-trigger.js");
const mee_generator_js_1 = require("../../src/mee/mee-generator.js");
const mee_synthesizer_js_1 = require("../../src/mee/mee-synthesizer.js");
const mee_validator_js_1 = require("../../src/mee/mee-validator.js");
const auto_evolution_engine_js_1 = require("../../src/mee/auto-evolution-engine.js");
const mee_proposal_store_js_1 = require("../../src/mee/mee-proposal-store.js");
const mee_routes_js_1 = require("../../src/cic/control-plane/mee-routes.js");
const ckg_store_js_1 = require("../../src/ckg/ckg-store.js");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
(0, vitest_1.describe)("Phase 30 — MEE Meta‑Evolution Engine", () => {
    const tempGraphPath = node_path_1.default.resolve(__dirname, "../../ckg/mee-test-graph.json");
    (0, vitest_1.beforeEach)(() => {
        if (node_fs_1.default.existsSync(tempGraphPath)) {
            node_fs_1.default.unlinkSync(tempGraphPath);
        }
    });
    (0, vitest_1.afterEach)(() => {
        if (node_fs_1.default.existsSync(tempGraphPath)) {
            node_fs_1.default.unlinkSync(tempGraphPath);
        }
    });
    (0, vitest_1.it)("detects gaps and drift in MeeTriggerEngine", () => {
        const store = new ckg_store_js_1.CkgStore(tempGraphPath);
        // Write a graph with an orphan skill node and a drift discrepancy
        store.save({
            nodes: [
                { id: "skill:orphan", type: "skill", name: "Orphan Skill" },
                { id: "task:failed", type: "task", name: "Failed Task" }
            ],
            edges: [],
            meta: {
                hotspots: {
                    centralNodes: [],
                    orphans: [{ id: "skill:orphan", type: "skill", name: "Orphan Skill" }]
                },
                drift: {
                    unmappedSkills: [{ id: "skill:orphan", issue: "Unmapped skill" }],
                    stateDiscrepancies: [{ nodeId: "task:failed", issue: "State discrepancy" }]
                }
            }
        });
        const triggerEngine = new mee_trigger_js_1.MeeTriggerEngine(store);
        const events = triggerEngine.detectTriggers();
        (0, vitest_1.expect)(events.length).toBe(3);
        (0, vitest_1.expect)(events.some(e => e.type === "capability_gap")).toBe(true);
        (0, vitest_1.expect)(events.some(e => e.type === "drift")).toBe(true);
    });
    (0, vitest_1.it)("serializes and deserializes trigger events in MeeTriggerEngine", () => {
        const store = new ckg_store_js_1.CkgStore(tempGraphPath);
        const triggerEngine = new mee_trigger_js_1.MeeTriggerEngine(store);
        const event = {
            id: "evt-uuid",
            type: "drift",
            payload: { value: 123 },
            timestamp: 1000
        };
        const serialized = triggerEngine.serialize(event);
        (0, vitest_1.expect)(serialized).toEqual(event);
        const deserialized = triggerEngine.deserialize(serialized);
        (0, vitest_1.expect)(deserialized).toEqual(event);
    });
    (0, vitest_1.it)("generates a phase plan from trigger event", () => {
        const generator = new mee_generator_js_1.MeePhaseGenerator();
        const plan = generator.generate({
            id: "evt-123",
            type: "drift",
            payload: {},
            timestamp: Date.now()
        });
        (0, vitest_1.expect)(plan.phaseNumber).toBe(30);
        (0, vitest_1.expect)(plan.title).toContain("Meta‑Evolution follow‑up");
        (0, vitest_1.expect)(plan.objectives).toContain("Analyze trigger event");
        (0, vitest_1.expect)(plan.tasks).toContain("Create documentation updates");
    });
    (0, vitest_1.it)("synthesizes patches from phase plan", () => {
        const synth = new mee_synthesizer_js_1.MeePatchSynthesizer();
        const plan = {
            id: "prop-123",
            title: "Test Phase 30",
            trigger: { id: "evt-1", type: "drift", payload: {}, timestamp: Date.now() },
            status: "pending",
            filesCreated: [],
            planSummary: "summary",
            timestamp: Date.now()
        };
        const patchSet = synth.synthesize(plan);
        (0, vitest_1.expect)(patchSet.proposalId).toBe("prop-123");
        (0, vitest_1.expect)(patchSet.patches.length).toBe(1);
        (0, vitest_1.expect)(patchSet.patches[0].path).toBe("docs/mee/proposal-prop-123.md");
        (0, vitest_1.expect)(patchSet.patches[0].type).toBe("create");
    });
    (0, vitest_1.it)("validates patch sets in MeeValidator", () => {
        const validator = new mee_validator_js_1.MeeValidator();
        const report = validator.validate({ proposalId: "prop-123", patches: [] });
        (0, vitest_1.expect)(report.passed).toBe(false);
        (0, vitest_1.expect)(report.compilePassed).toBe(true);
        (0, vitest_1.expect)(report.testsPassed).toBe(true);
        (0, vitest_1.expect)(report.issues?.length).toBe(1);
        (0, vitest_1.expect)(report.issues?.[0].type).toBe("empty");
    });
    (0, vitest_1.it)("MeeValidator detects file conflicts and schema errors", () => {
        const validator = new mee_validator_js_1.MeeValidator();
        // File conflict: protected file modification
        const patchSetConflict = {
            proposalId: "prop-1",
            patches: [
                { path: "projects/cic/src/mee/mee-schema.ts", type: "modify", content: "// hacked" }
            ]
        };
        const reportConflict = validator.validatePatchSet(patchSetConflict);
        (0, vitest_1.expect)(reportConflict.passed).toBe(false);
        (0, vitest_1.expect)(reportConflict.issues?.some(i => i.type === "conflict")).toBe(true);
        // Schema syntax check: invalid JSON
        const patchSetInvalidJson = {
            proposalId: "prop-2",
            patches: [
                { path: "docs/mee/test.json", type: "create", content: "{invalid" }
            ]
        };
        const reportJson = validator.validatePatchSet(patchSetInvalidJson);
        (0, vitest_1.expect)(reportJson.passed).toBe(false);
        (0, vitest_1.expect)(reportJson.issues?.some(i => i.type === "schema")).toBe(true);
        // Schema syntax check: valid JSON
        const patchSetValidJson = {
            proposalId: "prop-3",
            patches: [
                { path: "docs/mee/test.json", type: "create", content: '{"ok": true}' }
            ]
        };
        const reportValidJson = validator.validatePatchSet(patchSetValidJson);
        (0, vitest_1.expect)(reportValidJson.passed).toBe(true);
    });
    (0, vitest_1.it)("AutoEvolutionEngine runs tick lifecycle successfully", async () => {
        const store = new ckg_store_js_1.CkgStore(tempGraphPath);
        // Write graph with orphans to trigger scan
        store.save({
            nodes: [{ id: "skill:orphan", type: "skill", name: "Orphan Skill" }],
            edges: [],
            meta: {
                hotspots: {
                    centralNodes: [],
                    orphans: [{ id: "skill:orphan", type: "skill", name: "Orphan Skill" }]
                }
            }
        });
        const trigger = new mee_trigger_js_1.MeeTriggerEngine(store);
        const generator = new mee_generator_js_1.MeePhaseGenerator();
        const synth = new mee_synthesizer_js_1.MeePatchSynthesizer();
        const validator = new mee_validator_js_1.MeeValidator();
        const proposalStore = new mee_proposal_store_js_1.MeeProposalStore(node_path_1.default.resolve(__dirname, "../../"));
        // Ensure temp data directory is clean
        const tempStorePath = node_path_1.default.resolve(__dirname, "../../projects/cic/data/mee/proposals.json");
        if (node_fs_1.default.existsSync(tempStorePath)) {
            node_fs_1.default.unlinkSync(tempStorePath);
        }
        const autoEngine = new auto_evolution_engine_js_1.AutoEvolutionEngine(trigger, generator, synth, validator, proposalStore);
        // Manually set enabled state to true so we can await a single tick synchronously
        autoEngine.enabled = true;
        autoEngine.setRequireApproval(true);
        await autoEngine.tick();
        const proposals = proposalStore.loadAll();
        (0, vitest_1.expect)(proposals.length).toBe(1);
        (0, vitest_1.expect)(proposals[0].status).toBe("validated"); // because validation passed but requireApproval is true
        (0, vitest_1.expect)(proposals[0].filesCreated.length).toBeGreaterThan(0);
        // Cleanup store file
        if (node_fs_1.default.existsSync(tempStorePath)) {
            node_fs_1.default.unlinkSync(tempStorePath);
        }
        autoEngine.disable();
    });
    (0, vitest_1.it)("registers Express routes", () => {
        const mockRouter = {
            get: [],
            post: [],
        };
        const routerProxy = {
            get(path, handler) {
                mockRouter.get.push({ path, handler });
            },
            post(path, handler) {
                mockRouter.post.push({ path, handler });
            }
        };
        (0, mee_routes_js_1.registerMeeRoutes)(routerProxy);
        (0, vitest_1.expect)(mockRouter.post.some(r => r.path === "/mee/propose")).toBe(true);
        (0, vitest_1.expect)(mockRouter.get.some(r => r.path === "/mee/proposals")).toBe(true);
        (0, vitest_1.expect)(mockRouter.get.some(r => r.path === "/mee/proposals/:id")).toBe(true);
        (0, vitest_1.expect)(mockRouter.get.some(r => r.path === "/mee/triggers")).toBe(true);
        (0, vitest_1.expect)(mockRouter.post.some(r => r.path === "/mee/validate/:id")).toBe(true);
        (0, vitest_1.expect)(mockRouter.get.some(r => r.path === "/mee/patch/:id")).toBe(true);
        (0, vitest_1.expect)(mockRouter.post.some(r => r.path === "/mee/apply/:id")).toBe(true);
        (0, vitest_1.expect)(mockRouter.get.some(r => r.path === "/mee/validation/:id")).toBe(true);
        (0, vitest_1.expect)(mockRouter.get.some(r => r.path === "/mee/auto/status")).toBe(true);
        (0, vitest_1.expect)(mockRouter.post.some(r => r.path === "/mee/auto/enable")).toBe(true);
        (0, vitest_1.expect)(mockRouter.post.some(r => r.path === "/mee/auto/disable")).toBe(true);
    });
});
//# sourceMappingURL=mee.test.js.map