// File: projects/cic/evolution/src/types/ambIntent.ts | Date: 2026-06-05 | v1.0.0

export interface AmbIntentArtifact {
  intent_id: string;
  run_id: string;
  timestamp: string; // ISO 8601 UTC
  version: string;   // e.g. "v0.1.0"
  source: "AMB";
  intent_type: string; // e.g. "graph_distillation", "mas_stability", "rl_fusion", "planner_tuning"

  priority_score: number; // normalized 0–1
  risk_class: "low" | "medium" | "high";

  policy_alignment: {
    forbidden_domain: boolean;
    operator_required: boolean;
    lineage_required: boolean;
    rl_dependent: boolean;
  };

  justification: {
    summary: string;
    signals: {
      drift_metrics?: Record<string, number>;
      mas_health?: Record<string, number>;
      distillation_stats?: Record<string, number>;
      rl_metrics?: Record<string, number>;
    };
    references: string[]; // run_ids, tenant_ids, site_ids, etc.
  };

  constraints: {
    required_tests: string[]; // e.g. ["npm test", "npm run test:rewrite-labs"]
    required_challenge_runs: ("baseline" | "distillation" | "fusion" | "full_stack")[];
    required_operator_actions: string[]; // e.g. ["review_decisions_json", "approve_high_risk_changes"];
  };

  target_domains: {
    cic_config?: boolean;
    mas_topology?: boolean;
    ckg_graph?: boolean;
    rl_fusion?: boolean;
  };

  desired_outcomes: {
    description: string;
    metrics: Record<string, number>; // target values, e.g. {"graph_entropy_reduction": 0.12}
  };
}
