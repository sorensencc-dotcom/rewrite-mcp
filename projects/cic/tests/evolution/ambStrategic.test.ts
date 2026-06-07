// File: projects/cic/tests/evolution/ambStrategic.test.ts | Date: 2026-06-05 | v1.0.0
// Milestone 4 test suite: Memory, Scorer, Bundler, Planner, E2E Strategic Pipeline

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { AmbMemoryStore } from "../../evolution/src/amb/ambMemoryStore.js";
import { AmbStrategicScorer } from "../../evolution/src/amb/ambStrategicScorer.js";
import { AmbIntentBundler } from "../../evolution/src/amb/ambIntentBundler.js";
import { AmbStrategicPlanner, DetectedPattern } from "../../evolution/src/amb/ambStrategicPlanner.js";
import { AmbPriorityEngine, AmbSignals } from "../../evolution/src/amb/ambPriorityEngine.js";
import { AmbIntentSynthesizer } from "../../evolution/src/amb/ambIntentSynthesizer.js";
import { AmbPolicyInterpreter } from "../../evolution/src/amb/ambPolicyInterpreter.js";
import { AmbGovernanceGate } from "../../evolution/src/amb/ambGovernanceGate.js";
import { AmbMasHealthGate } from "../../evolution/src/amb/ambMasHealthGate.js";
import { AmbRlTestGate } from "../../evolution/src/amb/ambRlTestGate.js";
import { AmbIntentArtifact } from "../../evolution/src/types/ambIntent.js";
import { AmbMemorySnapshot } from "../../evolution/src/types/ambStrategic.js";
import { PolicyCharter } from "../../evolution/src/types/ambPolicyCharter.js";

// === Shared Fixtures ===

const CHARTER: PolicyCharter = {
  forbiddenDomains: ["security", "auth", "billing"],
  operatorOnlyDomains: ["mas_topology", "cic_config"],
  lineageRequiredDomains: ["ckg_graph", "rl_fusion"]
};

function makeIntent(overrides: Partial<AmbIntentArtifact> = {}): AmbIntentArtifact {
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

function makeMemory(overrides: Partial<AmbMemorySnapshot> = {}): AmbMemorySnapshot {
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
function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "amb-memory-test-"));
}

function cleanDir(dir: string) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* noop */ }
}

// ===============================================================
// 1. MEMORY STORE
// ===============================================================

describe("AmbMemoryStore", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    cleanDir(tempDir);
  });

  it("returns null when no snapshots exist", () => {
    const store = new AmbMemoryStore(tempDir);
    expect(store.loadLatestSnapshot()).toBeNull();
  });

  it("writes and reads a snapshot correctly", () => {
    const store = new AmbMemoryStore(tempDir);
    const snapshot = store.recordRun({
      runId: "run-001",
      intents: [makeIntent({ status: "approved" })],
      proposals: [{ proposalId: "prop-1", applied: true, failed: false }],
      masSnapshot: { globalErrorRate: 0.02, globalTimeoutRate: 0.01, queueBacklogDepth: 5, criticalAgentsHealth: 0.95 },
      driftMetrics: { tenant_drift_index: 0.3 }
    });

    const loaded = store.loadLatestSnapshot();
    expect(loaded).not.toBeNull();
    expect(loaded!.intents.length).toBe(1);
    expect(loaded!.proposals.length).toBe(1);
    expect(loaded!.mas_health_history.length).toBe(1);
    expect(loaded!.drift_history.length).toBe(1);
  });

  it("accumulates data across multiple recordRun calls", () => {
    const store = new AmbMemoryStore(tempDir);
    store.recordRun({
      runId: "run-001",
      intents: [makeIntent({ intent_id: "i1", status: "approved" })],
      proposals: [{ proposalId: "p1", applied: true, failed: false }],
      masSnapshot: { globalErrorRate: 0.02, globalTimeoutRate: 0.01, queueBacklogDepth: 5, criticalAgentsHealth: 0.95 },
      driftMetrics: { tenant_drift_index: 0.3 }
    });

    // Small delay to ensure different timestamp in filename
    const store2 = new AmbMemoryStore(tempDir);
    store2.recordRun({
      runId: "run-002",
      intents: [makeIntent({ intent_id: "i2", status: "blocked" })],
      proposals: [{ proposalId: "p2", applied: false, failed: true }],
      masSnapshot: { globalErrorRate: 0.04, globalTimeoutRate: 0.02, queueBacklogDepth: 8, criticalAgentsHealth: 0.92 },
      driftMetrics: { tenant_drift_index: 0.5 }
    });

    const loaded = store2.loadLatestSnapshot();
    expect(loaded!.intents.length).toBe(2);
    expect(loaded!.proposals.length).toBe(2);
    expect(loaded!.drift_history.length).toBe(2);
  });

  it("getIntentHistory respects lookback", () => {
    const store = new AmbMemoryStore(tempDir);
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
    expect(last2.length).toBe(2);
    expect(last2[0].intent_id).toBe("i2");
    expect(last2[1].intent_id).toBe("i3");
  });

  it("getProposalSuccessRate computes correctly", () => {
    const store = new AmbMemoryStore(tempDir);
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
    expect(rate).toBeCloseTo(0.667, 2);
  });

  it("getDriftTrend returns drift values", () => {
    const store = new AmbMemoryStore(tempDir);
    store.recordRun({
      runId: "r1",
      intents: [],
      proposals: [],
      masSnapshot: { globalErrorRate: 0.02, globalTimeoutRate: 0.01, queueBacklogDepth: 5, criticalAgentsHealth: 0.95 },
      driftMetrics: { tenant_drift_index: 0.3 }
    });
    const store2 = new AmbMemoryStore(tempDir);
    store2.recordRun({
      runId: "r2",
      intents: [],
      proposals: [],
      masSnapshot: { globalErrorRate: 0.03, globalTimeoutRate: 0.02, queueBacklogDepth: 8, criticalAgentsHealth: 0.93 },
      driftMetrics: { tenant_drift_index: 0.5 }
    });

    const trend = store2.getDriftTrend();
    expect(trend.length).toBe(2);
    expect(trend[0]).toBe(0.3);
    expect(trend[1]).toBe(0.5);
  });
});

