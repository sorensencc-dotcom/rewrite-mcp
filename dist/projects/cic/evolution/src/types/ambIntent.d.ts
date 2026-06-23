export interface AmbIntentArtifact {
    intent_id: string;
    run_id: string;
    timestamp: string;
    version: string;
    source: "AMB";
    intent_type: string;
    priority_score: number;
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
        references: string[];
    };
    constraints: {
        required_tests: string[];
        required_challenge_runs: ("baseline" | "distillation" | "fusion" | "full_stack")[];
        required_operator_actions: string[];
    };
    target_domains: {
        cic_config?: boolean;
        mas_topology?: boolean;
        ckg_graph?: boolean;
        rl_fusion?: boolean;
    };
    desired_outcomes: {
        description: string;
        metrics: Record<string, number>;
    };
    status?: "approved" | "blocked" | "downgraded" | "pending";
    blocked_reason?: string;
    governance_notes?: string;
}
//# sourceMappingURL=ambIntent.d.ts.map