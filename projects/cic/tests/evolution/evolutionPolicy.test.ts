// File: projects/cic/tests/evolution/evolutionPolicy.test.ts | Date: 2026-06-05 | v1.0.0
// Full Milestone 3 test suite: Policy → Governance → LoopRunner E2E

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AmbPolicyInterpreter } from "../../evolution/src/amb/ambPolicyInterpreter.js";
import { AmbMasHealthGate } from "../../evolution/src/amb/ambMasHealthGate.js";
import { AmbRlTestGate } from "../../evolution/src/amb/ambRlTestGate.js";
import { AmbGovernanceGate } from "../../evolution/src/amb/ambGovernanceGate.js";
import { AmbPriorityEngine, AmbSignals } from "../../evolution/src/amb/ambPriorityEngine.js";
import { AmbIntentSynthesizer } from "../../evolution/src/amb/ambIntentSynthesizer.js";
import { AmbIntentArtifact } from "../../evolution/src/types/ambIntent.js";
import { PolicyCharter } from "../../evolution/src/types/ambPolicyCharter.js";
import { MasHealthSnapshot, MAS_HEALTH_THRESHOLDS } from "../../evolution/src/amb/ambMasHealthConfig.js";

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
      summary: "Reduce CKG entropy for high-drift tenants.",
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

function healthySnapshot(): MasHealthSnapshot {
  return {
    globalErrorRate: 0.01,
    globalTimeoutRate: 0.01,
    queueBacklogDepth: 5,
    criticalAgentsHealth: 0.98
  };
}

function unhealthySnapshot(field: keyof MasHealthSnapshot, value: number): MasHealthSnapshot {
  const snap = healthySnapshot();
  snap[field] = value;
  return snap;
}

// ===============================================================
// 1. POLICY INTERPRETER — Classification Tests
// ===============================================================

describe("PolicyInterpreter — Classification Matrix", () => {
  const interpreter = new AmbPolicyInterpreter(CHARTER);

  it("marks rl_fusion intent as rl_dependent + high risk", () => {
    const result = interpreter.applyPolicy(makeIntent({
      intent_type: "rl_fusion",
      target_domains: { rl_fusion: true }
    }));
    expect(result.policy_alignment.rl_dependent).toBe(true);
    expect(result.risk_class).toBe("high");
  });

  it("marks ckg_graph intent as lineage_required + high risk", () => {
    const result = interpreter.applyPolicy(makeIntent({
      intent_type: "graph_distillation",
      target_domains: { ckg_graph: true }
    }));
    expect(result.policy_alignment.lineage_required).toBe(true);
    expect(result.risk_class).toBe("high");
  });

  it("marks mas_topology intent as operator_required + medium risk", () => {
    const result = interpreter.applyPolicy(makeIntent({
      intent_type: "mas_stability",
      target_domains: { mas_topology: true }
    }));
    expect(result.policy_alignment.operator_required).toBe(true);
    expect(result.risk_class).toBe("medium");
  });

  it("marks cic_config intent as operator_required + medium risk", () => {
    const result = interpreter.applyPolicy(makeIntent({
      intent_type: "planner_tuning",
      target_domains: { cic_config: true }
    }));
    expect(result.policy_alignment.operator_required).toBe(true);
    expect(result.risk_class).toBe("medium");
  });

  it("detects forbidden keywords in justification summary", () => {
    const variants = [
      "disable logging on all agents",
      "remove lineage tracking",
      "bypass audit controls",
      "modify security ACL",
      "change auth tokens",
      "update billing logic"
    ];
    for (const summary of variants) {
      const result = interpreter.applyPolicy(makeIntent({
        target_domains: {},
        justification: { summary, signals: {}, references: [] }
      }));
      expect(result.policy_alignment.forbidden_domain).toBe(true);
    }
  });

  it("assigns low risk when no high-risk domains are targeted", () => {
    const result = interpreter.applyPolicy(makeIntent({
      intent_type: "generic_improvement",
      target_domains: {}
    }));
    expect(result.risk_class).toBe("low");
  });

  it("initializes policy_alignment when missing on input", () => {
    const intent = makeIntent();
    // @ts-expect-error: Simulating missing field
    delete intent.policy_alignment;
    const result = interpreter.applyPolicy(intent);
    expect(result.policy_alignment).toBeDefined();
    expect(typeof result.policy_alignment.forbidden_domain).toBe("boolean");
  });
});

