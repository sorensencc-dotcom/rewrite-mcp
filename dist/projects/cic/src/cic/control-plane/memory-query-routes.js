"use strict";
/**
 * memory-query-routes.ts
 * Phase 23.5 — Memory Query API
 * Exposes memory events, trends, and summaries via REST endpoints
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMemoryQueryRoutes = registerMemoryQueryRoutes;
const path = __importStar(require("path"));
const memory_substrate_1 = require("../../../memory/memory-substrate");
const memory_synthesizer_1 = require("../../../memory/memory-synthesizer");
function registerMemoryQueryRoutes(router) {
    const memoryLedgerPath = path.resolve(process.cwd(), ".artifacts/memory/ledger.jsonl");
    const substrate = new memory_substrate_1.MemorySubstrate({
        store_path: memoryLedgerPath
    });
    const synthesizer = new memory_synthesizer_1.MemorySynthesizer(substrate);
    // GET /memory/events — Query raw memory events
    // Query params: event_type, days, limit
    router.get("/memory/events", async (req, res) => {
        try {
            const eventType = req.query.event_type;
            const days = parseInt(req.query.days) || 7;
            const limit = parseInt(req.query.limit) || 100;
            const toDate = new Date().toISOString();
            const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
            const events = await substrate.query(eventType
                ? { event_type: eventType, from_date: fromDate, to_date: toDate, limit }
                : { from_date: fromDate, to_date: toDate, limit });
            const filtered = events.slice(0, limit);
            res.json({
                count: filtered.length,
                timeWindow: { days, from: fromDate },
                events: filtered
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // GET /memory/trends — Query synthesized trends
    // Returns: weekly/monthly trends with metrics and patterns
    router.get("/memory/trends", async (req, res) => {
        try {
            const period = req.query.period || "weekly";
            let trends;
            if (period === "monthly") {
                trends = await synthesizer.synthesizeMonthly();
            }
            else {
                trends = await synthesizer.synthesizeWeekly();
            }
            res.json({
                period,
                timestamp: new Date().toISOString(),
                trends
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // GET /memory/summaries — Get trend-based summaries and proposals
    router.get("/memory/summaries", async (req, res) => {
        try {
            const weekly = await synthesizer.synthesizeWeekly();
            const monthly = await synthesizer.synthesizeMonthly();
            res.json({
                timestamp: new Date().toISOString(),
                weekly: {
                    summary: weekly.summary,
                    key_metrics: weekly.key_metrics,
                    trends: weekly.trends
                },
                monthly: {
                    summary: monthly.summary,
                    key_metrics: monthly.key_metrics,
                    trends: monthly.trends
                },
                proposals: monthly.proposals_for_arps || []
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // GET /memory/search — Full-text search over events
    router.get("/memory/search", async (req, res) => {
        try {
            const q = req.query.q || "";
            if (!q.trim()) {
                return res.status(400).json({ error: "Query parameter 'q' is required" });
            }
            const allEvents = await substrate.query({});
            const matchedEvents = allEvents.filter(e => {
                const searchStr = JSON.stringify(e).toLowerCase();
                return searchStr.includes(q.toLowerCase());
            });
            const limit = parseInt(req.query.limit) || 50;
            res.json({
                query: q,
                matches: matchedEvents.length,
                results: matchedEvents.slice(0, limit)
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // GET /memory/health — Memory layer health check
    router.get("/memory/health", async (req, res) => {
        try {
            const allEvents = await substrate.query({});
            const recentEvents = allEvents.slice(-100);
            const eventTypes = new Set(recentEvents.map(e => e.event_type));
            res.json({
                status: "healthy",
                timestamp: new Date().toISOString(),
                ledgerPath: memoryLedgerPath,
                eventCount: allEvents.length,
                recentEventTypes: Array.from(eventTypes),
                lastEvent: recentEvents.length > 0 ? recentEvents[recentEvents.length - 1].timestamp : null
            });
        }
        catch (err) {
            res.status(500).json({
                status: "unhealthy",
                error: err.message
            });
        }
    });
}
//# sourceMappingURL=memory-query-routes.js.map