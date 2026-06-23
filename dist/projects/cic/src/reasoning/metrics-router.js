"use strict";
// File: projects/cic/src/reasoning/metrics-router.ts | Date: 2026-05-30 | v1.3.3
/**
 * MetricsRouter exposes `/metrics/snapshot` and SSE `/metrics/stream` control-plane routes.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsRouter = void 0;
const express_1 = __importDefault(require("express"));
const metrics_collector_js_1 = require("./metrics-collector.js");
exports.metricsRouter = express_1.default.Router();
// GET /metrics/snapshot - Returns active telemetry snapshot
exports.metricsRouter.get("/snapshot", (req, res) => {
    try {
        const snapshot = metrics_collector_js_1.metricsCollector.getSnapshot();
        res.json(snapshot);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /metrics/stream - Server-Sent Events (SSE) real-time streaming endpoint
exports.metricsRouter.get("/stream", (req, res) => {
    try {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders(); // Establish connection instantly
        // Emit initial snapshot
        res.write(`data: ${JSON.stringify(metrics_collector_js_1.metricsCollector.getSnapshot())}\n\n`);
        // Poll and stream updates every 2 seconds
        const interval = setInterval(() => {
            res.write(`data: ${JSON.stringify(metrics_collector_js_1.metricsCollector.getSnapshot())}\n\n`);
        }, 2000);
        req.on("close", () => {
            clearInterval(interval);
            res.end();
        });
    }
    catch (err) {
        res.status(500).end();
    }
});
// POST /metrics/reset - Resets active telemetry aggregators
exports.metricsRouter.post("/reset", (req, res) => {
    try {
        metrics_collector_js_1.metricsCollector.reset();
        res.json({ ok: true, message: "Telemetry aggregates cleared." });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
//# sourceMappingURL=metrics-router.js.map