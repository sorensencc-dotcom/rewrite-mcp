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
export class MetricsMiddleware {
  private metrics: Metrics;

  constructor() {
    this.metrics = {
      request_duration_ms: [],
      errors_total: {},
      cache_hits: 0,
      timestamp: new Date().toISOString(),
    };
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();

      res.on("finish", () => {
        const duration = Date.now() - startTime;
        this.metrics.request_duration_ms.push(duration);

        if (res.statusCode >= 400) {
          const errorCode = this.getErrorCode(res.statusCode);
          this.metrics.errors_total[errorCode] =
            (this.metrics.errors_total[errorCode] || 0) + 1;
        }

        // Trim old metrics (keep last 1000 requests)
        if (this.metrics.request_duration_ms.length > 1000) {
          this.metrics.request_duration_ms.shift();
        }
      });

      next();
    };
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.metrics.cache_hits++;
  }

  /**
   * Get current metrics
   */
  getMetrics(): Metrics {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
    };
  }

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
  } {
    const durations = this.metrics.request_duration_ms;
    const totalErrors = Object.values(this.metrics.errors_total).reduce(
      (a, b) => a + b,
      0
    );
    const totalRequests = durations.length + totalErrors;

    const sorted = [...durations].sort((a, b) => a - b);
    const avg =
      sorted.length > 0
        ? sorted.reduce((a, b) => a + b, 0) / sorted.length
        : 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

    return {
      avg_duration_ms: Math.round(avg),
      p95_duration_ms: p95,
      p99_duration_ms: p99,
      error_rate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      total_requests: totalRequests,
      total_errors: totalErrors,
      cache_hit_rate:
        totalRequests > 0 ? this.metrics.cache_hits / totalRequests : 0,
    };
  }

  /**
   * Get error code from status
   */
  private getErrorCode(status: number): string {
    if (status === 400) return "bad_request";
    if (status === 404) return "not_found";
    if (status === 412) return "version_mismatch";
    if (status === 503) return "backend_unavailable";
    if (status === 504) return "timeout";
    return "server_error";
  }
}

export default MetricsMiddleware;