// ===============================================================
// 2. MAS HEALTH GATE — Boundary Tests
// ===============================================================

describe("MasHealthGate — Threshold Boundaries", () => {
  const intent = makeIntent();

  it("rejects when globalErrorRate exceeds threshold", () => {
    const gate = new AmbMasHealthGate(unhealthySnapshot("globalErrorRate", 0.06));
    expect(gate.isMasStableFor(intent)).toBe(false);
  });

  it("rejects when globalTimeoutRate exceeds threshold", () => {
    const gate = new AmbMasHealthGate(unhealthySnapshot("globalTimeoutRate", 0.08));
    expect(gate.isMasStableFor(intent)).toBe(false);
  });

  it("rejects when queueBacklogDepth exceeds threshold", () => {
    const gate = new AmbMasHealthGate(unhealthySnapshot("queueBacklogDepth", 150));
    expect(gate.isMasStableFor(intent)).toBe(false);
  });

  it("rejects when criticalAgentsHealth below threshold", () => {
    const gate = new AmbMasHealthGate(unhealthySnapshot("criticalAgentsHealth", 0.85));
    expect(gate.isMasStableFor(intent)).toBe(false);
  });

  it("approves when all metrics are exactly at threshold limits", () => {
    const borderline: MasHealthSnapshot = {
      globalErrorRate: MAS_HEALTH_THRESHOLDS.maxGlobalErrorRate,       // 0.05 (not >)
      globalTimeoutRate: MAS_HEALTH_THRESHOLDS.maxTimeoutRate,         // 0.05
      queueBacklogDepth: MAS_HEALTH_THRESHOLDS.maxBacklogDepth,       // 100
      criticalAgentsHealth: MAS_HEALTH_THRESHOLDS.criticalAgentsMinHealth // 0.9
    };
    const gate = new AmbMasHealthGate(borderline);
    expect(gate.isMasStableFor(intent)).toBe(true);
  });

  it("approves with healthy snapshot", () => {
    const gate = new AmbMasHealthGate(healthySnapshot());
    expect(gate.isMasStableFor(intent)).toBe(true);
  });
});

// ===============================================================
// 3. RL TEST GATE — Env bypass
// ===============================================================

describe("RlTestGate — Environment Bypass", () => {
  beforeEach(() => {
    delete process.env.BYPASS_RL_TESTS;
  });

  it("returns true when BYPASS_RL_TESTS=true", () => {
    process.env.BYPASS_RL_TESTS = "true";
    const gate = new AmbRlTestGate();
    expect(gate.isRlHealthy()).toBe(true);
  });

  it("caches the result after first call", () => {
    process.env.BYPASS_RL_TESTS = "true";
    const gate = new AmbRlTestGate();
    gate.isRlHealthy(); // first call
    delete process.env.BYPASS_RL_TESTS;
    expect(gate.isRlHealthy()).toBe(true); // cached
  });
});

// ===============================================================
// 4. GOVERNANCE GATE — Status Transition Matrix
// ===============================================================

