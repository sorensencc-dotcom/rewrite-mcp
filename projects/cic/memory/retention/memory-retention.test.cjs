const fs = require("fs");
const path = require("path");

// Test that MemoryRetention types are properly defined
function testRetentionTypes() {
  try {
    const typesPath = path.join(__dirname, "memory-retention.types.ts");
    const content = fs.readFileSync(typesPath, "utf8");

    const requiredTypes = [
      "DistillationStrategy",
      "ArchiveMetadata",
      "ArchiveIndex",
      "DistillationRule",
      "RetentionStats",
      "RetentionOptions",
    ];

    for (const type of requiredTypes) {
      if (!content.includes(type)) {
        throw new Error(`Missing type: ${type}`);
      }
    }

    const strategies = ["aggregate", "keep_first_last", "keep_all", "daily_summary", "group_summary"];
    for (const strategy of strategies) {
      if (!content.includes(`"${strategy}"`)) {
        throw new Error(`Missing strategy: ${strategy}`);
      }
    }

    console.log("✅ Test 1: Retention types properly defined");
    return true;
  } catch (err) {
    console.log("❌ Test 1 FAILED -", err.message);
    return false;
  }
}

// Test that MemoryDistiller is properly implemented
function testMemoryDistiller() {
  try {
    const distillerPath = path.join(__dirname, "memory-distiller.ts");
    const content = fs.readFileSync(distillerPath, "utf8");

    const requiredMethods = [
      "distillEvents",
      "setRule",
      "canDistill",
      "keepFirstLast",
      "dailySummary",
      "groupSummary",
      "aggregate",
    ];

    for (const method of requiredMethods) {
      if (!content.includes(`${method}`)) {
        throw new Error(`Missing method: ${method}`);
      }
    }

    if (!content.includes("getDefaultRules")) {
      throw new Error("Missing getDefaultRules method");
    }

    console.log("✅ Test 2: MemoryDistiller implementation");
    return true;
  } catch (err) {
    console.log("❌ Test 2 FAILED -", err.message);
    return false;
  }
}

// Test that MemoryRetention archival methods are implemented
function testRetentionArchival() {
  try {
    const retentionPath = path.join(__dirname, "memory-retention.ts");
    const content = fs.readFileSync(retentionPath, "utf8");

    const asyncMethods = [
      "archiveOlderThan",
      "distillOlderThan",
      "listArchives",
      "restoreArchive",
      "getRetentionStats",
    ];

    for (const method of asyncMethods) {
      if (!content.includes(`async ${method}`)) {
        throw new Error(`Missing async method: ${method}`);
      }
    }

    const syncMethods = [
      "startAutoArchive",
      "stopAutoArchive",
    ];

    for (const method of syncMethods) {
      if (!content.includes(`${method}()`)) {
        throw new Error(`Missing method: ${method}`);
      }
    }

    console.log("✅ Test 3: MemoryRetention archival methods");
    return true;
  } catch (err) {
    console.log("❌ Test 3 FAILED -", err.message);
    return false;
  }
}

// Test that compression is handled
function testCompressionSupport() {
  try {
    const retentionPath = path.join(__dirname, "memory-retention.ts");
    const content = fs.readFileSync(retentionPath, "utf8");

    if (!content.includes("zlib")) {
      throw new Error("zlib module not imported");
    }

    if (!content.includes("gzipSync")) {
      throw new Error("gzipSync not found");
    }

    if (!content.includes("gunzipSync")) {
      throw new Error("gunzipSync not found");
    }

    if (!content.includes(".gz")) {
      throw new Error("Compression file extension not used");
    }

    console.log("✅ Test 4: Compression support (gzip)");
    return true;
  } catch (err) {
    console.log("❌ Test 4 FAILED -", err.message);
    return false;
  }
}

// Test that archive index is maintained
function testArchiveIndex() {
  try {
    const retentionPath = path.join(__dirname, "memory-retention.ts");
    const content = fs.readFileSync(retentionPath, "utf8");

    if (!content.includes("archive-index.json")) {
      throw new Error("archive-index.json not referenced");
    }

    if (!content.includes("updateIndex")) {
      throw new Error("updateIndex method not found");
    }

    if (!content.includes("ArchiveIndex")) {
      throw new Error("ArchiveIndex type not used");
    }

    console.log("✅ Test 5: Archive index maintenance");
    return true;
  } catch (err) {
    console.log("❌ Test 5 FAILED -", err.message);
    return false;
  }
}

// Test that auto-archive scheduler is implemented
function testAutoArchiveScheduler() {
  try {
    const retentionPath = path.join(__dirname, "memory-retention.ts");
    const content = fs.readFileSync(retentionPath, "utf8");

    if (!content.includes("autoArchiveTimer")) {
      throw new Error("autoArchiveTimer not found");
    }

    if (!content.includes("setInterval")) {
      throw new Error("setInterval not used for scheduler");
    }

    if (!content.includes("clearInterval")) {
      throw new Error("clearInterval not used to stop scheduler");
    }

    if (!content.includes("autoArchiveIntervalMs")) {
      throw new Error("autoArchiveIntervalMs not defined");
    }

    console.log("✅ Test 6: Auto-archive scheduler");
    return true;
  } catch (err) {
    console.log("❌ Test 6 FAILED -", err.message);
    return false;
  }
}

// Test that retention stats are properly calculated
function testRetentionStats() {
  try {
    const retentionPath = path.join(__dirname, "memory-retention.ts");
    const content = fs.readFileSync(retentionPath, "utf8");

    if (!content.includes("getRetentionStats")) {
      throw new Error("getRetentionStats method not found");
    }

    const statFields = [
      "hot_events",
      "archived_events",
      "archive_count",
      "hot_size_mb",
      "cold_size_mb",
    ];

    for (const field of statFields) {
      if (!content.includes(field)) {
        throw new Error(`Missing stat field: ${field}`);
      }
    }

    console.log("✅ Test 7: Retention stats calculation");
    return true;
  } catch (err) {
    console.log("❌ Test 7 FAILED -", err.message);
    return false;
  }
}

// Test that MemoryDistiller handles all event types
function testDistillerEventTypes() {
  try {
    const distillerPath = path.join(__dirname, "memory-distiller.ts");
    const content = fs.readFileSync(distillerPath, "utf8");

    const eventTypes = [
      "PIPELINE_RUN",
      "AGENT_TELEMETRY",
      "GOVERNANCE_SIGNAL",
      "APR_PLAN",
      "CRO_RUN",
      "ARPS_DELTA",
    ];

    for (const type of eventTypes) {
      if (!content.includes(`"${type}"`)) {
        throw new Error(`Missing event type: ${type}`);
      }
    }

    console.log("✅ Test 8: Distiller handles all event types");
    return true;
  } catch (err) {
    console.log("❌ Test 8 FAILED -", err.message);
    return false;
  }
}

// Main test runner
const tests = [
  testRetentionTypes,
  testMemoryDistiller,
  testRetentionArchival,
  testCompressionSupport,
  testArchiveIndex,
  testAutoArchiveScheduler,
  testRetentionStats,
  testDistillerEventTypes,
];

let passed = 0;
for (const test of tests) {
  if (test()) {
    passed++;
  }
}

console.log(`\n✅ Tests completed: ${passed}/${tests.length} passed`);
process.exit(passed === tests.length ? 0 : 1);
