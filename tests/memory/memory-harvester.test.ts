/**
 * Memory Harvester Tests
 */

import { MemorySubstrate } from "../../src/memory/memory-substrate";
import { MemoryHarvester } from "../../src/memory/memory-harvester";
import fs from "fs";

describe("MemoryHarvester", () => {
  let substrate: MemorySubstrate;
  let harvester: MemoryHarvester;
  const testStorePath = "./test_harvester_store.jsonl";

  beforeEach(() => {
    if (fs.existsSync(testStorePath)) {
      fs.unlinkSync(testStorePath);
    }

    substrate = new MemorySubstrate({ store_path: testStorePath });
    harvester = new MemoryHarvester({
      substrate,
      session_id: "session_20260607_test",
    });
  });

  afterEach(() => {
    if (fs.existsSync(testStorePath)) {
      fs.unlinkSync(testStorePath);
    }
  });

  test("should harvest ARPS_DELTA events", async () => {
    await harvester.harvestARPSDelta({
      change_type: "phase_completion",
      phase_id: "23.1",
      old_value: "PENDING",
      new_value: "COMPLETE",
      git_commit: "abc123",
      confidence: 1.0,
      affected_subsystems: ["Memory Layer"],
    });

    const events = await substrate.query({ event_type: "ARPS_DELTA" });
    expect(events).toHaveLength(1);
    expect(events[0].payload.phase_id).toBe("23.1");
  });

  test("should harvest PLATFORM_EXTRACTION events", async () => {
    await harvester.harvestPlatformExtraction({
      extraction_type: "posts",
      platform: "instagram",
      query: "test_query",
      api_endpoint_id: "instagram_posts_v1",
      status: "success",
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      duration_ms: 1000,
      items_requested: 50,
      items_returned: 50,
      items_normalized: 50,
      normalization_errors: 0,
      rate_limit_remaining: 30,
      rate_limit_reset_seconds: 3600,
      confidence_score: 0.95,
      data_quality_metrics: {
        schema_validation_pass_rate: 1.0,
        missing_field_rate: 0.0,
        anomaly_detection_flags: 0,
      },
      documentary_context: {
        is_sorensen_harvest: false,
        sorensen_keywords_matched: [],
      },
    });

    const events = await substrate.query({ event_type: "PLATFORM_EXTRACTION" });
    expect(events).toHaveLength(1);
    expect(events[0].payload.platform).toBe("instagram");
  });

  test("should harvest GOVERNANCE_SIGNAL events", async () => {
    await harvester.harvestGovernanceSignal({
      signal_type: "approval",
      entity_type: "skill",
      entity_id: "test_skill",
      decision: "approved",
      reason: "Auto-approved",
      approval_count: 1,
      approval_threshold: 1,
      metadata: {},
    });

    const events = await substrate.query({ event_type: "GOVERNANCE_SIGNAL" });
    expect(events).toHaveLength(1);
    expect(events[0].payload.decision).toBe("approved");
  });

  test("should harvest APR_PLAN events", async () => {
    await harvester.harvestAPRPlan({
      plan_id: "plan_test_001",
      goal: "Test goal",
      plan_type: "feature_development",
      status: "generated",
      task_count: 1,
      task_graph: [{ id: "task_1", name: "Test task", depends_on: [], estimated_effort_hours: 2 }],
      critical_path_hours: 2,
      risk_level: "low",
      risk_factors: [],
      agent_consensus_score: 0.95,
      agents_involved: ["planner"],
    });

    const events = await substrate.query({ event_type: "APR_PLAN" });
    expect(events).toHaveLength(1);
    expect(events[0].payload.plan_id).toBe("plan_test_001");
  });

  test("should batch ingest events", async () => {
    const count = await harvester.ingestBatch([
      {
        event_type: "ARPS_DELTA",
        payload: { change_type: "phase_completion" },
        source_agent: "test_agent",
      },
      {
        event_type: "PLATFORM_EXTRACTION",
        payload: { extraction_type: "posts", platform: "instagram" },
        source_agent: "test_agent",
      },
    ]);

    expect(count).toBe(2);

    const events = await substrate.query({ limit: 100 });
    expect(events).toHaveLength(2);
  });
});