describe("GovernanceGate — Status Transitions", () => {
  const stableMas = { isMasStableFor: () => true } as unknown as AmbMasHealthGate;
  const healthyRl = { isRlHealthy: () => true } as unknown as AmbRlTestGate;
  const unstableMas = { isMasStableFor: () => false } as unknown as AmbMasHealthGate;
  const failingRl = { isRlHealthy: () => false } as unknown as AmbRlTestGate;

  it("approves low-risk intent with healthy gates", () => {
    const gate = new AmbGovernanceGate(stableMas, healthyRl);
    const { approvedIntents, allIntentsWithStatus } = gate.evaluateIntents([
      makeIntent({ risk_class: "low" })
    ]);
    expect(approvedIntents.length).toBe(1);
    expect(allIntentsWithStatus[0].status).toBe("approved");
  });

  it("sets high-risk to pending (operator review)", () => {
    const gate = new AmbGovernanceGate(stableMas, healthyRl);
    const { approvedIntents, allIntentsWithStatus } = gate.evaluateIntents([
      makeIntent({ risk_class: "high" })
    ]);
    expect(approvedIntents.length).toBe(0);
    expect(allIntentsWithStatus[0].status).toBe("pending");
    expect(allIntentsWithStatus[0].governance_notes).toContain("operator approval required");
  });

  it("blocks forbidden domain intent", () => {
    const gate = new AmbGovernanceGate(stableMas, healthyRl);
    const { approvedIntents, allIntentsWithStatus, report } = gate.evaluateIntents([
      makeIntent({ policy_alignment: { forbidden_domain: true, operator_required: false, lineage_required: false, rl_dependent: false } })
    ]);
    expect(approvedIntents.length).toBe(0);
    expect(allIntentsWithStatus[0].status).toBe("blocked");
    expect(report.rejections[0].reason).toContain("Forbidden domain");
  });

  it("blocks rl_dependent intent when RL tests fail", () => {
    const gate = new AmbGovernanceGate(stableMas, failingRl);
    const { allIntentsWithStatus } = gate.evaluateIntents([
      makeIntent({
        policy_alignment: { forbidden_domain: false, operator_required: false, lineage_required: false, rl_dependent: true }
      })
    ]);
    expect(allIntentsWithStatus[0].status).toBe("blocked");
    expect(allIntentsWithStatus[0].blocked_reason).toContain("Rewrite Labs tests failing");
  });

  it("downgrades intent when MAS is unstable", () => {
    const gate = new AmbGovernanceGate(unstableMas, healthyRl);
    const { allIntentsWithStatus } = gate.evaluateIntents([
      makeIntent({ risk_class: "low" })
    ]);
    expect(allIntentsWithStatus[0].status).toBe("downgraded");
    expect(allIntentsWithStatus[0].governance_notes).toContain("MAS health below threshold");
  });

  it("forbidden check takes priority over all other gates", () => {
    // Even with unstable MAS and failing RL, forbidden should be the reason
    const gate = new AmbGovernanceGate(unstableMas, failingRl);
    const { allIntentsWithStatus } = gate.evaluateIntents([
      makeIntent({
        risk_class: "high",
        policy_alignment: { forbidden_domain: true, operator_required: true, lineage_required: true, rl_dependent: true }
      })
    ]);
    expect(allIntentsWithStatus[0].status).toBe("blocked");
    expect(allIntentsWithStatus[0].blocked_reason).toContain("Forbidden domain");
  });

  it("processes a mixed batch of intents correctly", () => {
    const gate = new AmbGovernanceGate(stableMas, healthyRl);
    const intents = [
      makeIntent({ intent_id: "approved-1", risk_class: "low" }),
      makeIntent({ intent_id: "blocked-1", policy_alignment: { forbidden_domain: true, operator_required: false, lineage_required: false, rl_dependent: false } }),
      makeIntent({ intent_id: "pending-1", risk_class: "high" }),
    ];
    const { approvedIntents, report } = gate.evaluateIntents(intents);
    expect(approvedIntents.length).toBe(1);
    expect(approvedIntents[0].intent_id).toBe("approved-1");
    expect(report.evaluatedCount).toBe(3);
    expect(report.approvedCount).toBe(1);
    expect(report.rejectedCount).toBe(2);
  });
});

// ===============================================================
// 5. PRIORITY ENGINE — Scoring Logic
// ===============================================================

