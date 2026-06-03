// File: projects/cic/src/cic/control-plane/memory-routes.ts | Date: 2026-06-03 | v1.0.0

import { MemorySubstrate } from "../../memory/memory-substrate.js";
import { MemorySynthesizer } from "../../memory/memory-synthesizer.js";
import path from "node:path";

export function registerMemoryRoutes(router: any) {
  const memoryLedgerPath = path.resolve(process.cwd(), "projects/cic/data/memory-ledger.jsonl");
  const substrate = new MemorySubstrate(memoryLedgerPath);
  const synth = new MemorySynthesizer(substrate);

  router.get("/memory/events", (req: any, res: any) => {
    try {
      const type = req.query.type;
      const events = substrate.query(type ? { type } : {});
      res.json(events);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/memory/trends", (_req: any, res: any) => {
    try {
      res.json(synth.detectTrends());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/memory/summarize", async (_req: any, res: any) => {
    try {
      await synth.run();
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
