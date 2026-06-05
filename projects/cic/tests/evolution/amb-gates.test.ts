// File: projects/cic/tests/evolution/amb-gates.test.ts | Date: 2026-06-05 | v1.0.0

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AmbPolicyInterpreter } from "../../evolution/src/amb/ambPolicyInterpreter.js";
import { AmbMasHealthGate } from "../../evolution/src/amb/ambMasHealthGate.js";
import { AmbRlTestGate } from "../../evolution/src/amb/ambRlTestGate.js";
import { AmbGovernanceGate } from "../../evolution/src/amb/ambGovernanceGate.js";
import { AmbIntentArtifact } from "../../evolution/src/types/ambIntent.js";
import { PolicyCharter } from "../../evolution/src/types/ambPolicyCharter.js";
import { MasHealthSnapshot } from "../../evolution/src/amb/ambMasHealthConfig.js";

describe("AMB Policy Interpreter", () => {
  const charter: PolicyCharter = {
    forbiddenDomains: ["security", "auth", "billing"],
    operatorOnlyDomains: ["mas_topology", "cic_config"],
    lineageRequiredDomains: ["ckg_graph", "rl_fusion"]
  };
  const interpreter = new AmbPolicyInterpreter(charter);

  it("should classify forbidden domains and raise appropriate alignment flag", () => {
    const intent: AmbIntentArtifact = {
      intent_id: "int-01",
      run_id: "run-01",
      timestamp: new Date().toISOString(),
      version: "v0.1.0",
      source: "AMB",
      intent_type: "graph_distillation",
      priority_score: 0.8,
      risk_class: "low",
      policy_alignment: {
        forbidden_domain: false,
        operator_required: false,
        lineage_required: false,
        rl_dependent: false
      },
      justification: {
        summary: "Bypass auditing and disable logging systems",
        signals: {},
        references: []
      },
      constraints: { required_tests: [], required_challenge_runs: [], required_operator_actions: [] },
      target_domains: { ckg_graph: true },
      desired_outcomes: { description: "Prune graph", metrics: {} }
    };

    const evaluated = interpreter.applyPolicy(intent);
    expect(evaluated.policy_alignment.forbidden_domain).toBe(true);
  });

  it("should detect operator only domains and require operator", () => {
    const intent: AmbIntentArtifact = {
      intent_id: "int-02",
      run_id: "run-01",
      timestamp: new Date().toISOString(),
      version: "v0.1.0",
      source: "AMB",
      intent_type: "mas_stability",
      priority_score: 0.5,
      risk_class: "low",
      policy_alignment: {
        forbidden_domain: false,
        operator_required: false,
        lineage_required: false,
        rl_dependent: false
      },
      justification: {
        summary: "Optimize planner topology",
        signals: {},
        references: []
      },
      constraints: { required_tests: [], required_challenge_runs: [], required_operator_actions: [] },
      target_domains: { mas_topology: true },
      desired_outcomes: { description: "Optimize MAS", metrics: {} }
    };

    const evaluated = interpreter.applyPolicy(intent);
    expect(evaluated.policy_alignment.operator_required).toBe(true);
  });

  it("should evaluate risk classes correctly", () => {
    const intent: AmbIntentArtifact = {
      intent_id: "int-03",
      run_id: "run-01",
      timestamp: new Date().toISOString(),
      version: "v0.1.0",
      source: "AMB",
      intent_type: "rl_fusion",
      priority_score: 0.9,
      risk_class: "low",
      policy_alignment: {
        forbidden_domain: false,
        operator_required: false,
        lineage_required: false,
        rl_dependent: false
      },
      justification: {
        summary: "Run fusion redesign pipeline",
        signals: {},
        references: []
      },
      constraints: { required_tests: [], required_challenge_runs: [], required_operator_actions: [] },
      target_domains: { rl_fusion: true },
      desired_outcomes: { description: "Optimize performance", metrics: {} }
    };

    const evaluated = interpreter.applyPolicy(intent);
    expect(evaluated.risk_class).toBe("high");
    expect(evaluated.policy_alignment.rl_dependent).toBe(true);
  });
});

describe("AMB MAS Health Gate", () => {
  it("should reject stable check when error rate is above threshold", () => {
    const snapshot: MasHealthSnapshot = {
      globalErrorRate: 0.08, // above 0.05 limit
      globalTimeoutRate: 0.02,
      queueBacklogDepth: 10,
      criticalAgentsHealth: 0.95
    };
    const gate = new AmbMasHealthGate(snapshot);
    const mockIntent = {} as AmbIntentArtifact;
    expect(gate.isMasStableFor(mockIntent)).toBe(false);
  });

  it("should approve stable check when all metrics are healthy", () => {
    const snapshot: MasHealthSnapshot = {
      globalErrorRate: 0.02,
      globalTimeoutRate: 0.02,
      queueBacklogDepth: 10,
      criticalAgentsHealth: 0.95
    };
    const gate = new AmbMasHealthGate(snapshot);
    const mockIntent = {} as AmbIntentArtifact;
    expect(gate.isMasStableFor(mockIntent)).toBe(true);
  });
});

