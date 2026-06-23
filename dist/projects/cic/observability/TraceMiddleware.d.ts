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
export declare class TraceMiddleware {
    private traces;
    constructor();
    middleware(): (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Log trace span
     */
    private logTrace;
    /**
     * Retrieve all spans for a trace (for debugging)
     */
    getTrace(traceId: string): TraceContext[] | null;
}
export default TraceMiddleware;
//# sourceMappingURL=TraceMiddleware.d.ts.map