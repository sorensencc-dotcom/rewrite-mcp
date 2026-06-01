// File: projects/cic/tests/runtime/slo.contract.test.ts | Date: 2026-05-30 | v1.3.4

import { describe, it, expect } from "vitest"
import { SLOEvaluator } from "../../src/slo/slo-evaluator.js"

describe("SLO Evaluator — Contract", () => {
  it("computes p95 correctly", () => {
    const ev = new SLOEvaluator()
    ev.registerWindow("ingest_latency")
    for (let i = 1; i <= 100; i++) ev.record("ingest_latency", i)

    const result = ev.evaluate({ name: "ingest_latency", p95: 95 })
    expect(result.value).toBe(95)
    expect(result.ok).toBe(true)
  })

  it("detects threshold violations", () => {
    const ev = new SLOEvaluator()
    ev.registerWindow("reason_latency")
    for (let i = 1; i <= 100; i++) ev.record("reason_latency", i * 10)

    const result = ev.evaluate({ name: "reason_latency", p95: 500 })
    expect(result.ok).toBe(false)
  })
})
