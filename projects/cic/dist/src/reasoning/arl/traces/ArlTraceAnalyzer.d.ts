/**
 * projects/cic/src/reasoning/arl/traces/ArlTraceAnalyzer.ts
 * High-level analysis utilities for ARL trace data.
 */
import { ArlTraceRecord } from './ArlTraceStore.js';
import { ArlVerdictType } from '../contracts/ReasoningVerdict.js';
export declare class ArlTraceAnalyzer {
    /**
     * Get recent verdicts with optional filtering.
     */
    static getRecent(limit?: number, minCoherence?: number, verdict?: ArlVerdictType): ArlTraceRecord[];
    /**
     * Get verdict success rate over time window (ms).
     */
    static getVerdictSuccessRate(windowMs?: number): number;
    /**
     * Get coherence trend analysis.
     */
    static getCoherenceTrend(intervalMs?: number): {
        timestamps: number[];
        averages: number[];
    };
    /**
     * Identify problematic candidates (low coherence, high drift).
     */
    static getProblematicCandidates(minCount?: number): {
        type: string;
        count: number;
        avgCoherence: number;
        avgDrift: number;
    }[];
    /**
     * Get rejection analysis: why are verdicts being rejected?
     */
    static getRejectionAnalysis(): {
        totalRejections: number;
        byReason: Record<string, number>;
    };
    /**
     * Compare two time periods for verdict distribution changes.
     */
    static comparePeriods(period1Ms?: number, period2Ms?: number): {
        period1: {
            window: string;
            distribution: Record<string, number>;
        };
        period2: {
            window: string;
            distribution: Record<string, number>;
        };
    };
    /**
     * Check system health: are verdicts becoming more or less coherent?
     */
    static getSystemHealth(): {
        coherenceHealth: 'good' | 'fair' | 'poor';
        driftHealth: 'good' | 'fair' | 'poor';
        overallHealth: 'good' | 'fair' | 'poor';
        metrics: {
            avgCoherence: number;
            avgDrift: number;
            successRate: number;
        };
    };
}
