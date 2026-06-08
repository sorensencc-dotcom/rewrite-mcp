/**
 * memory-query-routes.ts
 * Phase 23.5 — Memory Query API
 * Exposes memory events, trends, and summaries via REST endpoints
 */

import { Router, Request, Response } from "express";
import * as path from "path";
import { MemorySubstrate, MemoryEvent } from "../../../memory/memory-substrate";
import { MemorySynthesizer } from "../../../memory/memory-synthesizer";

export function registerMemoryQueryRoutes(router: Router): void {
  const memoryLedgerPath = path.resolve(process.cwd(), ".artifacts/memory/ledger.jsonl");
  const substrate = new MemorySubstrate({
    store_path: memoryLedgerPath
  });
  const synthesizer = new MemorySynthesizer(substrate);

  // GET /memory/events — Query raw memory events
  // Query params: event_type, days, limit
  router.get("/memory/events", async (req: Request, res: Response) => {
    try {
      const eventType = req.query.event_type as string | undefined;
      const days = parseInt(req.query.days as string) || 7;
      const limit = parseInt(req.query.limit as string) || 100;

      const toDate = new Date().toISOString();
      const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const events = await substrate.query(
        eventType
          ? { event_type: eventType as any, from_date: fromDate, to_date: toDate, limit }
          : { from_date: fromDate, to_date: toDate, limit }
      );

      const filtered = events.slice(0, limit);

      res.json({
        count: filtered.length,
        timeWindow: { days, from: fromDate },
        events: filtered
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /memory/trends — Query synthesized trends
  // Returns: weekly/monthly trends with metrics and patterns
  router.get("/memory/trends", async (req: Request, res: Response) => {
    try {
      const period = (req.query.period as "weekly" | "monthly") || "weekly";

      let trends;
      if (period === "monthly") {
        trends = await synthesizer.synthesizeMonthly();
      } else {
        trends = await synthesizer.synthesizeWeekly();
      }

      res.json({
        period,
        timestamp: new Date().toISOString(),
        trends
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /memory/summaries — Get trend-based summaries and proposals
  router.get("/memory/summaries", async (req: Request, res: Response) => {
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
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /memory/search — Full-text search over events
  router.get("/memory/search", async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string) || "";
      if (!q.trim()) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const allEvents = await substrate.query({});
      const matchedEvents = allEvents.filter(e => {
        const searchStr = JSON.stringify(e).toLowerCase();
        return searchStr.includes(q.toLowerCase());
      });

      const limit = parseInt(req.query.limit as string) || 50;
      res.json({
        query: q,
        matches: matchedEvents.length,
        results: matchedEvents.slice(0, limit)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /memory/health — Memory layer health check
  router.get("/memory/health", async (req: Request, res: Response) => {
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
    } catch (err: any) {
      res.status(500).json({
        status: "unhealthy",
        error: err.message
      });
    }
  });
}
