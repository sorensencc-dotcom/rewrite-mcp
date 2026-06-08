import * as fs from "fs";
import * as path from "path";
import { MemoryStore } from "./store/memory-store";
import { CreateMemoryEventInput } from "./store/memory-store.types";
import { PipelineRunPayload } from "./store/memory-store.types";

// Test store path
const testStorePath = path.join(__dirname, "..", "..", "test_memory_store.json");

function cleanup(): void {
  if (fs.existsSync(testStorePath)) fs.unlinkSync(testStorePath);
  if (fs.existsSync(`${testStorePath}.lock`))
    fs.unlinkSync(`${testStorePath}.lock`);
}

async function testAppendValidEvent(): Promise<void> {
  console.log("\n📝 Test 1: Append valid PIPELINE_RUN event");
  cleanup();

  const store = new MemoryStore(testStorePath);
  const event: CreateMemoryEventInput = {
    timestamp: new Date().toISOString(),
    event_type: "PIPELINE_RUN",
    source_agent: "harvester",
    session_id: "session_20260607_001",
    correlation_id: "corr_test123",
    payload: {
      pipeline_name: "ingestion",
      pipeline_id: "run_20260607_001",
      status: "success",
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      duration_ms: 1000,
      items_processed: 10,
      items_successful: 10,
      items_failed: 0,
      metrics: {
        throughput_items_per_second: 10,
        error_rate_percent: 0,
        resource_usage_mb: 128,
      },
    } as PipelineRunPayload,
    retention_days: 90,
  };

  const result = await store.append(event);
  console.log(`✓ Event appended: ${result.id}`);
  console.log(`✓ Checksum: ${result.checksum}`);

  await store.flush_sync();
  const stats = await store.getStats();
  console.log(`✓ Store contains ${stats.total_events} event(s)`);

  if (stats.total_events === 1) {
    console.log("✅ Test 1 PASSED");
  } else {
    console.log("❌ Test 1 FAILED");
  }

  cleanup();
}

async function testInvalidEvent(): Promise<void> {
  console.log("\n📝 Test 2: Reject invalid event (missing required fields)");
  cleanup();

  const store = new MemoryStore(testStorePath);
  const invalidEvent: any = {
    timestamp: new Date().toISOString(),
    event_type: "PIPELINE_RUN",
    source_agent: "harvester",
    session_id: "session_20260607_001",
    correlation_id: "corr_test123",
    payload: {
      pipeline_name: "ingestion",
      // Missing all other required fields
    },
    retention_days: 90,
  };

  try {
    await store.append(invalidEvent);
    console.log("❌ Test 2 FAILED - should have thrown validation error");
  } catch (err) {
    console.log(`✓ Validation error caught: ${err instanceof Error ? err.message : String(err)}`);
    console.log("✅ Test 2 PASSED");
  }

  cleanup();
}

async function testDurability(): Promise<void> {
  console.log(
    "\n📝 Test 3: Durability - event survives flush and reload"
  );
  cleanup();

  // Write
  const store1 = new MemoryStore(testStorePath);
  const event: CreateMemoryEventInput = {
    timestamp: new Date().toISOString(),
    event_type: "PIPELINE_RUN",
    source_agent: "harvester",
    session_id: "session_20260607_001",
    correlation_id: "corr_test123",
    payload: {
      pipeline_name: "ingestion",
      pipeline_id: "run_20260607_001",
      status: "success",
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      duration_ms: 1000,
      items_processed: 10,
      items_successful: 10,
      items_failed: 0,
      metrics: {
        throughput_items_per_second: 10,
        error_rate_percent: 0,
        resource_usage_mb: 128,
      },
    } as PipelineRunPayload,
    retention_days: 90,
  };

  await store1.append(event);
  await store1.flush_sync();
  console.log("✓ Event written to store");

  // Read (simulating process restart)
  const store2 = new MemoryStore(testStorePath);
  const stats = await store2.getStats();
  console.log(`✓ Store reloaded, contains ${stats.total_events} event(s)`);

  if (stats.total_events === 1) {
    console.log("✅ Test 3 PASSED - Event survived durability test");
  } else {
    console.log("❌ Test 3 FAILED");
  }

  cleanup();
}

async function testQuery(): Promise<void> {
  console.log("\n📝 Test 4: Query by event type");
  cleanup();

  const store = new MemoryStore(testStorePath);

  const now = new Date();
  const event1: CreateMemoryEventInput = {
    timestamp: now.toISOString(),
    event_type: "PIPELINE_RUN",
    source_agent: "harvester",
    session_id: "session_20260607_001",
    correlation_id: "corr_test123",
    payload: {
      pipeline_name: "ingestion",
      pipeline_id: "run_1",
      status: "success",
      start_time: now.toISOString(),
      end_time: new Date(now.getTime() + 1000).toISOString(),
      duration_ms: 1000,
      items_processed: 10,
      items_successful: 10,
      items_failed: 0,
      metrics: {
        throughput_items_per_second: 10,
        error_rate_percent: 0,
        resource_usage_mb: 128,
      },
    } as PipelineRunPayload,
    retention_days: 90,
  };

  const event2: CreateMemoryEventInput = {
    timestamp: new Date(now.getTime() + 2000).toISOString(),
    event_type: "AGENT_TELEMETRY",
    source_agent: "monitor",
    session_id: "session_20260607_001",
    correlation_id: "corr_test456",
    payload: {
      agent_name: "harvester",
      agent_class: "ingestion",
      status: "healthy",
      uptime_seconds: 3600,
      task_count: 100,
      task_success_rate: 0.99,
      performance: {
        avg_task_duration_ms: 100,
        p95_task_duration_ms: 500,
        cpu_usage_percent: 25,
        memory_usage_mb: 256,
        error_rate_percent: 1,
      },
    },
    retention_days: 90,
  };

  await store.append(event1);
  await store.append(event2);
  await store.flush_sync();

  const pipelineEvents = await store.query("PIPELINE_RUN");
  const telemetryEvents = await store.query("AGENT_TELEMETRY");

  console.log(`✓ PIPELINE_RUN events: ${pipelineEvents.length}`);
  console.log(`✓ AGENT_TELEMETRY events: ${telemetryEvents.length}`);

  if (pipelineEvents.length === 1 && telemetryEvents.length === 1) {
    console.log("✅ Test 4 PASSED");
  } else {
    console.log("❌ Test 4 FAILED");
  }

  cleanup();
}

async function runAllTests(): Promise<void> {
  console.log("🚀 Starting MemoryStore Tests");
  console.log("════════════════════════════════════");

  try {
    await testAppendValidEvent();
    await testInvalidEvent();
    await testDurability();
    await testQuery();

    console.log("\n════════════════════════════════════");
    console.log("✅ All tests completed!");
  } catch (err) {
    console.error("❌ Test suite failed:", err);
  }

  cleanup();
}

// Run if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests };
