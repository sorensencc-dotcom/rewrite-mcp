import { describe, it, expect, beforeEach } from "vitest";
import {
  computeContextEfficiencyScore,
  evaluateHeadroomHealth,
  shouldBypassHeadroomForRun,
  getHeadroomAutotuneState
} from "../src/lib/headroomAutotune.js";
import {
  recordCompression,
  recordMCPLatency,
  recordBypass,
  recordAuthFailure
} from "../src/lib/headroomTelemetry.js";

describe("Headroom Auto-Tuning Subsystem", () => {
  beforeEach(() => {
    process.env.HEADROOM_AUTOTUNE_ENABLED = "true";
    process.env.HEADROOM_BYPASS_THRESHOLD = "10";
    process.env.HEADROOM_AUTH_FAILURE_THRESHOLD = "5";
    process.env.HEADROOM_SCORE_WEIGHT_COMPRESSION = "0.6";
    process.env.HEADROOM_SCORE_WEIGHT_LATENCY = "0.4";
  });

  it("should compute context efficiency score based on telemetry metrics", () => {
    // Record some mock data
    recordCompression(100, 40); // 0.4 ratio
    recordMCPLatency(150); // 150ms

    const res = computeContextEfficiencyScore();
    expect(res.score).toBeGreaterThan(0);
    expect(res.score).toBeLessThanOrEqual(1);
    expect(res.avgCompression).toBeCloseTo(0.4);
    expect(res.avgLatency).toBeCloseTo(150);
  });

  it("should evaluate headroom health and degrade when exceeding bypass threshold", () => {
    // Make sure we clear or increment beyond limit
    const beforeHealth = evaluateHeadroomHealth();
    
    // Increment bypasses to exceed threshold (10)
    for (let i = 0; i < 12; i++) {
      recordBypass();
    }

    const health = evaluateHeadroomHealth();
    expect(health.degraded).toBe(true);
    expect(shouldBypassHeadroomForRun()).toBe(true);
  });

  it("should return the overall auto-tuning state structure", () => {
    const state = getHeadroomAutotuneState();
    expect(state).toHaveProperty("degraded");
    expect(state).toHaveProperty("lastDecision");
    expect(state).toHaveProperty("efficiency");
    expect(typeof state.degraded).toBe("boolean");
  });
});
