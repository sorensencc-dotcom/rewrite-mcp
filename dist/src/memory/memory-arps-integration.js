"use strict";
/**
 * Phase 23.4 — Memory-Aware ARPS Integration
 * Wire memory summaries into ARPS (Autonomous Roadmap & Prompt Synthesizer)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARPSMemoryIntegration = void 0;
class ARPSMemoryIntegration {
    constructor(memory) {
        this.memory = memory;
    }
    /**
     * ARPS calls this before generating next prompt/roadmap
     * Returns memory context to inform roadmap synthesis
     */
    async getMemoryContextForPromptGeneration() {
        const synthesizer = this.memory.getSynthesizer();
        const monthSummary = await synthesizer.synthesizeMonthly();
        // Extract actionable failure patterns
        const recentFailures = this.extractFailurePatterns(monthSummary);
        // Identify success patterns
        const successPatterns = this.extractSuccessPatterns(monthSummary);
        // Map ARPS proposals to roadmap phases
        const proposalsForRoadmap = monthSummary.proposals_for_arps.map(p => ({
            title: p.title,
            rationale: p.rationale,
            estimatedEffort: p.estimated_effort_hours,
            phase: this.suggestPhaseNumber(p.type)
        }));
        return {
            monthSummary,
            recentFailures,
            successPatterns,
            driftIndicators: monthSummary.long_horizon_analysis.drift_indicators,
            proposalsForRoadmap
        };
    }
    /**
     * ARPS uses this to bias roadmap updates toward stable patterns
     */
    async getTrendAnalysis() {
        const synthesizer = this.memory.getSynthesizer();
        const weekly = await synthesizer.synthesizeWeekly();
        const mapping = {
            improving: 0.9,
            degrading: 0.6,
            stable: 0.75
        };
        return {
            direction: weekly.trends.direction,
            confidence: mapping[weekly.trends.direction],
            recommendation: this.getTrendRecommendation(weekly.trends.direction)
        };
    }
    extractFailurePatterns(summary) {
        const failures = [];
        // Look for platforms with high failure rates
        const platformCoverage = summary.aggregate_metrics.platform_coverage || [];
        for (const platform of platformCoverage) {
            // Infer error rate from proposals
            const hasErrorProposal = summary.proposals_for_arps.some(p => p.title.toLowerCase().includes(platform) && p.title.toLowerCase().includes("reliabil"));
            if (hasErrorProposal) {
                failures.push({
                    platform,
                    errorRate: 0.15, // Conservative estimate
                    recommendation: `Review ${platform} extraction configuration and error handling`
                });
            }
        }
        return failures;
    }
    extractSuccessPatterns(summary) {
        const patterns = [];
        // High success rate indicates stable pattern
        if (summary.aggregate_metrics.avg_success_rate > 0.9) {
            patterns.push({
                pattern: "Stable extraction success across platforms",
                frequency: summary.aggregate_metrics.total_extractions,
                confidence: summary.aggregate_metrics.avg_success_rate
            });
        }
        // Sorensen harvests show consistent relevance scoring
        if (summary.sorensen_narratives && summary.sorensen_narratives.total_harvests > 0) {
            patterns.push({
                pattern: "Consistent Sorensen documentary relevance scoring",
                frequency: summary.sorensen_narratives.total_harvests,
                confidence: 0.85
            });
        }
        return patterns;
    }
    suggestPhaseNumber(proposalType) {
        const mapping = {
            "capability_improvement": "23.4.1",
            "capability_expansion": "23.4.2",
            "system_optimization": "23.4.3",
            "documentary_expansion": "23.5.1",
            "monitoring": undefined
        };
        return mapping[proposalType];
    }
    getTrendRecommendation(direction) {
        const recommendations = {
            improving: "Continue current strategy; momentum is positive",
            degrading: "Investigate root causes; consider stabilization efforts",
            stable: "Maintain current course; monitor for drift"
        };
        return recommendations[direction];
    }
}
exports.ARPSMemoryIntegration = ARPSMemoryIntegration;
//# sourceMappingURL=memory-arps-integration.js.map