describe("AMB RL Test Gate", () => {
  beforeEach(() => {
    delete process.env.BYPASS_RL_TESTS;
  });

  it("should return true when BYPASS_RL_TESTS is set", () => {
    process.env.BYPASS_RL_TESTS = "true";
    const gate = new AmbRlTestGate();
    expect(gate.isRlHealthy()).toBe(true);
  });
});

describe("AMB Governance Gate", () => {
  const mockMasGate = {
    isMasStableFor: () => true
  } as unknown as AmbMasHealthGate;

  const mockRlGate = {
    isRlHealthy: () => true
  } as unknown as AmbRlTestGate;

  const govGate = new AmbGovernanceGate(mockMasGate, mockRlGate);

  it("should block intents targeting forbidden domains", () => {
    const intent: AmbIntentArtifact = {
      intent_id: "int-forbidden",
      run_id: "run-01",
      timestamp: new Date().toISOString(),
      version: "v0.1.0",
      source: "AMB",
      intent_type: "tuning",
      priority_score: 0.5,
      risk_class: "low",
      policy_alignment: {
        forbidden_domain: true,
        operator_required: false,
        lineage_required: false,
        rl_dependent: false
      },
      justification: { summary: "Bypass security", signals: {}, references: [] },
      constraints: { required_tests: [], required_challenge_runs: [], required_operator_actions: [] },
      target_domains: {},
      desired_outcomes: { description: "Prune", metrics: {} }
    };

    const res = govGate.evaluateIntents([intent]);
    expect(res.approvedIntents.length).toBe(0);
    expect(res.report.rejectedCount).toBe(1);
    expect(res.report.rejections[0].reason).toContain("Forbidden domain");
  });

  it("should block RL dependent intents when RL is unhealthy", () => {
    const failingRlGate = {
      isRlHealthy: () => false
    } as unknown as AmbRlTestGate;
    const failingGovGate = new AmbGovernanceGate(mockMasGate, failingRlGate);

    const intent: AmbIntentArtifact = {
      intent_id: "int-rl-fail",
      run_id: "run-01",
      timestamp: new Date().toISOString(),
      version: "v0.1.0",
      source: "AMB",
      intent_type: "rl_fusion",
      priority_score: 0.5,
      risk_class: "high",
      policy_alignment: {
        forbidden_domain: false,
        operator_required: false,
        lineage_required: false,
        rl_dependent: true
      },
      justification: { summary: "Outreach redesign", signals: {}, references: [] },
      constraints: { required_tests: [], required_challenge_runs: [], required_operator_actions: [] },
      target_domains: { rl_fusion: true },
      desired_outcomes: { description: "Outreach", metrics: {} }
    };

    const res = failingGovGate.evaluateIntents([intent]);
    expect(res.approvedIntents.length).toBe(0);
    expect(res.report.rejections[0].reason).toContain("Rewrite Labs tests failing");
  });

  it("should downgrade intents when MAS is unstable", () => {
    const unstableMasGate = {
      isMasStableFor: () => false
    } as unknown as AmbMasHealthGate;
    const unstableGovGate = new AmbGovernanceGate(unstableMasGate, mockRlGate);

    const intent: AmbIntentArtifact = {
      intent_id: "int-mas-unstable",
      run_id: "run-01",
      timestamp: new Date().toISOString(),
      version: "v0.1.0",
      source: "AMB",
      intent_type: "mas_stability",
      priority_score: 0.5,
      risk_class: "medium",
      policy_alignment: {
        forbidden_domain: false,
        operator_required: false,
        lineage_required: false,
        rl_dependent: false
      },
      justification: { summary: "Tuning agent routes", signals: {}, references: [] },
      constraints: { required_tests: [], required_challenge_runs: [], required_operator_actions: [] },
      target_domains: { mas_topology: true },
      desired_outcomes: { description: "Prune", metrics: {} }
    };

    const res = unstableGovGate.evaluateIntents([intent]);
    expect(res.approvedIntents.length).toBe(0);
    expect(res.report.rejections[0].reason).toContain("MAS health below threshold");
  });

  it("should set high-risk intents to pending for operator review", () => {
    const intent: AmbIntentArtifact = {
      intent_id: "int-high-risk",
      run_id: "run-01",
      timestamp: new Date().toISOString(),
      version: "v0.1.0",
      source: "AMB",
      intent_type: "ckg_graph",
      priority_score: 0.5,
      risk_class: "high",
      policy_alignment: {
        forbidden_domain: false,
        operator_required: false,
        lineage_required: false,
        rl_dependent: false
      },
      justification: { summary: "CKG update", signals: {}, references: [] },
      constraints: { required_tests: [], required_challenge_runs: [], required_operator_actions: [] },
      target_domains: { ckg_graph: true },
      desired_outcomes: { description: "Prune", metrics: {} }
    };

    const res = govGate.evaluateIntents([intent]);
    expect(res.approvedIntents.length).toBe(0);
    expect(res.report.rejections[0].reason).toContain("High-risk intent; operator approval required");
  });
});
