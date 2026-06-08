/**
 * dashboard-routes.ts
 * Phase 23.4 — Stability Dashboard ↔ Memory Integration Routes
 * Exposes timeline, trends, and summary cards populated from memory layer
 */

import { Router, Request, Response } from "express";
import * as path from "path";
import { MemorySubstrate } from "../../../memory/memory-substrate";
import { MemoryIntegration } from "../../../memory/memory-integration";
import { StabilityDashboardMemoryIntegration } from "../../../memory/memory-dashboard-integration";

export function registerDashboardRoutes(router: Router): void {
  const memoryLedgerPath = path.resolve(process.cwd(), ".artifacts/memory/ledger.jsonl");
  const substrate = new MemorySubstrate({
    store_path: memoryLedgerPath
  });
  const memoryLayer = new MemoryIntegration(substrate);
  const dashboardIntegration = new StabilityDashboardMemoryIntegration(memoryLayer);

  // GET /dashboard/timeline — Event timeline for dashboard
  router.get("/dashboard/timeline", async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const timeline = await dashboardIntegration.getEventTimeline(days);

      res.json({
        days,
        count: timeline.length,
        events: timeline
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /dashboard/trends/:metric — Trend overlay (success_rate, error_rate, confidence)
  router.get("/dashboard/trends/:metric", async (req: Request, res: Response) => {
    try {
      const metric = req.params.metric as "success_rate" | "error_rate" | "confidence";

      if (!["success_rate", "error_rate", "confidence"].includes(metric)) {
        return res.status(400).json({
          error: `Invalid metric '${metric}'. Must be one of: success_rate, error_rate, confidence`
        });
      }

      const trend = await dashboardIntegration.getTrendOverlay(metric);

      res.json(trend);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /dashboard/summary-cards — Summary cards for dashboard overview
  router.get("/dashboard/summary-cards", async (req: Request, res: Response) => {
    try {
      const cards = await dashboardIntegration.getSummaryCards();

      res.json({
        timestamp: new Date().toISOString(),
        cards
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /dashboard/full — Complete dashboard data in one call
  router.get("/dashboard/full", async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;

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
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
