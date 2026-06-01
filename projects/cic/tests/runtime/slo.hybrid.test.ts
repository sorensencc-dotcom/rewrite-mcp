// File: projects/cic/tests/runtime/slo.hybrid.test.ts | Date: 2026-05-30 | v1.3.4

import { describe, it, expect } from "vitest"
import { LoadCampaignRunner } from "../../src/slo/load-campaign-runner.js"

describe("SLO Hybrid — Load Campaign", () => {
  it("runs a controlled ingestion load", async () => {
    const ingested: any[] = []
    const runner = new LoadCampaignRunner(async doc => { ingested.push(doc) })

    const docs = Array.from({ length: 500 }, (_, i) => ({ id: i }))
    const result = await runner.run(docs, 50, 1000)

    expect(result.ingested).toBeGreaterThan(40)
    expect(result.ingested).toBeLessThanOrEqual(60)
  })
})
