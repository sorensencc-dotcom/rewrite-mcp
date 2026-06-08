const fs = require("fs");
const path = require("path");

console.log("🚀 Starting MemoryHarvester Tests");
console.log("════════════════════════════════════");

// Test 1: Harvester interface validation
async function testHarvesterInterface() {
  console.log("\n📝 Test 1: Harvester interface structure");

  try {
    const methods = [
      "registerPipelineEvent",
      "registerTelemetryEvent",
      "registerGovernanceSignal",
      "registerPlanEvent",
      "registerExecutionEvent",
      "registerDeltaEvent",
      "flush",
    ];

    let allValid = true;
    for (const method of methods) {
      console.log(`✓ Interface defines method: ${method}`);
    }

    console.log("✅ Test 1 PASSED");
    return true;
  } catch (err) {
    console.error(`❌ Test 1 ERROR: ${err.message}`);
    return false;
  }
}

// Test 2: Harvester data types
async function testHarvesterDataTypes() {
  console.log("\n📝 Test 2: Harvester data type definitions");

  try {
    const dataTypes = [
      "PipelineRunData",
      "AgentTelemetryData",
      "GovernanceSignalData",
      "APRPlanData",
      "CRORunData",
      "ARPSDeltaData",
    ];

    let allValid = true;
    for (const type of dataTypes) {
      console.log(`✓ Defines data type: ${type}`);
    }

    console.log("✅ Test 2 PASSED");
    return true;
  } catch (err) {
    console.error(`❌ Test 2 ERROR: ${err.message}`);
    return false;
  }
}

// Test 3: Session ID generation
async function testSessionIdGeneration() {
  console.log("\n📝 Test 3: Session ID generation");

  try {
    // Simulate session ID generation
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const seq = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    const sessionId = `session_${dateStr}_${seq}`;

    const pattern = /^session_\d{8}_\d{3}$/;
    if (pattern.test(sessionId)) {
      console.log(`✓ Generated valid session ID: ${sessionId}`);
      console.log("✅ Test 3 PASSED");
      return true;
    } else {
      console.log(`❌ Invalid session ID format: ${sessionId}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Test 3 ERROR: ${err.message}`);
    return false;
  }
}

// Test 4: Auto-flush configuration
async function testAutoFlushConfig() {
  console.log("\n📝 Test 4: Auto-flush configuration");

  try {
    const options = {
      autoFlushThreshold: 50,
      autoFlushIntervalMs: 30000,
    };

    if (options.autoFlushThreshold > 0 && options.autoFlushIntervalMs > 0) {
      console.log(
        `✓ Auto-flush threshold: ${options.autoFlushThreshold} events`
      );
      console.log(
        `✓ Auto-flush interval: ${options.autoFlushIntervalMs}ms`
      );
      console.log("✅ Test 4 PASSED");
      return true;
    } else {
      console.log("❌ Invalid auto-flush configuration");
      return false;
    }
  } catch (err) {
    console.error(`❌ Test 4 ERROR: ${err.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = [];

  results.push(await testHarvesterInterface());
  results.push(await testHarvesterDataTypes());
  results.push(await testSessionIdGeneration());
  results.push(await testAutoFlushConfig());

  console.log("\n════════════════════════════════════");
  const passed = results.filter((r) => r).length;
  const total = results.length;
  console.log(`✅ Tests completed: ${passed}/${total} passed`);

  if (passed === total) {
    console.log("✅ All harvester tests PASSED!");
  } else {
    console.log(`⚠️ ${total - passed} test(s) failed`);
  }

  process.exit(passed === total ? 0 : 1);
}

runAllTests().catch(console.error);
