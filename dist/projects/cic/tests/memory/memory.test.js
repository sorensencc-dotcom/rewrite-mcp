"use strict";
// File: projects/cic/tests/memory/memory.test.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const memory_substrate_js_1 = require("../../src/memory/memory-substrate.js");
const memory_harvester_js_1 = require("../../src/memory/memory-harvester.js");
const memory_synthesizer_js_1 = require("../../src/memory/memory-synthesizer.js");
const memory_autonomy_js_1 = require("../../src/memory/memory-autonomy.js");
const arps_memory_integration_js_1 = require("../../src/agents/roadmapping/arps-memory-integration.js");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
(0, vitest_1.describe)("Phase 23 — Memory Layer", () => {
    const tempLedgerPath = node_path_1.default.resolve(__dirname, "../../data/temp-test-ledger-23.jsonl");
    (0, vitest_1.beforeEach)(() => {
        if (node_fs_1.default.existsSync(tempLedgerPath)) {
            node_fs_1.default.unlinkSync(tempLedgerPath);
        }
    });
    (0, vitest_1.afterEach)(() => {
        if (node_fs_1.default.existsSync(tempLedgerPath)) {
            node_fs_1.default.unlinkSync(tempLedgerPath);
        }
    });
    (0, vitest_1.it)("appends and queries events", () => {
        const substrate = new memory_substrate_js_1.MemorySubstrate(tempLedgerPath);
        substrate.append({
            id: "evt-1",
            type: "pipeline.run",
            timestamp: new Date().toISOString(),
            payload: { status: "success" }
        });
        const events = substrate.query({ type: "pipeline.run" });
        (0, vitest_1.expect)(events.length).toBe(1);
        (0, vitest_1.expect)(events[0].id).toBe("evt-1");
    });
    (0, vitest_1.it)("harvester produces structured events", async () => {
        const substrate = new memory_substrate_js_1.MemorySubstrate(tempLedgerPath);
        const harvester = new memory_harvester_js_1.MemoryHarvester(substrate);
        const events = await harvester.collect();
        (0, vitest_1.expect)(Array.isArray(events)).toBe(true);
        (0, vitest_1.expect)(events.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)("synthesizer generates summaries", () => {
        const substrate = new memory_substrate_js_1.MemorySubstrate(tempLedgerPath);
        const synth = new memory_synthesizer_js_1.MemorySynthesizer(substrate);
        substrate.append({
            id: "evt-1",
            type: "pipeline.run",
            timestamp: new Date().toISOString(),
            payload: { status: "success" }
        });
        const weekly = synth.weeklySummary();
        (0, vitest_1.expect)(weekly).toBeDefined();
        (0, vitest_1.expect)(weekly.eventsCount).toBe(1);
    });
    (0, vitest_1.it)("autonomy engine detects stales, failures, and drift", () => {
        const substrate = new memory_substrate_js_1.MemorySubstrate(tempLedgerPath);
        const autonomy = new memory_autonomy_js_1.MemoryAutonomyEngine(substrate);
        // 1. Nominal check
        // Since there are no events, detectStalePhases should recommend initializing.
        let proposals = autonomy.run();
        (0, vitest_1.expect)(proposals.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(proposals.some(p => p.recommendation.includes("Initialize"))).toBe(true);
        // 2. Failure check
        for (let i = 0; i < 4; i++) {
            substrate.append({
                id: `evt-fail-${i}`,
                type: "pipeline.run",
                timestamp: new Date().toISOString(),
                payload: { status: "failed" }
            });
        }
        // Append a lane progress event within 45 days so we don't trigger stale phase recommendation
        substrate.append({
            id: "evt-lane-ok",
            type: "lane.progress",
            timestamp: new Date().toISOString(),
            payload: { status: "active" }
        });
        proposals = autonomy.run();
        (0, vitest_1.expect)(proposals.some(p => p.reason.includes("failures"))).toBe(true);
        // 3. Drift check
        substrate.append({
            id: "evt-drift",
            type: "sandbox.decision",
            timestamp: new Date().toISOString(),
            payload: { similarity: 0.81 } // under 0.85
        });
        proposals = autonomy.run();
        (0, vitest_1.expect)(proposals.some(p => p.reason.includes("similarity"))).toBe(true);
    });
    (0, vitest_1.it)("ARPS Memory Integration collects failures, drift, and stale phases", () => {
        const substrate = new memory_substrate_js_1.MemorySubstrate(tempLedgerPath);
        const integration = new arps_memory_integration_js_1.ArpsMemoryIntegration(substrate);
        substrate.append({
            id: "evt-fail",
            type: "docs.build",
            timestamp: new Date().toISOString(),
            payload: { ok: false }
        });
        substrate.append({
            id: "evt-drift",
            type: "sandbox.decision",
            timestamp: new Date().toISOString(),
            payload: { similarity: 0.88 }
        });
        substrate.append({
            id: "evt-delta",
            type: "roadmap.delta",
            timestamp: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(), // 50 days ago
            payload: {}
        });
        const hints = integration.buildArpsHints();
        (0, vitest_1.expect)(hints.repeatedFailures).toBe(1);
        (0, vitest_1.expect)(hints.driftTrend).toEqual([0.88]);
        (0, vitest_1.expect)(hints.stalePhases).toBe(1);
    });
});
//# sourceMappingURL=memory.test.js.map