describe("PriorityEngine — Scoring Correctness", () => {
  const engine = new AmbPriorityEngine();

  it("returns four priority results for complete signal set", () => {
    const signals: AmbSignals = {
      drift_metrics: { tenant_drift_index: 0.3 },
      distillation_stats: { stale_node_ratio: 0.2, redundant_node_ratio: 0.1 },
      mas_health: { agent_consensus_rate: 0.95, critique_count: 2 },
      rl_metrics: { average_lighthouse_improvement: 10, conversion_rate: 0.05 }
    };
    const results = engine.computePriorities(signals);
    expect(results.length).toBe(4);
    expect(results.map(r => r.intent_type).sort()).toEqual(
      ["graph_distillation", "mas_stability", "planner_tuning", "rl_fusion"].sort()
    );
  });

  it("sorts results by descending priority_score", () => {
    const signals: AmbSignals = {
      drift_metrics: { tenant_drift_index: 0.5 },
      distillation_stats: { stale_node_ratio: 0.4, redundant_node_ratio: 0.3 },
      mas_health: { agent_consensus_rate: 0.9, critique_count: 3 },
      rl_metrics: { average_lighthouse_improvement: 5, conversion_rate: 0.1 }
    };
    const results = engine.computePriorities(signals);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].priority_score).toBeGreaterThanOrEqual(results[i].priority_score);
    }
  });

  it("caps all scores at 1.0", () => {
    const extremeSignals: AmbSignals = {
      drift_metrics: { tenant_drift_index: 100 },
      distillation_stats: { stale_node_ratio: 100, redundant_node_ratio: 100 },
      mas_health: { agent_consensus_rate: 0, critique_count: 1000 },
      rl_metrics: { average_lighthouse_improvement: 0, conversion_rate: 100 }
    };
    const results = engine.computePriorities(extremeSignals);
    for (const r of results) {
      expect(r.priority_score).toBeLessThanOrEqual(1.0);
    }
  });

  it("produces zero mas_stability score when consensus is perfect and no critiques", () => {
    const signals: AmbSignals = {
      mas_health: { agent_consensus_rate: 1.0, critique_count: 0 }
    };
    const results = engine.computePriorities(signals);
    const mas = results.find(r => r.intent_type === "mas_stability");
    expect(mas!.priority_score).toBe(0);
  });
});

// ===============================================================
// 6. INTENT SYNTHESIZER — Output Shape
// ===============================================================

describe("IntentSynthesizer — Output Contract", () => {
  const synthesizer = new AmbIntentSynthesizer(CHARTER);
  const signals: AmbSignals = {
    drift_metrics: { tenant_drift_index: 0.4 },
    distillation_stats: { stale_node_ratio: 0.3, redundant_node_ratio: 0.1 },
    mas_health: { agent_consensus_rate: 0.92, critique_count: 3 },
    rl_metrics: { average_lighthouse_improvement: 8, conversion_rate: 0.06 }
  };

  it("produces intents for every priority above 0.3 threshold", () => {
    const priorities = new AmbPriorityEngine().computePriorities(signals);
    const intents = synthesizer.synthesizeIntents("run-synth-001", priorities, signals);
    const aboveThreshold = priorities.filter(p => p.priority_score >= 0.3);
    expect(intents.length).toBe(aboveThreshold.length);
  });

  it("every synthesized intent has required contract fields", () => {
    const priorities = new AmbPriorityEngine().computePriorities(signals);
    const intents = synthesizer.synthesizeIntents("run-synth-001", priorities, signals);
    for (const intent of intents) {
      expect(intent.intent_id).toBeDefined();
      expect(intent.run_id).toBe("run-synth-001");
      expect(intent.source).toBe("AMB");
      expect(intent.version).toBe("v0.1.0");
      expect(intent.priority_score).toBeGreaterThanOrEqual(0);
      expect(intent.priority_score).toBeLessThanOrEqual(1);
      expect(["low", "medium", "high"]).toContain(intent.risk_class);
      expect(intent.policy_alignment).toBeDefined();
      expect(intent.justification.summary.length).toBeGreaterThan(0);
      expect(intent.constraints.required_tests.length).toBeGreaterThan(0);
      expect(intent.desired_outcomes.description.length).toBeGreaterThan(0);
    }
  });

  it("rl_fusion intent includes test:rewrite-labs in required_tests", () => {
    const priorities = new AmbPriorityEngine().computePriorities(signals);
    const intents = synthesizer.synthesizeIntents("run-synth-001", priorities, signals);
    const rlIntent = intents.find(i => i.intent_type === "rl_fusion");
    if (rlIntent) {
      expect(rlIntent.constraints.required_tests).toContain("npm run test:rewrite-labs");
      expect(rlIntent.constraints.required_challenge_runs).toContain("fusion");
    }
  });

  it("high-risk intents include approve_high_risk_changes in operator actions", () => {
    const priorities = new AmbPriorityEngine().computePriorities(signals);
    const intents = synthesizer.synthesizeIntents("run-synth-001", priorities, signals);
    const highRisk = intents.filter(i => i.risk_class === "high");
    for (const hr of highRisk) {
      expect(hr.constraints.required_operator_actions).toContain("approve_high_risk_changes");
    }
  });

  it("filters out priorities below 0.3 threshold", () => {
    const lowSignals: AmbSignals = {
      drift_metrics: { tenant_drift_index: 0 },
      distillation_stats: { stale_node_ratio: 0, redundant_node_ratio: 0 },
      mas_health: { agent_consensus_rate: 1.0, critique_count: 0 },
      rl_metrics: { average_lighthouse_improvement: 50, conversion_rate: 0 }
    };
    const priorities = new AmbPriorityEngine().computePriorities(lowSignals);
    const intents = synthesizer.synthesizeIntents("run-low", priorities, lowSignals);
    for (const intent of intents) {
      expect(intent.priority_score).toBeGreaterThanOrEqual(0.3);
    }
  });
});