// ===============================================================
// 2. STRATEGIC SCORER
// ===============================================================

describe("AmbStrategicScorer", () => {
  it("maps risk classes correctly: low=1, medium=2, high=3", () => {
    const scorer = new AmbStrategicScorer(null);
    const low = scorer.scoreIntent(makeIntent({ risk_class: "low" }));
    const med = scorer.scoreIntent(makeIntent({ risk_class: "medium" }));
    const high = scorer.scoreIntent(makeIntent({ risk_class: "high" }));
    // Lower risk → higher score (same impact)
    expect(low).toBeGreaterThan(med);
    expect(med).toBeGreaterThan(high);
  });

  it("operator burden reduces score", () => {
    const scorer = new AmbStrategicScorer(null);
    const light = scorer.scoreIntent(makeIntent({
      constraints: { required_tests: ["npm test"], required_challenge_runs: ["baseline"], required_operator_actions: [] }
    }));
    const heavy = scorer.scoreIntent(makeIntent({
      constraints: { required_tests: ["npm test"], required_challenge_runs: ["baseline"], required_operator_actions: ["review", "approve", "audit"] }
    }));
    expect(light).toBeGreaterThan(heavy);
  });

  it("scales with desired_outcomes metrics", () => {
    const scorer = new AmbStrategicScorer(null);
    const small = scorer.scoreIntent(makeIntent({
      desired_outcomes: { description: "Small", metrics: { gain: 0.01 } }
    }));
    const large = scorer.scoreIntent(makeIntent({
      desired_outcomes: { description: "Large", metrics: { gain: 0.5 } }
    }));
    expect(large).toBeGreaterThan(small);
  });

  it("applies historical boost from memory", () => {
    const memory = makeMemory({
      intents: [
        { intent_id: "past-1", run_id: "r1", intent_type: "graph_distillation", risk_class: "low", status: "approved", timestamp: "" }
      ],
      proposals: [
        { proposal_id: "p1", run_id: "r1", source_intent_id: "past-1", applied: true, failed: false }
      ]
    });
    const scorer = new AmbStrategicScorer(memory);
    const boost = scorer.computeHistoricalBoost("graph_distillation");
    // 100% success → boost = 0.5 + 1.0 = 1.5
    expect(boost).toBe(1.5);
  });

  it("ranks intents in descending strategic_score order", () => {
    const scorer = new AmbStrategicScorer(null);
    const intents = [
      makeIntent({ intent_id: "high-risk", risk_class: "high", desired_outcomes: { description: "", metrics: { v: 0.1 } } }),
      makeIntent({ intent_id: "low-risk", risk_class: "low", desired_outcomes: { description: "", metrics: { v: 0.3 } } }),
      makeIntent({ intent_id: "med-risk", risk_class: "medium", desired_outcomes: { description: "", metrics: { v: 0.2 } } })
    ];
    const ranked = scorer.rankIntents(intents);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].strategic_score).toBeGreaterThanOrEqual(ranked[i].strategic_score);
    }
  });
});

