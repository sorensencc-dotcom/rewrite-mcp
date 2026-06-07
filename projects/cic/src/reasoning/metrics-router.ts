// File: projects/cic/src/reasoning/metrics-router.ts | Date: 2026-05-30 | v1.3.3
/**
 * MetricsRouter exposes `/metrics/snapshot` and SSE `/metrics/stream` control-plane routes.
 */

import express, { Request, Response } from "express";
import { metricsCollector } from "./metrics-collector.js";

export const metricsRouter = express.Router();

// GET /metrics/snapshot - Returns active telemetry snapshot
metricsRouter.get("/snapshot", (req: Request, res: Response) => {
  try {
    const snapshot = metricsCollector.getSnapshot();
    res.json(snapshot);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /metrics/stream - Server-Sent Events (SSE) real-time streaming endpoint
metricsRouter.get("/stream", (req: Request, res: Response) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); // Establish connection instantly

    // Emit initial snapshot
    res.write(`data: ${JSON.stringify(metricsCollector.getSnapshot())}\n\n`);

    // Poll and stream updates every 2 seconds
    const interval = setInterval(() => {
      res.write(`data: ${JSON.stringify(metricsCollector.getSnapshot())}\n\n`);
    }, 2000);

    req.on("close", () => {
      clearInterval(interval);
      res.end();
    });
  } catch (err: any) {
    res.status(500).end();
  }
});

// POST /metrics/reset - Resets active telemetry aggregators
metricsRouter.post("/reset", (req: Request, res: Response) => {
  try {
    metricsCollector.reset();
    res.json({ ok: true, message: "Telemetry aggregates cleared." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