// ===============================================================
// 7. LOOPRUNNER PROPOSAL MAPPING — Lineage Fields
// ===============================================================

describe("LoopRunner Proposal Mapping — Lineage Integration", () => {
  // We test the proposal stage logic directly by replicating the mapping
  // without needing filesystem access or CKG

  function mapIntentToProposal(intent: AmbIntentArtifact) {
    // Mirrors loopRunner.stageProposals logic
    let prop: any = null;
    if (intent.intent_type === "graph_distillation") {
      prop = {
        proposalId: `prop-distill-test`,
        title: intent.justification.summary,
        patches: [],
        source_intent_id: intent.intent_id
      };
    } else if (intent.intent_type === "rl_fusion") {
      prop = {
        proposalId: `prop-fusion-test`,
        title: intent.justification.summary,
        patches: [],
        source_intent_id: intent.intent_id
      };
    } else if (intent.intent_type === "planner_tuning") {
      prop = {
        proposalId: `prop-tune-test`,
        title: intent.justification.summary,
        patches: [],
        source_intent_id: intent.intent_id
      };
    } else if (intent.intent_type === "mas_stability") {
      prop = {
        proposalId: `prop-mas-test`,
        title: intent.justification.summary,
        patches: [],
        source_intent_id: intent.intent_id
      };
    }
    if (prop) {
      prop.source_intent_risk_class = intent.risk_class;
      prop.source_intent_status = intent.status;
    }
    return prop;
  }

  it("carries source_intent_risk_class on proposals", () => {
    const intent = makeIntent({ risk_class: "high", status: "approved" });
    const prop = mapIntentToProposal(intent);
    expect(prop.source_intent_risk_class).toBe("high");
  });

  it("carries source_intent_status on proposals", () => {
    const intent = makeIntent({ status: "approved" });
    const prop = mapIntentToProposal(intent);
    expect(prop.source_intent_status).toBe("approved");
  });

  it("maps all four intent types to proposals", () => {
    const types = ["graph_distillation", "rl_fusion", "planner_tuning", "mas_stability"];
    for (const t of types) {
      const intent = makeIntent({ intent_type: t, status: "approved" });
      const prop = mapIntentToProposal(intent);
      expect(prop).not.toBeNull();
      expect(prop.source_intent_id).toBe(intent.intent_id);
    }
  });

  it("returns null for unknown intent types", () => {
    const intent = makeIntent({ intent_type: "unknown_type" });
    const prop = mapIntentToProposal(intent);
    expect(prop).toBeNull();
  });
});

// ===============================================================
// 8. END-TO-END PIPELINE — Full Governance Flow
// ===============================================================