// ===============================================================
// 3. INTENT BUNDLER
// ===============================================================

describe("AmbIntentBundler", () => {
  const bundler = new AmbIntentBundler();

  it("classifies ckg_graph → graph_cleanup", () => {
    expect(bundler.classifyBundleType(makeIntent({ target_domains: { ckg_graph: true } }))).toBe("graph_cleanup");
  });

  it("classifies mas_topology → mas_stability", () => {
    expect(bundler.classifyBundleType(makeIntent({ target_domains: { mas_topology: true } }))).toBe("mas_stability");
  });

  it("classifies rl_fusion → tenant_redesign", () => {
    expect(bundler.classifyBundleType(makeIntent({ target_domains: { rl_fusion: true } }))).toBe("tenant_redesign");
  });

  it("classifies cic_config → planner_tuning", () => {
    expect(bundler.classifyBundleType(makeIntent({ target_domains: { cic_config: true } }))).toBe("planner_tuning");
  });

  it("groups intents into correct bundles by domain", () => {
    const intents = [
      makeIntent({ intent_id: "g1", target_domains: { ckg_graph: true } }),
      makeIntent({ intent_id: "g2", target_domains: { ckg_graph: true } }),
      makeIntent({ intent_id: "m1", target_domains: { mas_topology: true } }),
      makeIntent({ intent_id: "r1", target_domains: { rl_fusion: true } })
    ];
    const bundles = bundler.bundleIntents("run-test", intents);
    expect(bundles.length).toBe(3);

    const graphBundle = bundles.find(b => b.bundle_type === "graph_cleanup");
    expect(graphBundle).toBeDefined();
    expect(graphBundle!.intent_ids.length).toBe(2);
  });

  it("aggregate priority is max of members", () => {
    const intents = [
      makeIntent({ intent_id: "a", priority_score: 0.3, target_domains: { ckg_graph: true } }),
      makeIntent({ intent_id: "b", priority_score: 0.9, target_domains: { ckg_graph: true } })
    ];
    const bundles = bundler.bundleIntents("run-test", intents);
    expect(bundles[0].aggregate_priority_score).toBe(0.9);
  });

  it("aggregate risk is max of members", () => {
    const intents = [
      makeIntent({ intent_id: "a", risk_class: "low", target_domains: { ckg_graph: true } }),
      makeIntent({ intent_id: "b", risk_class: "high", target_domains: { ckg_graph: true } })
    ];
    const bundles = bundler.bundleIntents("run-test", intents);
    expect(bundles[0].aggregate_risk_class).toBe("high");
  });

  it("returns empty array for empty intents", () => {
    expect(bundler.bundleIntents("run-test", []).length).toBe(0);
  });
});

// ===============================================================
// 4. STRATEGIC PLANNER
// ===============================================================

describe("AmbStrategicPlanner", () => {
  const planner = new AmbStrategicPlanner();

  it("generates a plan with horizon_runs and planned_intents", () => {
    const intents = [makeIntent()];
    const bundler = new AmbIntentBundler();
    const bundles = bundler.bundleIntents("run-p1", intents);

    const plan = planner.generatePlan("run-p1", intents, bundles, null);
    expect(plan.plan_id).toBeDefined();
    expect(plan.run_id).toBe("run-p1");
    expect(plan.horizon_runs).toBeGreaterThanOrEqual(1);
    expect(plan.planned_intents.length).toBeGreaterThan(0);
    expect(plan.expected_impact).toBeDefined();
    expect(plan.expected_impact.drift_reduction).toBeGreaterThanOrEqual(0);
  });

  it("detects recurring drift pattern from memory", () => {
    const memory = makeMemory({
      drift_history: [
        { run_id: "r1", timestamp: "", tenant_drift_index: 0.4 },
        { run_id: "r2", timestamp: "", tenant_drift_index: 0.5 },
        { run_id: "r3", timestamp: "", tenant_drift_index: 0.6 }
      ]
    });
    const patterns = planner.detectPatterns(memory);
    const driftPattern = patterns.find(p => p.pattern_type === "recurring_drift");
    expect(driftPattern).toBeDefined();
    expect(driftPattern!.severity).toBe("medium");
  });

  it("detects persistent MAS instability", () => {
    const memory = makeMemory({
      mas_health_history: [
        { run_id: "r1", timestamp: "", globalErrorRate: 0.04, globalTimeoutRate: 0.01, queueBacklogDepth: 5, criticalAgentsHealth: 0.95 },
        { run_id: "r2", timestamp: "", globalErrorRate: 0.05, globalTimeoutRate: 0.02, queueBacklogDepth: 8, criticalAgentsHealth: 0.92 }
      ]
    });
    const patterns = planner.detectPatterns(memory);
    const masPattern = patterns.find(p => p.pattern_type === "persistent_mas_instability");
    expect(masPattern).toBeDefined();
  });

  it("sequences steps logically: cleanup → stabilize → tune", () => {
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
    const bundler = new AmbIntentBundler();
    const intents = [
      makeIntent({ intent_id: "g1", target_domains: { ckg_graph: true } }),
      makeIntent({ intent_id: "m1", target_domains: { mas_topology: true } })
    ];
    const bundles = bundler.bundleIntents("run-seq", intents);
    const steps = planner.sequenceSteps(patterns, bundles, intents);

    expect(steps.length).toBeGreaterThanOrEqual(2);
    // First step should be graph cleanup (addressing drift)
    expect(steps[0].intent_type).toBe("graph_distillation");
    // Second step should be MAS stabilization
    expect(steps[1].intent_type).toBe("mas_stability");
  });

  it("plan expected_impact fields are all present", () => {
    const plan = planner.generatePlan("run-impact", [makeIntent()], [], null);
    expect(typeof plan.expected_impact.drift_reduction).toBe("number");
    expect(typeof plan.expected_impact.stability_gain).toBe("number");
    expect(typeof plan.expected_impact.rl_value).toBe("number");
  });
});

