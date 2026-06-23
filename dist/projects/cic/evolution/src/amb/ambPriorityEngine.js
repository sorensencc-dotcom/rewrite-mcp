"use strict";
// File: projects/cic/evolution/src/amb/ambPriorityEngine.ts | Date: 2026-06-05 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmbPriorityEngine = void 0;
class AmbPriorityEngine {
    computePriorities(signals) {
        const priorities = [];
        // 1. Planner Tuning priority based on system drift
        const driftIndex = signals.drift_metrics?.tenant_drift_index ?? 0.0;
        priorities.push({
            intent_type: "planner_tuning",
            priority_score: Math.min(1.0, parseFloat((driftIndex * 2.0).toFixed(2)))
        });
        // 2. Graph Distillation priority based on stale and redundant node ratios
        const staleRatio = signals.distillation_stats?.stale_node_ratio ?? 0.0;
        const redundantRatio = signals.distillation_stats?.redundant_node_ratio ?? 0.0;
        const distillationPriority = Math.min(1.0, staleRatio * 2.0 + redundantRatio * 1.5);
        priorities.push({
            intent_type: "graph_distillation",
            priority_score: parseFloat(distillationPriority.toFixed(2))
        });
        // 3. MAS Stability priority based on consensus rates & critiques
        const consensusRate = signals.mas_health?.agent_consensus_rate ?? 1.0;
        const critiqueCount = signals.mas_health?.critique_count ?? 0;
        const masInstability = (1.0 - consensusRate) + Math.min(0.5, critiqueCount * 0.1);
        priorities.push({
            intent_type: "mas_stability",
            priority_score: Math.min(1.0, parseFloat(Math.max(0.0, masInstability).toFixed(2)))
        });
        // 4. RL Fusion priority based on metrics signals
        const lighthouseDelta = signals.rl_metrics?.average_lighthouse_improvement ?? 0.0;
        const conversion = signals.rl_metrics?.conversion_rate ?? 0.0;
        const fusionPriority = Math.max(0.0, 1.0 - (lighthouseDelta / 100.0) + (conversion * 0.5));
        priorities.push({
            intent_type: "rl_fusion",
            priority_score: Math.min(1.0, parseFloat(fusionPriority.toFixed(2)))
        });
        return priorities.sort((a, b) => b.priority_score - a.priority_score);
    }
}
exports.AmbPriorityEngine = AmbPriorityEngine;
//# sourceMappingURL=ambPriorityEngine.js.map