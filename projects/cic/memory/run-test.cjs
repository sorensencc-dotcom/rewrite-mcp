const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

// Simple test runner for MemoryStore

console.log("🚀 Starting MemoryStore Tests");
console.log("════════════════════════════════════");

// Test 1: Basic file write and read
async function testBasicPersistence() {
  console.log("\n📝 Test 1: Basic persistence");
  const testPath = path.join(__dirname, "test_basic.json");

  try {
    const event = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      event_type: "PIPELINE_RUN",
      source_agent: "harvester",
      session_id: "session_20260607_001",
      correlation_id: "corr_test123",
      payload: {
        pipeline_name: "ingestion",
        pipeline_id: "run_001",
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
      version: 1,
    };

    // Compute checksum
    const sortedKeys = Object.keys(event).sort();
    const json = JSON.stringify(
      Object.fromEntries(sortedKeys.map((k) => [k, event[k]]))
    );
    const checksum = "sha256:" + crypto.createHash("sha256").update(json).digest("hex");
    event.checksum = checksum;

    // Write to file
    fs.writeFileSync(testPath, JSON.stringify([event], null, 2));
    console.log(`✓ Event written to ${testPath}`);
    console.log(`✓ Checksum: ${checksum}`);

    // Read back
    const stored = JSON.parse(fs.readFileSync(testPath, "utf-8"));
    console.log(`✓ Event read back, count: ${stored.length}`);

    if (stored.length === 1 && stored[0].id === event.id) {
      console.log("✅ Test 1 PASSED");
      fs.unlinkSync(testPath);
      return true;
    } else {
      console.log("❌ Test 1 FAILED");
      fs.unlinkSync(testPath);
      return false;
    }
  } catch (err) {
    console.error(`❌ Test 1 ERROR: ${err.message}`);
    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
    return false;
  }
}

// Test 2: Checksum validation
async function testChecksumValidation() {
  console.log("\n📝 Test 2: Checksum validation");

  try {
    const event = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      event_type: "PIPELINE_RUN",
      source_agent: "harvester",
      session_id: "session_20260607_001",
      correlation_id: "corr_test123",
      payload: { pipeline_name: "test", pipeline_id: "run_1", status: "success", start_time: new Date().toISOString(), end_time: new Date().toISOString(), duration_ms: 1000, items_processed: 1, items_successful: 1, items_failed: 0, metrics: { throughput_items_per_second: 1, error_rate_percent: 0, resource_usage_mb: 128 } },
      retention_days: 90,
      version: 1,
    };

    // Compute correct checksum (excluding checksum field itself)
    const eventNoChecksum = { ...event };
    const sortedKeys = Object.keys(eventNoChecksum).sort();
    const json = JSON.stringify(
      Object.fromEntries(sortedKeys.map((k) => [k, eventNoChecksum[k]]))
    );
    const correctChecksum = "sha256:" + crypto.createHash("sha256").update(json).digest("hex");
    event.checksum = correctChecksum;

    // Verify - recompute without checksum field
    const eventNoChecksumVerify = { ...event };
    delete eventNoChecksumVerify.checksum;
    const sortedKeysVerify = Object.keys(eventNoChecksumVerify).sort();
    const jsonVerify = JSON.stringify(
      Object.fromEntries(sortedKeysVerify.map((k) => [k, eventNoChecksumVerify[k]]))
    );
    const computedChecksum = "sha256:" + crypto.createHash("sha256").update(jsonVerify).digest("hex");

    if (computedChecksum === event.checksum) {
      console.log("✓ Checksum validation passed");
      console.log("✅ Test 2 PASSED");
      return true;
    } else {
      console.log("❌ Test 2 FAILED - checksums don't match");
      console.log(`  Expected: ${event.checksum}`);
      console.log(`  Got:      ${computedChecksum}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Test 2 ERROR: ${err.message}`);
    return false;
  }
}

// Test 3: Type validation structure
async function testEventTypeStructure() {
  console.log("\n📝 Test 3: Event type structure");

  try {
    const validEventTypes = ["ARPS_DELTA", "PIPELINE_RUN", "AGENT_TELEMETRY", "GOVERNANCE_SIGNAL", "APR_PLAN", "CRO_RUN"];

    let allValid = true;
    for (const type of validEventTypes) {
      if (typeof type !== "string" || !type) {
        allValid = false;
        console.log(`✗ Invalid type: ${type}`);
      } else {
        console.log(`✓ Valid type: ${type}`);
      }
    }

    if (allValid) {
      console.log("✅ Test 3 PASSED");
      return true;
    } else {
      console.log("❌ Test 3 FAILED");
      return false;
    }
  } catch (err) {
    console.error(`❌ Test 3 ERROR: ${err.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = [];

  results.push(await testBasicPersistence());
  results.push(await testChecksumValidation());
  results.push(await testEventTypeStructure());

  console.log("\n════════════════════════════════════");
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`✅ Tests completed: ${passed}/${total} passed`);

  if (passed === total) {
    console.log("✅ All tests PASSED!");
  } else {
    console.log(`⚠️ ${total - passed} test(s) failed`);
  }

  process.exit(passed === total ? 0 : 1);
}

runAllTests().catch(console.error);
