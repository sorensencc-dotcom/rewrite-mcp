"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAllTests = runAllTests;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const memory_store_js_1 = require("./store/memory-store.js");
// Test store path
const testStorePath = path.join(__dirname, "..", "..", "test_memory_store.json");
function cleanup() {
    if (fs.existsSync(testStorePath))
        fs.unlinkSync(testStorePath);
    if (fs.existsSync(`${testStorePath}.lock`))
        fs.unlinkSync(`${testStorePath}.lock`);
}
async function testAppendValidEvent() {
    console.log("\n📝 Test 1: Append valid PIPELINE_RUN event");
    cleanup();
    const store = new memory_store_js_1.MemoryStore(testStorePath);
    const event = {
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
        },
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
    }
    else {
        console.log("❌ Test 1 FAILED");
    }
    cleanup();
}
async function testInvalidEvent() {
    console.log("\n📝 Test 2: Reject invalid event (missing required fields)");
    cleanup();
    const store = new memory_store_js_1.MemoryStore(testStorePath);
    const invalidEvent = {
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
    }
    catch (err) {
        console.log(`✓ Validation error caught: ${err instanceof Error ? err.message : String(err)}`);
        console.log("✅ Test 2 PASSED");
    }
    cleanup();
}
async function testDurability() {
    console.log("\n📝 Test 3: Durability - event survives flush and reload");
    cleanup();
    // Write
    const store1 = new memory_store_js_1.MemoryStore(testStorePath);
    const event = {
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
        },
        retention_days: 90,
    };
    await store1.append(event);
    await store1.flush_sync();
    console.log("✓ Event written to store");
    // Read (simulating process restart)
    const store2 = new memory_store_js_1.MemoryStore(testStorePath);
    const stats = await store2.getStats();
    console.log(`✓ Store reloaded, contains ${stats.total_events} event(s)`);
    if (stats.total_events === 1) {
        console.log("✅ Test 3 PASSED - Event survived durability test");
    }
    else {
        console.log("❌ Test 3 FAILED");
    }
    cleanup();
}
async function testQuery() {
    console.log("\n📝 Test 4: Query by event type");
    cleanup();
    const store = new memory_store_js_1.MemoryStore(testStorePath);
    const now = new Date();
    const event1 = {
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
        },
        retention_days: 90,
    };
    const event2 = {
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
    }
    else {
        console.log("❌ Test 4 FAILED");
    }
    cleanup();
}
async function runAllTests() {
    console.log("🚀 Starting MemoryStore Tests");
    console.log("════════════════════════════════════");
    try {
        await testAppendValidEvent();
        await testInvalidEvent();
        await testDurability();
        await testQuery();
        console.log("\n════════════════════════════════════");
        console.log("✅ All tests completed!");
    }
    catch (err) {
        console.error("❌ Test suite failed:", err);
    }
    cleanup();
}
// Run if called directly
if (require.main === module) {
    runAllTests().catch(console.error);
}
//# sourceMappingURL=MemoryStore.test.js.map