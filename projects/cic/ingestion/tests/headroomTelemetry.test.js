import { describe, it, expect, beforeEach } from "vitest";
import {
  recordCompression,
  recordMCPLatency,
  recordProxyLatency,
  recordBypass,
  recordAuthFailure,
  recordCCRRetrieval,
  recordError,
  getHeadroomTelemetry
} from "../src/lib/headroomTelemetry.js";

describe("Headroom Telemetry Collector", () => {
  beforeEach(() => {
    // Reset env and state limits if needed, but since state is global, we can test incremental growth
    process.env.HEADROOM_TELEMETRY_ENABLED = "true";
  });

  it("should record compression ratio correctly", () => {
    const before = getHeadroomTelemetry();
    recordCompression(100, 40); // 0.4 ratio
    const after = getHeadroomTelemetry();
    
    expect(after.compressionHistory.length).toBe(before.compressionHistory.length + 1);
    expect(after.compressionHistory[after.compressionHistory.length - 1]).toBeCloseTo(0.4);
  });

  it("should record MCP latency", () => {
    const before = getHeadroomTelemetry();
    recordMCPLatency(120);
    const after = getHeadroomTelemetry();

    expect(after.mcpLatencyHistory.length).toBe(before.mcpLatencyHistory.length + 1);
    expect(after.mcpLatencyHistory[after.mcpLatencyHistory.length - 1]).toBe(120);
  });

  it("should record Proxy latency", () => {
    const before = getHeadroomTelemetry();
    recordProxyLatency(250);
    const after = getHeadroomTelemetry();

    expect(after.proxyLatencyHistory.length).toBe(before.proxyLatencyHistory.length + 1);
    expect(after.proxyLatencyHistory[after.proxyLatencyHistory.length - 1]).toBe(250);
  });

  it("should increment bypass and auth failure counts", () => {
    const before = getHeadroomTelemetry();
    recordBypass();
    recordAuthFailure();
    recordCCRRetrieval();
    const after = getHeadroomTelemetry();

    expect(after.bypassCount).toBe(before.bypassCount + 1);
    expect(after.authFailureCount).toBe(before.authFailureCount + 1);
    expect(after.ccrRetrievalCount).toBe(before.ccrRetrievalCount + 1);
  });

  it("should log errors", () => {
    recordError(new Error("Test Error"));
    const after = getHeadroomTelemetry();

    expect(after.lastError).toBe("Test Error");
  });
});
