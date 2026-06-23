import { MemoryStore } from './MemoryStore';
/**
 * MemorySynthesizer: Weekly/monthly summaries and trend detection.
 *
 * Contract:
 * - Reads raw events from MemoryStore
 * - Generates weekly summaries (7-day windows)
 * - Generates monthly evolution reports (30-day windows)
 * - Detects trends (improving/degrading/stable)
 * - Produces human-readable insights
 * - Appends summaries to memory_summaries.json
 */
export interface TrendLine {
    metric: string;
    baseline: number;
    current: number;
    delta: number;
    percent_change: number;
    direction: 'improving' | 'degrading' | 'stable';
}
export interface EventTypeStats {
    event_type: string;
    count: number;
    percent_of_total: number;
    first_timestamp: string;
    last_timestamp: string;
}
export interface WeeklySummary {
    id: string;
    period: 'weekly';
    start_date: string;
    end_date: string;
    generated_at: string;
    event_count: number;
    event_counts_by_type: Record<string, number>;
    key_deltas: string[];
    trend: 'improving' | 'degrading' | 'stable';
    trend_lines: TrendLine[];
    observations: string[];
    recommendations: string[];
}
export interface MonthlySummary {
    id: string;
    period: 'monthly';
    start_date: string;
    end_date: string;
    generated_at: string;
    event_count: number;
    event_counts_by_type: Record<string, number>;
    total_weeks: number;
    weekly_trend_composite: 'improving' | 'degrading' | 'stable';
    trend_lines: TrendLine[];
    pattern_analysis: string[];
    risk_signals: string[];
    capability_growth: string[];
    observations: string[];
}
export declare class MemorySynthesizer {
    private store;
    private summaries;
    constructor(store: MemoryStore);
    /**
     * Generate weekly summary from last 7 days of events
     */
    generateWeeklySummary(): Promise<WeeklySummary>;
    /**
     * Generate monthly evolution report from last 30 days
     */
    generateMonthlySummary(): Promise<MonthlySummary>;
    /**
     * Get all summaries (weekly and monthly)
     */
    getAllSummaries(): Promise<(WeeklySummary | MonthlySummary)[]>;
    /**
     * Get recent weekly summaries
     */
    getRecentWeeklySummaries(count?: number): Promise<WeeklySummary[]>;
    /**
     * Get recent monthly summaries
     */
    getRecentMonthlySummaries(count?: number): Promise<MonthlySummary[]>;
    private countEventsByType;
    private extractKeyDeltas;
    private analyzeTrend;
    private calculateTrendLines;
    private generateObservations;
    private generateRecommendations;
    private analyzePatterns;
    private detectRiskSignals;
    private detectCapabilityGrowth;
    private generateMonthlyObservations;
}
export declare function getMemorySynthesizer(store: MemoryStore): Promise<MemorySynthesizer>;
export declare function resetMemorySynthesizer(): void;
//# sourceMappingURL=MemorySynthesizer.d.ts.map