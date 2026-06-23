export interface AmbSignals {
    drift_metrics?: {
        tenant_drift_index?: number;
    };
    distillation_stats?: {
        stale_node_ratio?: number;
        redundant_node_ratio?: number;
    };
    mas_health?: {
        agent_consensus_rate?: number;
        critique_count?: number;
    };
    rl_metrics?: {
        average_lighthouse_improvement?: number;
        conversion_rate?: number;
    };
}
export interface AmbPriorityResult {
    intent_type: string;
    priority_score: number;
}
export declare class AmbPriorityEngine {
    computePriorities(signals: AmbSignals): AmbPriorityResult[];
}
//# sourceMappingURL=ambPriorityEngine.d.ts.map