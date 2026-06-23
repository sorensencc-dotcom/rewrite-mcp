"use strict";
// File: projects/cic/tests/evolution/ambStrategic.test.ts | Date: 2026-06-05 | v1.0.0
// Milestone 4 test suite: Memory, Scorer, Bundler, Planner, E2E Strategic Pipeline
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const ambMemoryStore_js_1 = require("../../evolution/src/amb/ambMemoryStore.js");
const ambStrategicScorer_js_1 = require("../../evolution/src/amb/ambStrategicScorer.js");
const ambIntentBundler_js_1 = require("../../evolution/src/amb/ambIntentBundler.js");
const ambStrategicPlanner_js_1 = require("../../evolution/src/amb/ambStrategicPlanner.js");
const ambPriorityEngine_js_1 = require("../../evolution/src/amb/ambPriorityEngine.js");
const ambIntentSynthesizer_js_1 = require("../../evolution/src/amb/ambIntentSynthesizer.js");
const ambPolicyInterpreter_js_1 = require("../../evolution/src/amb/ambPolicyInterpreter.js");
const ambGovernanceGate_js_1 = require("../../evolution/src/amb/ambGovernanceGate.js");
const ambMasHealthGate_js_1 = require("../../evolution/src/amb/ambMasHealthGate.js");
const ambRlTestGate_js_1 = require("../../evolution/src/amb/ambRlTestGate.js");
// === Shared Fixtures ===
const CHARTER = {
    forbiddenDomains: ["security", "auth", "billing"],
    operatorOnlyDomains: ["mas_topology", "cic_config"],
    lineageRequiredDomains: ["ckg_graph", "rl_fusion"]
};
function makeIntent(overrides = {}) {
    return {
        intent_id: "test-intent-001",
        run_id: "test-run-001",
        timestamp: new Date().toISOString(),
        version: "v0.1.0",
        source: "AMB",
        intent_type: "graph_distillation",
        priority_score: 0.75,
        risk_class: "low",
        policy_alignment: {
            forbidden_domain: false,
            operator_required: false,
            lineage_required: false,
            rl_dependent: false
        },
        justification: {
            summary: "Reduce CKG entropy.",
            signals: {},
            references: []
        },
        constraints: {
            required_tests: ["npm test"],
            required_challenge_runs: ["baseline"],
            required_operator_actions: ["review_decisions_json"]
        },
        target_domains: { ckg_graph: true },
        desired_outcomes: { description: "Prune stale nodes", metrics: { graph_entropy_reduction: 0.12 } },
        ...overrides
    };
}
function makeMemory(overrides = {}) {
    return {
        snapshot_id: "mem-test-001",
        timestamp: new Date().toISOString(),
        intents: [],
        proposals: [],
        mas_health_history: [],
        drift_history: [],
        rl_impact_history: [],
        ...overrides
    };
}
// Temp directory helper
function makeTempDir() {
    return node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), "amb-memory-test-"));
}
function cleanDir(dir) {
    try {
        node_fs_1.default.rmSync(dir, { recursive: true, force: true });
    }
    catch { /* noop */ }
}
// ===============================================================
// 1. MEMORY STORE
// ===============================================================
(0, vitest_1.describe)("AmbMemoryStore", () => {
    let tempDir;
    (0, vitest_1.beforeEach)(() => {
        tempDir = makeTempDir();
    });
    (0, vitest_1.afterEach)(() => {
        cleanDir(tempDir);
    });
    (0, vitest_1.it)("returns null when no snapshots exist", () => {
        const store = new ambMemoryStore_js_1.AmbMemoryStore(tempDir);
        (0, vitest_1.expect)(store.loadLatestSnapshot()).toBeNull();
    });
    (0, vitest_1.it)("writes and reads a snapshot correctly", () => {
        const store = new ambMemoryStore_js_1.AmbMemoryStore(tempDir);
        const snapshot = store.recordRun({
            runId: "run-001",
            intents: [makeIntent({ status: "approved" })],
            proposals: [{ proposalId: "prop-1", applied: true, failed: false }],
            masSnapshot: { globalErrorRate: 0.02, globalTimeoutRate: 0.01, queueBacklogDepth: 5, criticalAgentsHealth: 0.95 },
            driftMetrics: { tenant_drift_index: 0.3 }
        });
        const loaded = store.loadLatestSnapshot();
        (0, vitest_1.expect)(loaded).not.toBeNull();
        (0, vitest_1.expect)(loaded.intents.length).toBe(1);
        (0, vitest_1.expect)(loaded.proposals.length).toBe(1);
        (0, vitest_1.expect)(loaded.mas_health_history.length).toBe(1);
        (0, vitest_1.expect)(loaded.drift_history.length).toBe(1);
    });
    (0, vitest_1.it)("accumulates data across multiple recordRun calls", () => {
        const store = new ambMemoryStore_js_1.AmbMemoryStore(tempDir);
        store.recordRun({
            runId: "run-001",
            intents: [makeIntent({ intent_id: "i1", status: "approved" })],
            proposals: [{ proposalId: "p1", applied: true, failed: false }],
            masSnapshot: { globalErrorRate: 0.02, globalTimeoutRate: 0.01, queueBacklogDepth: 5, criticalAgentsHealth: 0.95 },
            driftMetrics: { tenant_drift_index: 0.3 }
        });
        // Small delay to ensure different timestamp in filename
        const store2 = new ambMemoryStore_js_1.AmbMemoryStore(tempDir);
        store2.recordRun({
            runId: "run-002",
            intents: [makeIntent({ intent_id: "i2", status: "blocked" })],
            proposals: [{ proposalId: "p2", applied: false, failed: true }],
            masSnapshot: { globalErrorRate: 0.04, globalTimeoutRate: 0.02, queueBacklogDepth: 8, criticalAgentsHealth: 0.92 },
            driftMetrics: { tenant_drift_index: 0.5 }
        });
        const loaded = store2.loadLatestSnapshot();
        (0, vitest_1.expect)(loaded.intents.length).toBe(2);
        (0, vitest_1.expect)(loaded.proposals.length).toBe(2);
        (0, vitest_1.expect)(loaded.drift_history.length).toBe(2);
    });
    (0, vitest_1.it)("getIntentHistory respects lookback", () => {
        const store = new ambMemoryStore_js_1.AmbMemoryStore(tempDir);
        store.recordRun({
            runId: "run-001",
            intents: [
                makeIntent({ intent_id: "i1", status: "approved" }),
                makeIntent({ intent_id: "i2", status: "blocked" }),
                makeIntent({ intent_id: "i3", status: "approved" })
            ],
            proposals: [],
            masSnapshot: { globalErrorRate: 0.02, globalTimeoutRate: 0.01, queueBacklogDepth: 5, criticalAgentsHealth: 0.95 },
            driftMetrics: { tenant_drift_index: 0.2 }
        });
        const last2 = store.getIntentHistory(2);
        (0, vitest_1.expect)(last2.length).toBe(2);
        (0, vitest_1.expect)(last2[0].intent_id).toBe("i2");
        (0, vitest_1.expect)(last2[1].intent_id).toBe("i3");
    });
    (0, vitest_1.it)("getProposalSuccessRate computes correctly", () => {
        const store = new ambMemoryStore_js_1.AmbMemoryStore(tempDir);
        store.recordRun({
            runId: "run-001",
            intents: [],
            proposals: [
                { proposalId: "p1", applied: true, failed: false },
                { proposalId: "p2", applied: true, failed: false },
                { proposalId: "p3", applied: false, failed: true }
            ],
            masSnapshot: { globalErrorRate: 0.02, globalTimeoutRate: 0.01, queueBacklogDepth: 5, criticalAgentsHealth: 0.95 },
            driftMetrics: { tenant_drift_index: 0.1 }
        });
        const rate = store.getProposalSuccessRate();
        (0, vitest_1.expect)(rate).toBeCloseTo(0.667, 2);
    });
    (0, vitest_1.it)("getDriftTrend returns drift values", () => {
        const store = new ambMemoryStore_js_1.AmbMemoryStore(tempDir);
        store.recordRun({
            runId: "r1",
            intents: [],
            proposals: [],
            masSnapshot: { globalErrorRate: 0.02, globalTimeoutRate: 0.01, queueBacklogDepth: 5, criticalAgentsHealth: 0.95 },
            driftMetrics: { tenant_drift_index: 0.3 }
        });
        const store2 = new ambMemoryStore_js_1.AmbMemoryStore(tempDir);
        store2.recordRun({
            runId: "r2",
            intents: [],
            proposals: [],
            masSnapshot: { globalErrorRate: 0.03, globalTimeoutRate: 0.02, queueBacklogDepth: 8, criticalAgentsHealth: 0.93 },
            driftMetrics: { tenant_drift_index: 0.5 }
        });
        const trend = store2.getDriftTrend();
        (0, vitest_1.expect)(trend.length).toBe(2);
        (0, vitest_1.expect)(trend[0]).toBe(0.3);
        (0, vitest_1.expect)(trend[1]).toBe(0.5);
    });
});
// ===============================================================
// 2. STRATEGIC SCORER
// ===============================================================
(0, vitest_1.describe)("AmbStrategicScorer", () => {
    (0, vitest_1.it)("maps risk classes correctly: low=1, medium=2, high=3", () => {
        const scorer = new ambStrategicScorer_js_1.AmbStrategicScorer(null);
        const low = scorer.scoreIntent(makeIntent({ risk_class: "low" }));
        const med = scorer.scoreIntent(makeIntent({ risk_class: "medium" }));
        const high = scorer.scoreIntent(makeIntent({ risk_class: "high" }));
        // Lower risk → higher score (same impact)
        (0, vitest_1.expect)(low).toBeGreaterThan(med);
        (0, vitest_1.expect)(med).toBeGreaterThan(high);
    });
    (0, vitest_1.it)("operator burden reduces score", () => {
        const scorer = new ambStrategicScorer_js_1.AmbStrategicScorer(null);
        const light = scorer.scoreIntent(makeIntent({
            constraints: { required_tests: ["npm test"], required_challenge_runs: ["baseline"], required_operator_actions: [] }
        }));
        const heavy = scorer.scoreIntent(makeIntent({
            constraints: { required_tests: ["npm test"], required_challenge_runs: ["baseline"], required_operator_actions: ["review", "approve", "audit"] }
        }));
        (0, vitest_1.expect)(light).toBeGreaterThan(heavy);
    });
    (0, vitest_1.it)("scales with desired_outcomes metrics", () => {
        const scorer = new ambStrategicScorer_js_1.AmbStrategicScorer(null);
        const small = scorer.scoreIntent(makeIntent({
            desired_outcomes: { description: "Small", metrics: { gain: 0.01 } }
        }));
        const large = scorer.scoreIntent(makeIntent({
            desired_outcomes: { description: "Large", metrics: { gain: 0.5 } }
        }));
        (0, vitest_1.expect)(large).toBeGreaterThan(small);
    });
    (0, vitest_1.it)("applies historical boost from memory", () => {
        const memory = makeMemory({
            intents: [
                { intent_id: "past-1", run_id: "r1", intent_type: "graph_distillation", risk_class: "low", status: "approved", timestamp: "" }
            ],
            proposals: [
                { proposal_id: "p1", run_id: "r1", source_intent_id: "past-1", applied: true, failed: false }
            ]
        });
        const scorer = new ambStrategicScorer_js_1.AmbStrategicScorer(memory);
        const boost = scorer.computeHistoricalBoost("graph_distillation");
        // 100% success → boost = 0.5 + 1.0 = 1.5
        (0, vitest_1.expect)(boost).toBe(1.5);
    });
    (0, vitest_1.it)("ranks intents in descending strategic_score order", () => {
        const scorer = new ambStrategicScorer_js_1.AmbStrategicScorer(null);
        const intents = [
            makeIntent({ intent_id: "high-risk", risk_class: "high", desired_outcomes: { description: "", metrics: { v: 0.1 } } }),
            makeIntent({ intent_id: "low-risk", risk_class: "low", desired_outcomes: { description: "", metrics: { v: 0.3 } } }),
            makeIntent({ intent_id: "med-risk", risk_class: "medium", desired_outcomes: { description: "", metrics: { v: 0.2 } } })
        ];
        const ranked = scorer.rankIntents(intents);
        for (let i = 1; i < ranked.length; i++) {
            (0, vitest_1.expect)(ranked[i - 1].strategic_score).toBeGreaterThanOrEqual(ranked[i].strategic_score);
        }
    });
});
// ===============================================================
// 3. INTENT BUNDLER
// ===============================================================
(0, vitest_1.describe)("AmbIntentBundler", () => {
    const bundler = new ambIntentBundler_js_1.AmbIntentBundler();
    (0, vitest_1.it)("classifies ckg_graph → graph_cleanup", () => {
        (0, vitest_1.expect)(bundler.classifyBundleType(makeIntent({ target_domains: { ckg_graph: true } }))).toBe("graph_cleanup");
    });
    (0, vitest_1.it)("classifies mas_topology → mas_stability", () => {
        (0, vitest_1.expect)(bundler.classifyBundleType(makeIntent({ target_domains: { mas_topology: true } }))).toBe("mas_stability");
    });
    (0, vitest_1.it)("classifies rl_fusion → tenant_redesign", () => {
        (0, vitest_1.expect)(bundler.classifyBundleType(makeIntent({ target_domains: { rl_fusion: true } }))).toBe("tenant_redesign");
    });
    (0, vitest_1.it)("classifies cic_config → planner_tuning", () => {
        (0, vitest_1.expect)(bundler.classifyBundleType(makeIntent({ target_domains: { cic_config: true } }))).toBe("planner_tuning");
    });
    (0, vitest_1.it)("groups intents into correct bundles by domain", () => {
        const intents = [
            makeIntent({ intent_id: "g1", target_domains: { ckg_graph: true } }),
            makeIntent({ intent_id: "g2", target_domains: { ckg_graph: true } }),
            makeIntent({ intent_id: "m1", target_domains: { mas_topology: true } }),
            makeIntent({ intent_id: "r1", target_domains: { rl_fusion: true } })
        ];
        const bundles = bundler.bundleIntents("run-test", intents);
        (0, vitest_1.expect)(bundles.length).toBe(3);
        const graphBundle = bundles.find(b => b.bundle_type === "graph_cleanup");
        (0, vitest_1.expect)(graphBundle).toBeDefined();
        (0, vitest_1.expect)(graphBundle.intent_ids.length).toBe(2);
    });
    (0, vitest_1.it)("aggregate priority is max of members", () => {
        const intents = [
            makeIntent({ intent_id: "a", priority_score: 0.3, target_domains: { ckg_graph: true } }),
            makeIntent({ intent_id: "b", priority_score: 0.9, target_domains: { ckg_graph: true } })
        ];
        const bundles = bundler.bundleIntents("run-test", intents);
        (0, vitest_1.expect)(bundles[0].aggregate_priority_score).toBe(0.9);
    });
    (0, vitest_1.it)("aggregate risk is max of members", () => {
        const intents = [
            makeIntent({ intent_id: "a", risk_class: "low", target_domains: { ckg_graph: true } }),
            makeIntent({ intent_id: "b", risk_class: "high", target_domains: { ckg_graph: true } })
        ];
        const bundles = bundler.bundleIntents("run-test", intents);
        (0, vitest_1.expect)(bundles[0].aggregate_risk_class).toBe("high");
    });
    (0, vitest_1.it)("returns empty array for empty intents", () => {
        (0, vitest_1.expect)(bundler.bundleIntents("run-test", []).length).toBe(0);
    });
});
// ===============================================================
// 4. STRATEGIC PLANNER
// ===============================================================
(0, vitest_1.describe)("AmbStrategicPlanner", () => {
    const planner = new ambStrategicPlanner_js_1.AmbStrategicPlanner();
    (0, vitest_1.it)("generates a plan with horizon_runs and planned_intents", () => {
        const intents = [makeIntent()];
        const bundler = new ambIntentBundler_js_1.AmbIntentBundler();
        const bundles = bundler.bundleIntents("run-p1", intents);
        const plan = planner.generatePlan("run-p1", intents, bundles, null);
        (0, vitest_1.expect)(plan.plan_id).toBeDefined();
        (0, vitest_1.expect)(plan.run_id).toBe("run-p1");
        (0, vitest_1.expect)(plan.horizon_runs).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(plan.planned_intents.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(plan.expected_impact).toBeDefined();
        (0, vitest_1.expect)(plan.expected_impact.drift_reduction).toBeGreaterThanOrEqual(0);
    });
    (0, vitest_1.it)("detects recurring drift pattern from memory", () => {
        const memory = makeMemory({
            drift_history: [
                { run_id: "r1", timestamp: "", tenant_drift_index: 0.4 },
                { run_id: "r2", timestamp: "", tenant_drift_index: 0.5 },
                { run_id: "r3", timestamp: "", tenant_drift_index: 0.6 }
            ]
        });
        const patterns = planner.detectPatterns(memory);
        const driftPattern = patterns.find(p => p.pattern_type === "recurring_drift");
        (0, vitest_1.expect)(driftPattern).toBeDefined();
        (0, vitest_1.expect)(driftPattern.severity).toBe("medium");
    });
    (0, vitest_1.it)("detects persistent MAS instability", () => {
        const memory = makeMemory({
            mas_health_history: [
                { run_id: "r1", timestamp: "", globalErrorRate: 0.04, globalTimeoutRate: 0.01, queueBacklogDepth: 5, criticalAgentsHealth: 0.95 },
                { run_id: "r2", timestamp: "", globalErrorRate: 0.05, globalTimeoutRate: 0.02, queueBacklogDepth: 8, criticalAgentsHealth: 0.92 }
            ]
        });
        const patterns = planner.detectPatterns(memory);
        const masPattern = patterns.find(p => p.pattern_type === "persistent_mas_instability");
        (0, vitest_1.expect)(masPattern).toBeDefined();
    });
    (0, vitest_1.it)("sequences steps logically: cleanup → stabilize → tune", () => {
        const memory = makeMemory({
            drift_history: [
                { run_id: "r1", timestamp: "", tenant_drift_index: 0.3 },
                { run_id: "r2", timestamp: "", tenant_drift_index: 0.4 }
            ],
            mas_health_history: [
                { run_id: "r1", timestamp: "", globalErrorRate: 0.04, globalTimeoutRate: 0.01, queueBacklogDepth: 5, criticalAgentsHealth: 0.95 },
                { run_id: "r2", timestamp: "", globalErrorRate: 0.05, globalTimeoutRate: 0.02, queueBacklogDepth: 8, criticalAgentsHealth: 0.92 }
            ]
        });
        const patterns = planner.detectPatterns(memory);
        const bundler = new ambIntentBundler_js_1.AmbIntentBundler();
        const intents = [
            makeIntent({ intent_id: "g1", target_domains: { ckg_graph: true } }),
            makeIntent({ intent_id: "m1", target_domains: { mas_topology: true } })
        ];
        const bundles = bundler.bundleIntents("run-seq", intents);
        const steps = planner.sequenceSteps(patterns, bundles, intents);
        (0, vitest_1.expect)(steps.length).toBeGreaterThanOrEqual(2);
        // First step should be graph cleanup (addressing drift)
        (0, vitest_1.expect)(steps[0].intent_type).toBe("graph_distillation");
        // Second step should be MAS stabilization
        (0, vitest_1.expect)(steps[1].intent_type).toBe("mas_stability");
    });
    (0, vitest_1.it)("plan expected_impact fields are all present", () => {
        const plan = planner.generatePlan("run-impact", [makeIntent()], [], null);
        (0, vitest_1.expect)(typeof plan.expected_impact.drift_reduction).toBe("number");
        (0, vitest_1.expect)(typeof plan.expected_impact.stability_gain).toBe("number");
        (0, vitest_1.expect)(typeof plan.expected_impact.rl_value).toBe("number");
    });
});
// ===============================================================
// 5. E2E STRATEGIC PIPELINE
// ===============================================================
(0, vitest_1.describe)("E2E Strategic Pipeline", () => {
    (0, vitest_1.it)("runs the full pipeline: signals → priorities → intents → governance → scoring → bundling → planning", () => {
        // 1. Signals
        const signals = {
            drift_metrics: { tenant_drift_index: 0.35 },
            distillation_stats: { stale_node_ratio: 0.25, redundant_node_ratio: 0.15 },
            mas_health: { agent_consensus_rate: 0.96, critique_count: 2 },
            rl_metrics: { average_lighthouse_improvement: 12, conversion_rate: 0.04 }
        };
        // 2. Priorities
        const engine = new ambPriorityEngine_js_1.AmbPriorityEngine();
        const priorities = engine.computePriorities(signals);
        // 3. Synthesize
        const synthesizer = new ambIntentSynthesizer_js_1.AmbIntentSynthesizer(CHARTER);
        const rawIntents = synthesizer.synthesizeIntents("e2e-strategic", priorities, signals);
        // 4. Policy
        const interpreter = new ambPolicyInterpreter_js_1.AmbPolicyInterpreter(CHARTER);
        const aligned = rawIntents.map(i => interpreter.applyPolicy(i));
        // 5. Governance
        const masGate = new ambMasHealthGate_js_1.AmbMasHealthGate({ globalErrorRate: 0.02, globalTimeoutRate: 0.01, queueBacklogDepth: 5, criticalAgentsHealth: 0.95 });
        process.env.BYPASS_RL_TESTS = "true";
        const rlGate = new ambRlTestGate_js_1.AmbRlTestGate();
        const govGate = new ambGovernanceGate_js_1.AmbGovernanceGate(masGate, rlGate);
        const { approvedIntents } = govGate.evaluateIntents(aligned);
        // 6. Strategic Scoring
        const scorer = new ambStrategicScorer_js_1.AmbStrategicScorer(null);
        const ranked = scorer.rankIntents(approvedIntents);
        (0, vitest_1.expect)(ranked.length).toBeGreaterThan(0);
        for (const r of ranked) {
            (0, vitest_1.expect)(r.strategic_score).toBeDefined();
            (0, vitest_1.expect)(r.strategic_score).toBeGreaterThanOrEqual(0);
        }
        // 7. Bundling
        const bundler = new ambIntentBundler_js_1.AmbIntentBundler();
        const bundles = bundler.bundleIntents("e2e-strategic", ranked);
        (0, vitest_1.expect)(bundles.length).toBeGreaterThan(0);
        // 8. Planning
        const planner = new ambStrategicPlanner_js_1.AmbStrategicPlanner();
        const plan = planner.generatePlan("e2e-strategic", ranked, bundles, null);
        (0, vitest_1.expect)(plan.planned_intents.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(plan.horizon_runs).toBeGreaterThanOrEqual(1);
        delete process.env.BYPASS_RL_TESTS;
    });
    (0, vitest_1.it)("strategic scores influence ranking order over raw priority", () => {
        const scorer = new ambStrategicScorer_js_1.AmbStrategicScorer(null);
        // High priority but high risk + heavy operator burden
        const heavyIntent = makeIntent({
            intent_id: "heavy",
            priority_score: 0.95,
            risk_class: "high",
            desired_outcomes: { description: "", metrics: { gain: 0.05 } },
            constraints: { required_tests: ["npm test"], required_challenge_runs: ["baseline"], required_operator_actions: ["review", "approve", "audit", "sign_off"] }
        });
        // Lower priority but low risk + no burden
        const lightIntent = makeIntent({
            intent_id: "light",
            priority_score: 0.6,
            risk_class: "low",
            desired_outcomes: { description: "", metrics: { gain: 0.15 } },
            constraints: { required_tests: ["npm test"], required_challenge_runs: ["baseline"], required_operator_actions: [] }
        });
        const ranked = scorer.rankIntents([heavyIntent, lightIntent]);
        // Light intent should rank higher strategically despite lower raw priority
        (0, vitest_1.expect)(ranked[0].intent_id).toBe("light");
    });
    (0, vitest_1.it)("memory accumulation produces detectable patterns", () => {
        const tempDir = makeTempDir();
        try {
            const store = new ambMemoryStore_js_1.AmbMemoryStore(tempDir);
            // Simulate 3 runs with increasing drift
            for (let i = 0; i < 3; i++) {
                store.recordRun({
                    runId: `sim-run-${i}`,
                    intents: [makeIntent({ intent_id: `i-${i}`, status: "approved" })],
                    proposals: [{ proposalId: `p-${i}`, applied: true, failed: false }],
                    masSnapshot: { globalErrorRate: 0.03 + i * 0.01, globalTimeoutRate: 0.01, queueBacklogDepth: 5, criticalAgentsHealth: 0.95 },
                    driftMetrics: { tenant_drift_index: 0.2 + i * 0.15 }
                });
            }
            const memory = store.loadLatestSnapshot();
            (0, vitest_1.expect)(memory).not.toBeNull();
            (0, vitest_1.expect)(memory.drift_history.length).toBe(3);
            const planner = new ambStrategicPlanner_js_1.AmbStrategicPlanner();
            const patterns = planner.detectPatterns(memory);
            (0, vitest_1.expect)(patterns.length).toBeGreaterThan(0);
            const driftPattern = patterns.find(p => p.pattern_type === "recurring_drift");
            (0, vitest_1.expect)(driftPattern).toBeDefined();
        }
        finally {
            cleanDir(tempDir);
        }
    });
});
//# sourceMappingURL=ambStrategic.test.js.map