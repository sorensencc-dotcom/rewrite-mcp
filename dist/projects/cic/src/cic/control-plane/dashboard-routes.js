"use strict";
/**
 * dashboard-routes.ts
 * Phase 23.4 — Stability Dashboard ↔ Memory Integration Routes
 * Exposes timeline, trends, and summary cards populated from memory layer
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
exports.registerDashboardRoutes = registerDashboardRoutes;
const path = __importStar(require("path"));
const memory_substrate_1 = require("../../../memory/memory-substrate");
const memory_integration_1 = require("../../../memory/memory-integration");
const memory_dashboard_integration_1 = require("../../../memory/memory-dashboard-integration");
function registerDashboardRoutes(router) {
    const memoryLedgerPath = path.resolve(process.cwd(), ".artifacts/memory/ledger.jsonl");
    const substrate = new memory_substrate_1.MemorySubstrate({
        store_path: memoryLedgerPath
    });
    const memoryLayer = new memory_integration_1.MemoryIntegration(substrate);
    const dashboardIntegration = new memory_dashboard_integration_1.StabilityDashboardMemoryIntegration(memoryLayer);
    // GET /dashboard/timeline — Event timeline for dashboard
    router.get("/dashboard/timeline", async (req, res) => {
        try {
            const days = parseInt(req.query.days) || 7;
            const timeline = await dashboardIntegration.getEventTimeline(days);
            res.json({
                days,
                count: timeline.length,
                events: timeline
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // GET /dashboard/trends/:metric — Trend overlay (success_rate, error_rate, confidence)
    router.get("/dashboard/trends/:metric", async (req, res) => {
        try {
            const metric = req.params.metric;
            if (!["success_rate", "error_rate", "confidence"].includes(metric)) {
                return res.status(400).json({
                    error: `Invalid metric '${metric}'. Must be one of: success_rate, error_rate, confidence`
                });
            }
            const trend = await dashboardIntegration.getTrendOverlay(metric);
            res.json(trend);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // GET /dashboard/summary-cards — Summary cards for dashboard overview
    router.get("/dashboard/summary-cards", async (req, res) => {
        try {
            const cards = await dashboardIntegration.getSummaryCards();
            res.json({
                timestamp: new Date().toISOString(),
                cards
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // GET /dashboard/full — Complete dashboard data in one call
    router.get("/dashboard/full", async (req, res) => {
        try {
            const days = parseInt(req.query.days) || 7;
            const [timeline, successTrend, errorTrend, cards] = await Promise.all([
                dashboardIntegration.getEventTimeline(days),
                dashboardIntegration.getTrendOverlay("success_rate"),
                dashboardIntegration.getTrendOverlay("error_rate"),
                dashboardIntegration.getSummaryCards()
            ]);
            res.json({
                timestamp: new Date().toISOString(),
                days,
                timeline,
                trends: {
                    success_rate: successTrend,
                    error_rate: errorTrend
                },
                summaryCards: cards
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
}
//# sourceMappingURL=dashboard-routes.js.map