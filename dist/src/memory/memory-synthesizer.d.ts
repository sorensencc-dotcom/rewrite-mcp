/**
 * Phase 23.3 — Memory Synthesizer Agent
 * Generates weekly summaries, monthly evolution reports, drift detection, and trend analysis
 */
import { MemorySubstrate } from "./memory-substrate";
export interface WeeklySummary {
    period: "weekly";
    week_start: string;
    week_end: string;
    event_count: number;
    event_count_by_type: Record<string, number>;
    key_metrics: {
        total_items_extracted?: number;
        total_duration_hours?: number;
        success_rate?: number;
        avg_confidence?: number;
        platforms_queried?: string[];
        error_rate?: number;
    };
    sorensen_specific?: {
        harvests_executed: number;
        total_sorensen_items: number;
        avg_relevance_score: number;
        keywords_matched: string[];
    };
    trends: {
        direction: "improving" | "degrading" | "stable";
        status: string;
        notes: string;
    };
    recommendations: string[];
}
export interface MonthlySummary {
    period: "monthly";
    month: string;
    weekly_count: number;
    aggregate_metrics: {
        total_extractions: number;
        total_items_extracted: number;
        avg_success_rate: number;
        platform_coverage: string[];
        most_active_platform: string;
    };
    sorensen_narratives?: {
        total_harvests: number;
        total_sorensen_items: number;
        top_keywords: Array<{
            keyword: string;
            count: number;
        }>;
        emerging_patterns: string[];
        narrative_arc: string;
    };
    long_horizon_analysis: {
        trend_30_day: string;
        capability_evolution: string;
        drift_indicators: string[];
    };
    proposals_for_arps: Array<{
        type: string;
        title: string;
        rationale: string;
        estimated_effort_hours: number;
        priority: "low" | "medium" | "high";
    }>;
}
export declare class MemorySynthesizer {
    private substrate;
    constructor(substrate: MemorySubstrate);
    /**
     * Generate weekly summary from past 7 days of events
     */
    synthesizeWeekly(): Promise<WeeklySummary>;
    /**
     * Generate monthly summary from aggregated weekly data
     */
    synthesizeMonthly(): Promise<MonthlySummary>;
    private analyzeKeyMetrics;
    private analyzeSorensenActivity;
    private detectTrend;
    private generateRecommendations;
    private calculateSuccessRate;
    private findMostActivePlatform;
    private analyzeSorensenNarratives;
    private detectEmergingPatterns;
    private generateNarrativeArc;
    private analyzeLongHorizon;
    private generateARPSProposals;
}
//# sourceMappingURL=memory-synthesizer.d.ts.map