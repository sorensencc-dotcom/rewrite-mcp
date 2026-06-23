"use strict";
// File: projects/cic/src/cic/control-plane/memory-routes.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMemoryRoutes = registerMemoryRoutes;
const memory_substrate_js_1 = require("../../memory/memory-substrate.js");
const memory_synthesizer_js_1 = require("../../memory/memory-synthesizer.js");
const node_path_1 = __importDefault(require("node:path"));
function registerMemoryRoutes(router) {
    const memoryLedgerPath = node_path_1.default.resolve(process.cwd(), "projects/cic/data/memory-ledger.jsonl");
    const substrate = new memory_substrate_js_1.MemorySubstrate(memoryLedgerPath);
    const synth = new memory_synthesizer_js_1.MemorySynthesizer(substrate);
    router.get("/memory/events", (req, res) => {
        try {
            const type = req.query.type;
            const events = substrate.query(type ? { type } : {});
            res.json(events);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    router.get("/memory/trends", (_req, res) => {
        try {
            res.json(synth.detectTrends());
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    router.post("/memory/summarize", async (_req, res) => {
        try {
            await synth.run();
            res.json({ ok: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
}
//# sourceMappingURL=memory-routes.js.map