/**
 * Phase 23.4 — Memory-Aware Stability Dashboard Integration
 * Wire memory events into Stability Dashboard for visualization
 */
import { MemoryLayer } from "./memory-integration";
export interface DashboardMemoryMetrics {
    eventTimeline: Array<{
        timestamp: string;
        eventType: string;
        description: string;
        platform?: string;
        status: "success" | "failure" | "warning";
    }>;
    trendOverlay: {
        metric: string;
        values: Array<{
            timestamp: string;
            value: number;
        }>;
        threshold: number;
        status: "healthy" | "warning" | "critical";
    };
    summaryCards: Array<{
        title: string;
        value: string | number;
        trend: "up" | "down" | "stable";
        icon: string;
    }>;
}
export declare class StabilityDashboardMemoryIntegration {
    private memory;
    constructor(memory: MemoryLayer);
    /**
     * Dashboard calls this to populate timeline view with memory events
     */
    getEventTimeline(days?: number): Promise<Array<{
        timestamp: string;
        eventType: string;
        description: string;
        platform?: string;
        status: "success" | "failure" | "warning";
    }>>;
    /**
     * Dashboard calls this to show trend overlays (success rate, error rate, etc.)
     */
    getTrendOverlay(metric: "success_rate" | "error_rate" | "confidence"): Promise<{
        metric: string;
        values: Array<{
            timestamp: string;
            value: number;
        }>;
        threshold: number;
        status: "healthy" | "warning" | "critical";
    }>;
    /**
     * Dashboard calls this for summary cards (quick stats)
     */
    getSummaryCards(): Promise<Array<{
        title: string;
        value: string | number;
        trend: "up" | "down" | "stable";
        icon: string;
    }>>;
    private computeRollingMetric;
}
//# sourceMappingURL=memory-dashboard-integration.d.ts.map