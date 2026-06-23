/**
 * CIC Metrics Middleware
 * Tracks HTTP metrics for context service
 */
import { Request, Response, NextFunction } from "express";
export interface Metrics {
    request_duration_ms: number[];
    errors_total: Record<string, number>;
    cache_hits: number;
    timestamp: string;
}
/**
 * MetricsMiddleware tracks HTTP metrics
 */
export declare class MetricsMiddleware {
    private metrics;
    constructor();
    middleware(): (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Record cache hit
     */
    recordCacheHit(): void;
    /**
     * Get current metrics
     */
    getMetrics(): Metrics;
    /**
     * Get metrics summary
     */
    getSummary(): {
        avg_duration_ms: number;
        p95_duration_ms: number;
        p99_duration_ms: number;
        error_rate: number;
        total_requests: number;
        total_errors: number;
        cache_hit_rate: number;
    };
    /**
     * Get error code from status
     */
    private getErrorCode;
}
export default MetricsMiddleware;
//# sourceMappingURL=MetricsMiddleware.d.ts.map