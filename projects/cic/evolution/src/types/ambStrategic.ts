// File: projects/cic/evolution/src/types/ambStrategic.ts | Date: 2026-06-05 | v1.0.0

// === Cross-Run Memory ===

export interface AmbMemorySnapshot {
  snapshot_id: string;
  timestamp: string;

  intents: AmbMemoryIntentRecord[];
  proposals: AmbMemoryProposalRecord[];
  mas_health_history: AmbMemoryMasRecord[];
  drift_history: AmbMemoryDriftRecord[];
  rl_impact_history: AmbMemoryRlRecord[];
}

export interface AmbMemoryIntentRecord {
  intent_id: string;
  run_id: string;
  intent_type: string;
  risk_class: "low" | "medium" | "high";
  status: "approved" | "blocked" | "downgraded" | "pending";
  strategic_score?: number;
  timestamp: string;
}

export interface AmbMemoryProposalRecord {
  proposal_id: string;
  run_id: string;
  source_intent_id?: string;
  applied: boolean;
  failed: boolean;
  impact_metrics?: Record<string, number>;
}

export interface AmbMemoryMasRecord {
  run_id: string;
  timestamp: string;
  globalErrorRate: number;
  globalTimeoutRate: number;
  queueBacklogDepth: number;
  criticalAgentsHealth: number;
}

export interface AmbMemoryDriftRecord {
  run_id: string;
  timestamp: string;
  tenant_drift_index?: number;
  graph_entropy?: number;
}

export interface AmbMemoryRlRecord {
  run_id: string;
  timestamp: string;
  tenant_id: string;
  site_id: string;
  metrics: Record<string, number>;
}

// === Intent Bundles ===

export type BundleType = "graph_cleanup" | "mas_stability" | "tenant_redesign" | "planner_tuning";

export interface IntentBundleArtifact {
  bundle_id: string;
  run_id: string;
  timestamp: string;
  bundle_type: BundleType;
  intent_ids: string[];
  summary: string;
  estimated_impact: Record<string, number>;
  aggregate_risk_class: "low" | "medium" | "high";
  aggregate_priority_score: number;
}

// === Strategic Plans ===

export interface PlannedIntent {
  step: number;                     // future run index (1, 2, 3...)
  intent_type: string;
  target_domains: Record<string, boolean>;
  justification: string;
  expected_metrics: Record<string, number>;
}

export interface StrategicPlanArtifact {
  plan_id: string;
  run_id: string;
  timestamp: string;
  version: string;
  horizon_runs: number;             // how many future runs planned
  planned_intents: PlannedIntent[];
  expected_impact: {
    drift_reduction: number;
    stability_gain: number;
    rl_value: number;
  };
  policy_constraints: string[];     // gates that apply to this plan
  source_bundles: string[];         // bundle_ids that informed this plan
}
