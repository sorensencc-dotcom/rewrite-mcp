"use strict";
// File: projects/cic/tests/runtime/slo.contract.test.ts | Date: 2026-05-30 | v1.3.4
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const slo_evaluator_js_1 = require("../../src/slo/slo-evaluator.js");
(0, vitest_1.describe)("SLO Evaluator — Contract", () => {
    (0, vitest_1.it)("computes p95 correctly", () => {
        const ev = new slo_evaluator_js_1.SLOEvaluator();
        ev.registerWindow("ingest_latency");
        for (let i = 1; i <= 100; i++)
            ev.record("ingest_latency", i);
        const result = ev.evaluate({ name: "ingest_latency", p95: 95 });
        (0, vitest_1.expect)(result.value).toBe(95);
        (0, vitest_1.expect)(result.ok).toBe(true);
    });
    (0, vitest_1.it)("detects threshold violations", () => {
        const ev = new slo_evaluator_js_1.SLOEvaluator();
        ev.registerWindow("reason_latency");
        for (let i = 1; i <= 100; i++)
            ev.record("reason_latency", i * 10);
        const result = ev.evaluate({ name: "reason_latency", p95: 500 });
        (0, vitest_1.expect)(result.ok).toBe(false);
    });
});
//# sourceMappingURL=slo.contract.test.js.map