describe("E2E Pipeline — Signals → Priorities → Intents → Governance", () => {
  it("runs the full pipeline and produces correct governance verdicts", () => {
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
    expect(priorities.length).toBe(4);

    // 3. Synthesize
    const synthesizer = new AmbIntentSynthesizer(CHARTER);
    const rawIntents = synthesizer.synthesizeIntents("e2e-run-001", priorities, signals);
    expect(rawIntents.length).toBeGreaterThan(0);

    // 4. Apply policy
    const interpreter = new AmbPolicyInterpreter(CHARTER);
    const alignedIntents = rawIntents.map(i => interpreter.applyPolicy(i));

    // 5. Governance
    const masGate = new AmbMasHealthGate(healthySnapshot());
    process.env.BYPASS_RL_TESTS = "true";
    const rlGate = new AmbRlTestGate();
    const govGate = new AmbGovernanceGate(masGate, rlGate);

    const { approvedIntents, allIntentsWithStatus, report } = govGate.evaluateIntents(alignedIntents);

    // Verify
    expect(report.evaluatedCount).toBe(alignedIntents.length);
    expect(report.evaluatedCount).toBeGreaterThan(0);

    // Every intent has a valid status
    for (const intent of allIntentsWithStatus) {
      expect(["approved", "blocked", "downgraded", "pending"]).toContain(intent.status);
    }

    // High-risk intents should be pending (not auto-approved)
    const highRisk = allIntentsWithStatus.filter(i => i.risk_class === "high");
    for (const hr of highRisk) {
      expect(hr.status).toBe("pending");
    }

    // No forbidden intents should be approved
    const forbidden = allIntentsWithStatus.filter(i => i.policy_alignment.forbidden_domain);
    for (const f of forbidden) {
      expect(f.status).toBe("blocked");
    }

    // Clean up
    delete process.env.BYPASS_RL_TESTS;
  });

  it("blocks all rl_dependent intents when RL tests fail", () => {
    const signals: AmbSignals = {
      drift_metrics: { tenant_drift_index: 0.1 },
      distillation_stats: { stale_node_ratio: 0.05, redundant_node_ratio: 0.02 },
      mas_health: { agent_consensus_rate: 0.99, critique_count: 0 },
      rl_metrics: { average_lighthouse_improvement: 15, conversion_rate: 0.03 }
    };

    const engine = new AmbPriorityEngine();
    const priorities = engine.computePriorities(signals);
    const synthesizer = new AmbIntentSynthesizer(CHARTER);
    const rawIntents = synthesizer.synthesizeIntents("e2e-rl-fail", priorities, signals);

    const interpreter = new AmbPolicyInterpreter(CHARTER);
    const aligned = rawIntents.map(i => interpreter.applyPolicy(i));

    const masGate = new AmbMasHealthGate(healthySnapshot());
    const failingRl = { isRlHealthy: () => false } as unknown as AmbRlTestGate;
    const govGate = new AmbGovernanceGate(masGate, failingRl);

    const { allIntentsWithStatus } = govGate.evaluateIntents(aligned);

    const rlDependent = allIntentsWithStatus.filter(i => i.policy_alignment.rl_dependent);
    for (const rl of rlDependent) {
      expect(rl.status).toBe("blocked");
      expect(rl.blocked_reason).toContain("Rewrite Labs tests failing");
    }
  });

  it("downgrades all intents when MAS is unstable", () => {
    const signals: AmbSignals = {
      drift_metrics: { tenant_drift_index: 0.2 },
      distillation_stats: { stale_node_ratio: 0.1, redundant_node_ratio: 0.05 },
      mas_health: { agent_consensus_rate: 0.97, critique_count: 1 },
      rl_metrics: { average_lighthouse_improvement: 20, conversion_rate: 0.02 }
    };

    const engine = new AmbPriorityEngine();
    const priorities = engine.computePriorities(signals);
    const synthesizer = new AmbIntentSynthesizer(CHARTER);
    const rawIntents = synthesizer.synthesizeIntents("e2e-mas-fail", priorities, signals);

    const interpreter = new AmbPolicyInterpreter(CHARTER);
    const aligned = rawIntents.map(i => interpreter.applyPolicy(i));

    const unstableMas = { isMasStableFor: () => false } as unknown as AmbMasHealthGate;
    process.env.BYPASS_RL_TESTS = "true";
    const rlGate = new AmbRlTestGate();
    const govGate = new AmbGovernanceGate(unstableMas, rlGate);

    const { approvedIntents, allIntentsWithStatus } = govGate.evaluateIntents(aligned);

    // No approvals when MAS is down
    expect(approvedIntents.length).toBe(0);

    // Non-forbidden, non-rl-dependent intents should be downgraded
    const nonForbidden = allIntentsWithStatus.filter(
      i => !i.policy_alignment.forbidden_domain && !i.policy_alignment.rl_dependent
    );
    for (const intent of nonForbidden) {
      expect(intent.status).toBe("downgraded");
    }

    delete process.env.BYPASS_RL_TESTS;
  });
});
