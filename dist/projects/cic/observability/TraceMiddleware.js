"use strict";
/**
 * CIC Trace Middleware
 * Implements distributed tracing for context service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraceMiddleware = void 0;
/**
 * TraceMiddleware logs request/response spans
 */
class TraceMiddleware {
    constructor() {
        this.traces = new Map();
    }
    middleware() {
        return (req, res, next) => {
            const traceId = req.traceId;
            const spanId = req.spanId;
            const parentSpanId = req.parentSpanId;
            const traceContext = {
                traceId,
                spanId,
                parentSpanId,
                startTime: Date.now(),
            };
            // Store trace context
            if (!this.traces.has(traceId)) {
                this.traces.set(traceId, []);
            }
            this.traces.get(traceId).push(traceContext);
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
    logTrace(traceId, req, res, context) {
        const duration = context.endTime ? context.endTime - context.startTime : -1;
        console.log(JSON.stringify({
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
        }));
    }
    /**
     * Retrieve all spans for a trace (for debugging)
     */
    getTrace(traceId) {
        return this.traces.get(traceId) || null;
    }
}
exports.TraceMiddleware = TraceMiddleware;
exports.default = TraceMiddleware;
//# sourceMappingURL=TraceMiddleware.js.map