// ===============================================================
// 5. E2E STRATEGIC PIPELINE
// ===============================================================

describe("E2E Strategic Pipeline", () => {
  it("runs the full pipeline: signals → priorities → intents → governance → scoring → bundling → planning", () => {
    // 1. Signals
    const signals: AmbSignals = {
      drift_metrics: { tenant_drift_index: 0.35 },
      distillation_stats: { stale_node_ratio: 0.25, redundant_node_ratio: 0.15 },
      mas_health: { agent_consensus_rate: 0.96, critique_count: 2 },
      rl_metrics: { average_lighthouse_improvement: 12, conversion_rate: 0.04 }
    };

    // 2. Priorities
    const engine = new AmbPriorityEngine();
    const priorities = engine.computePriorities(signals);

    // 3. Synthesize
    const synthesizer = new AmbIntentSynthesizer(CHARTER);
    const rawIntents = synthesizer.synthesizeIntents("e2e-strategic", priorities, signals);

    // 4. Policy
    const interpreter = new AmbPolicyInterpreter(CHARTER);
    const aligned = rawIntents.map(i => interpreter.applyPolicy(i));

    // 5. Governance
    const masGate = new AmbMasHealthGate({ globalErrorRate: 0.02, globalTimeoutRate: 0.01, queueBacklogDepth: 5, criticalAgentsHealth: 0.95 });
    process.env.BYPASS_RL_TESTS = "true";
    const rlGate = new AmbRlTestGate();
    const govGate = new AmbGovernanceGate(masGate, rlGate);
    const { approvedIntents } = govGate.evaluateIntents(aligned);

    // 6. Strategic Scoring
    const scorer = new AmbStrategicScorer(null);
    const ranked = scorer.rankIntents(approvedIntents);
    expect(ranked.length).toBeGreaterThan(0);
    for (const r of ranked) {
      expect(r.strategic_score).toBeDefined();
      expect(r.strategic_score).toBeGreaterThanOrEqual(0);
    }

    // 7. Bundling
    const bundler = new AmbIntentBundler();
    const bundles = bundler.bundleIntents("e2e-strategic", ranked);
    expect(bundles.length).toBeGreaterThan(0);

    // 8. Planning
    const planner = new AmbStrategicPlanner();
    const plan = planner.generatePlan("e2e-strategic", ranked, bundles, null);
    expect(plan.planned_intents.length).toBeGreaterThan(0);
    expect(plan.horizon_runs).toBeGreaterThanOrEqual(1);

    delete process.env.BYPASS_RL_TESTS;
  });

  it("strategic scores influence ranking order over raw priority", () => {
    const scorer = new AmbStrategicScorer(null);

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
    expect(ranked[0].intent_id).toBe("light");
  });

  it("memory accumulation produces detectable patterns", () => {
    const tempDir = makeTempDir();
    try {
      const store = new AmbMemoryStore(tempDir);

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
      expect(memory).not.toBeNull();
      expect(memory!.drift_history.length).toBe(3);

      const planner = new AmbStrategicPlanner();
      const patterns = planner.detectPatterns(memory);
      expect(patterns.length).toBeGreaterThan(0);

      const driftPattern = patterns.find(p => p.pattern_type === "recurring_drift");
      expect(driftPattern).toBeDefined();
    } finally {
      cleanDir(tempDir);
    }
  });
});
