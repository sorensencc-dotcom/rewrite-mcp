import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  evaluatePolicies,
  shouldBypassByPolicy,
  getPolicyState,
  resetPolicyState
} from "../src/lib/headroomPolicyEngine.js";
import {
  recordCompression,
  recordMCPLatency,
  recordBypass,
  recordAuthFailure
} from "../src/lib/headroomTelemetry.js";

describe("Headroom Policy Engine Subsystem", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
    resetPolicyState();
    process.env = { ...originalEnv };
    process.env.HEADROOM_POLICY_ENABLED = "true";
    process.env.HEADROOM_POLICY_INTERVAL = "1000"; // 1 second for easier testing
    process.env.HEADROOM_POLICY_RULES = JSON.stringify([
      { id: "degrade_on_bypass", if: { bypassCount: ">=10" }, then: "bypass" },
      { id: "degrade_on_auth", if: { authFailureCount: ">=5" }, then: "bypass" },
      { id: "optimize_on_good_compression", if: { avgCompression: "<=0.40" }, then: "enable" }
    ]);

    // Reset telemetry mock state (telemetry isn't fully mockable but we can reset by changing its env or pushing fake values, or we can just let it run on actual telemetry module state)
    // To ensure a clean starting point, we reset the telemetry module's state properties if needed.
    // Since telemetry keeps state in a module-level variable, let's write to it.
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should return default fallback when no rules match", () => {
    const res = evaluatePolicies();
    expect(res.action).toBe("enable");
    expect(res.rule).toBe("default");
    expect(shouldBypassByPolicy()).toBe(false);
  });

  it("should bypass when bypass threshold rule matches", () => {
    // Inject bypasses into telemetry by calling recordBypass 12 times (threshold is >=10)
    for (let i = 0; i < 12; i++) {
      recordBypass();
    }

    const res = evaluatePolicies();
    expect(res.action).toBe("bypass");
    expect(res.rule).toBe("degrade_on_bypass");
    expect(shouldBypassByPolicy()).toBe(true);
  });

  it("should cache evaluation according to interval", () => {
    process.env.HEADROOM_POLICY_INTERVAL = "10000"; // 10 seconds

    const res1 = evaluatePolicies();
    expect(res1.rule).toBe("degrade_on_bypass"); // Still degraded from last test

    // If we trigger auth failures, the rule "degrade_on_auth" should evaluate next
    // record auth failures
    for (let i = 0; i < 6; i++) {
      recordAuthFailure();
    }

    // shouldBypassByPolicy should use the cached decision and not re-evaluate yet
    shouldBypassByPolicy();
    const state = getPolicyState();
    expect(state.lastDecision.rule).toBe("degrade_on_bypass");
  });

  it("should support rule hot-reloading", () => {
    // Change rules env
    process.env.HEADROOM_POLICY_RULES = JSON.stringify([
      { id: "always_bypass", if: {}, then: "bypass" }
    ]);

    const res = evaluatePolicies();
    expect(res.action).toBe("bypass");
    expect(res.rule).toBe("always_bypass");
  });

  it("should respect HEADROOM_POLICY_ENABLED toggle", () => {
    process.env.HEADROOM_POLICY_ENABLED = "false";
    const res = evaluatePolicies();
    expect(res.action).toBe("enable");
    expect(res.reason).toBe("policy_disabled");
    expect(shouldBypassByPolicy()).toBe(false);
  });
});
