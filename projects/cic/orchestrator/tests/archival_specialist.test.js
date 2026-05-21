// archival_specialist.test.js - v1.0.0
import test from "node:test";
import assert from "node:assert/strict";
import { archivalDeepScan } from "../src/agents/archivalSpecialist.js";

test("Archival Specialist agent prototype", async () => {
  const job = { 
    id: "test-archival-job",
    text: "Reviewing Ford Motor Company correspondence from 1941 regarding Willow Run construction." 
  };

  try {
    const result = await archivalDeepScan({ job });
    
    assert.equal(result.agent, "ARCHIVAL_SPECIALIST", "Result should be from ARCHIVAL_SPECIALIST");
    assert.ok(result.correlationId, "correlationId should be present");

    if (result.safe_mode) {
      console.warn(`[Test] Archival Specialist returned safe-mode result: ${result.reason}`);
    } else {
      assert.ok(result.findings, "findings should be present in a successful run");
      assert.ok(result.gaps, "gaps should be present in a successful run");
    }
  } catch (err) {
    if (err.message.includes("API_KEY") || err.message.includes("ENOTFOUND")) {
      console.warn("Skipping real LLM calls in test due to missing API key or network.");
    } else {
      throw err;
    }
  }
});
