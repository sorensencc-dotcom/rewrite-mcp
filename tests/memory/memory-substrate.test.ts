/**
 * Memory Substrate Tests
 */

import { MemorySubstrate } from "../../src/memory/memory-substrate";
import fs from "fs";
import path from "path";

describe("MemorySubstrate", () => {
  const testStorePath = "./test_memory_store.jsonl";

  beforeEach(() => {
    if (fs.existsSync(testStorePath)) {
      fs.unlinkSync(testStorePath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testStorePath)) {
      fs.unlinkSync(testStorePath);
    }
  });

  test("should create store file on initialization", () => {
    const substrate = new MemorySubstrate({ store_path: testStorePath });
    expect(fs.existsSync(testStorePath)).toBe(true);
  });

  test("should append event with valid schema", async () => {
    const substrate = new MemorySubstrate({ store_path: testStorePath });

    await substrate.append({
      id: "evt_test_001",
      timestamp: new Date().toISOString(),
      event_type: "ARPS_DELTA",
      source_agent: "test_agent",
      session_id: "session_20260607_001",
      correlation_id: "corr_test123",
      payload: { change_type: "phase_completion", phase_id: "23.1" },
      retention_days: 90,
      version: 1,
    });

    const events = await substrate.query({ event_type: "ARPS_DELTA" });
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe("ARPS_DELTA");
  });

  test("should reject event with invalid session_id format", async () => {
    const substrate = new MemorySubstrate({ store_path: testStorePath });

    await expect(
      substrate.append({
        id: "evt_test_001",
        timestamp: new Date().toISOString(),
        event_type: "ARPS_DELTA",
        source_agent: "test_agent",
        session_id: "invalid_session",
        correlation_id: "corr_test123",
        payload: { change_type: "phase_completion" },
        retention_days: 90,
        version: 1,
      })
    ).rejects.toThrow(/session_id/);
  });

  test("should reject event with invalid correlation_id format", async () => {
    const substrate = new MemorySubstrate({ store_path: testStorePath });

    await expect(
      substrate.append({
        id: "evt_test_001",
        timestamp: new Date().toISOString(),
        event_type: "ARPS_DELTA",
        source_agent: "test_agent",
        session_id: "session_20260607_001",
        correlation_id: "invalid_corr",
        payload: { change_type: "phase_completion" },
        retention_days: 90,
        version: 1,
      })
    ).rejects.toThrow(/correlation_id/);
  });

  test("should compute and verify checksums", async () => {
    const substrate = new MemorySubstrate({ store_path: testStorePath });

    await substrate.append({
      id: "evt_test_001",
      timestamp: new Date().toISOString(),
      event_type: "ARPS_DELTA",
      source_agent: "test_agent",
      session_id: "session_20260607_001",
      correlation_id: "corr_test123",
      payload: { change_type: "phase_completion" },
      retention_days: 90,
      version: 1,
    });

    const events = await substrate.query({ event_type: "ARPS_DELTA" });
    expect(events[0].checksum).toMatch(/^sha256:/);
  });

  test("should query events by event_type", async () => {
    const substrate = new MemorySubstrate({ store_path: testStorePath });

    await substrate.append({
      id: "evt_test_001",
      timestamp: new Date().toISOString(),
      event_type: "ARPS_DELTA",
      source_agent: "test_agent",
      session_id: "session_20260607_001",
      correlation_id: "corr_test123",
      payload: {},
      retention_days: 90,
      version: 1,
    });

    await substrate.append({
      id: "evt_test_002",
      timestamp: new Date().toISOString(),
      event_type: "PIPELINE_RUN",
      source_agent: "test_agent",
      session_id: "session_20260607_001",
      correlation_id: "corr_test456",
      payload: {},
      retention_days: 90,
      version: 1,
    });

    const arpsEvents = await substrate.query({ event_type: "ARPS_DELTA" });
    const pipelineEvents = await substrate.query({ event_type: "PIPELINE_RUN" });

    expect(arpsEvents).toHaveLength(1);
    expect(pipelineEvents).toHaveLength(1);
  });

  test("should return stats", () => {
    const substrate = new MemorySubstrate({ store_path: testStorePath });
    const stats = substrate.getStats();

    expect(stats).toHaveProperty("total_events");
    expect(stats).toHaveProperty("events_by_type");
    expect(stats).toHaveProperty("store_size_mb");
  });
});
