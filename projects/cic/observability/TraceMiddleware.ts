/**
 * CIC Trace Middleware
 * Implements distributed tracing for context service
 */

import { Request, Response, NextFunction } from "express";

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  endTime?: number;
}

/**
 * TraceMiddleware logs request/response spans
 */
export class TraceMiddleware {
  private traces: Map<string, TraceContext[]>;

  constructor() {
    this.traces = new Map();
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const traceId = (req as any).traceId;
      const spanId = (req as any).spanId;
      const parentSpanId = (req as any).parentSpanId;

      const traceContext: TraceContext = {
        traceId,
        spanId,
        parentSpanId,
        startTime: Date.now(),
      };

      // Store trace context
      if (!this.traces.has(traceId)) {
        this.traces.set(traceId, []);
      }
      this.traces.get(traceId)!.push(traceContext);

      // Hook response finish
      res.on("finish", () => {
        traceContext.endTime = Date.now();
        this.logTrace(traceId, req, res, traceContext);
      });

      next();
    };
  }

  /**
   * Log trace span
   */
  private logTrace(
    traceId: string,
    req: Request,
    res: Response,
    context: TraceContext
  ): void {
    const duration = context.endTime ? context.endTime - context.startTime : -1;

    console.log(
      JSON.stringify({
        level: "info",
        message: "request_trace",
        trace_id: traceId,
        span_id: context.spanId,
        parent_span_id: context.parentSpanId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      })
    );
  }

  /**
   * Retrieve all spans for a trace (for debugging)
   */
  getTrace(traceId: string): TraceContext[] | null {
    return this.traces.get(traceId) || null;
  }
}

export default TraceMiddleware;
