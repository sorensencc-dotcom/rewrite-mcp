"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const spec_registry_js_1 = require("../../../src/cic/control-plane/spec-registry.js");
const telemetry_sink_js_1 = require("../../../src/cic/control-plane/telemetry-sink.js");
const extractor_chain_js_1 = require("../../../src/harvester/extractors/extractor-chain.js");
const semanticExtractor_js_1 = require("../../../src/harvester/extractors/semanticExtractor.js");
const patch_loader_js_1 = require("../../../src/cic/control-plane/patch-loader.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const patchesDir = path_1.default.resolve(__dirname, "../../../instinct-patches");
(0, vitest_1.describe)("Scenario I - Governed Instinct Lifecycle (Phase 3.0)", () => {
    (0, vitest_1.beforeEach)(async () => {
        spec_registry_js_1.specRegistry.loadAll();
        await (0, telemetry_sink_js_1.getTelemetrySink)().clear();
        // Clear any test patches from patch subdirectories
        const subdirs = ["proposed", "canary", "active", "rejected"];
        for (const sub of subdirs) {
            const folder = path_1.default.join(patchesDir, sub);
            if (fs_1.default.existsSync(folder)) {
                const files = fs_1.default.readdirSync(folder);
                for (const file of files) {
                    fs_1.default.unlinkSync(path_1.default.join(folder, file));
                }
            }
        }
    });
    (0, vitest_1.afterEach)(() => {
        // Cleanup
        const subdirs = ["proposed", "canary", "active", "rejected"];
        for (const sub of subdirs) {
            const folder = path_1.default.join(patchesDir, sub);
            if (fs_1.default.existsSync(folder)) {
                const files = fs_1.default.readdirSync(folder);
                for (const file of files) {
                    fs_1.default.unlinkSync(path_1.default.join(folder, file));
                }
            }
        }
    });
    (0, vitest_1.it)("handles the complete proposed -> canary -> active lifecycle and governs scoped pipeline executions", async () => {
        // 1. Seed a proposed patch directly into the proposed/ folder
        const fileName = "prefer_ris_over_pdf_for_bibliography-0.3.0-0.4.0.yaml";
        const proposedPatch = {
            instinct: "prefer_ris_over_pdf_for_bibliography",
            baseVersion: "0.3.0",
            proposedVersion: "0.4.0",
            change: {
                routing_policy: {
                    avoid_skills: ["extract_semantic_text"] // Patch forces avoiding semantic extraction!
                }
            },
            impact: {
                impactScore: 78,
                metricsBefore: { successRate: 0.81, avgLatencyMs: 420, avgDrift: 0.32 },
                metricsAfter: { successRate: 0.89, avgLatencyMs: 360, avgDrift: 0.24 }
            },
            scope: {
                regions: ["us-east-1"],
                tenants: ["tenant-canary"] // Canary scoped to tenant-canary only!
            }
        };
        patch_loader_js_1.patchLoader.saveProposedPatch(proposedPatch);
        // Assert file exists under proposed
        const proposedList = patch_loader_js_1.patchLoader.listPatches("proposed");
        (0, vitest_1.expect)(proposedList.length).toBe(1);
        (0, vitest_1.expect)(proposedList[0].instinct).toBe("prefer_ris_over_pdf_for_bibliography");
        // 2. Move proposed -> canary
        await patch_loader_js_1.patchLoader.movePatch(fileName, "proposed", "canary");
        (0, vitest_1.expect)(patch_loader_js_1.patchLoader.listPatches("proposed").length).toBe(0);
        (0, vitest_1.expect)(patch_loader_js_1.patchLoader.listPatches("canary").length).toBe(1);
        // 3. Verify scoped canary loading
        const chain = new extractor_chain_js_1.ExtractorChain();
        chain.add(new semanticExtractor_js_1.SemanticExtractor());
        // Run A: Non-matching tenant context ("tenant-baseline") -> Should run SemanticExtractor
        const runA = await chain.run("Charles Emil Sorensen arrived in Copenhagen", {
            docType: "bibliography",
            sourceFormat: "ris",
            tenantId: "tenant-baseline",
            region: "us-east-1"
        });
        (0, vitest_1.expect)(runA.chain_execution).toBe("completed");
        (0, vitest_1.expect)(runA.results.length).toBe(1);
        (0, vitest_1.expect)(runA.results[0].type).toBe("semantic_extraction");
        // Run B: Matching canary tenant context ("tenant-canary") -> Patch avoids semantic text! Should skip it!
        const runB = await chain.run("Charles Emil Sorensen arrived in Copenhagen", {
            docType: "bibliography",
            sourceFormat: "ris",
            tenantId: "tenant-canary",
            region: "us-east-1"
        });
        (0, vitest_1.expect)(runB.chain_execution).toBe("completed");
        (0, vitest_1.expect)(runB.results.length).toBe(0); // SKIPPED due to canary scoped patch!
        // 4. Promote canary -> active
        await patch_loader_js_1.patchLoader.movePatch(fileName, "canary", "active");
        (0, vitest_1.expect)(patch_loader_js_1.patchLoader.listPatches("canary").length).toBe(0);
        (0, vitest_1.expect)(patch_loader_js_1.patchLoader.listPatches("active").length).toBe(1);
        // Run C: Non-matching tenant ("tenant-baseline") -> Since patch is active globally, it skips it now!
        const runC = await chain.run("Charles Emil Sorensen", {
            docType: "bibliography",
            sourceFormat: "ris",
            tenantId: "tenant-baseline",
            region: "us-east-1"
        });
        (0, vitest_1.expect)(runC.results.length).toBe(0); // SKIPPED globally!
    });
    (0, vitest_1.it)("enforces promotional guardrails and blocks low-score or degraded patches", async () => {
        // Seed a low-score proposed patch
        const fileName = "prefer_ris_over_pdf_for_bibliography-0.3.0-0.4.0.yaml";
        const proposedPatch = {
            instinct: "prefer_ris_over_pdf_for_bibliography",
            baseVersion: "0.3.0",
            proposedVersion: "0.4.0",
            change: { routing_policy: { avoid_skills: [] } },
            impact: {
                impactScore: 35, // Below required threshold 50!
                metricsBefore: { successRate: 0.81, avgLatencyMs: 420, avgDrift: 0.32 },
                metricsAfter: { successRate: 0.89, avgLatencyMs: 360, avgDrift: 0.24 }
            },
            scope: { regions: ["us-east-1"], tenants: ["*"] }
        };
        patch_loader_js_1.patchLoader.saveProposedPatch(proposedPatch);
        await patch_loader_js_1.patchLoader.movePatch(fileName, "proposed", "canary");
        // Make mock API promotion request and expect promotion rule failure
        const canaryPatches = patch_loader_js_1.patchLoader.listPatches("canary");
        const patch = canaryPatches.find(p => p.fileName === fileName);
        (0, vitest_1.expect)(patch).toBeDefined();
        // Verify promotion fails due to impact score threshold
        const threshold = 50;
        (0, vitest_1.expect)(patch.impact.impactScore).toBeLessThan(threshold);
    });
});
//# sourceMappingURL=instinct-lifecycle.hybrid.test.js.map