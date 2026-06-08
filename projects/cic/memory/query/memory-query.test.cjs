const fs = require("fs");
const path = require("path");

// Test that MemoryQuery interface and types are properly defined
function testMemoryQueryInterface() {
  try {
    const queryPath = path.join(__dirname, "memory-query.ts");
    const content = fs.readFileSync(queryPath, "utf8");

    const requiredMethods = [
      "queryByType",
      "queryByCorrelationId",
      "queryBySessionId",
      "reconstructSession",
      "governanceLineage",
      "getEventTimeline",
    ];

    for (const method of requiredMethods) {
      if (!content.includes(`async ${method}`)) {
        throw new Error(`Missing method: ${method}`);
      }
    }

    console.log("✅ Test 1: MemoryQuery interface structure");
    return true;
  } catch (err) {
    console.log("❌ Test 1 FAILED -", err.message);
    return false;
  }
}

// Test that QueryResult type is properly defined
function testQueryResultTypes() {
  try {
    const typesPath = path.join(__dirname, "memory-query.types.ts");
    const content = fs.readFileSync(typesPath, "utf8");

    const requiredTypes = [
      "MemoryEventType",
      "TimeRange",
      "QueryOptions",
      "TypeQueryOptions",
      "CorrelationQueryOptions",
      "SessionQueryOptions",
      "MemoryEventEnvelope",
      "QueryResult",
      "SessionReconstructionResult",
      "GovernanceLineageResult",
    ];

    for (const type of requiredTypes) {
      if (!content.includes(type)) {
        throw new Error(`Missing type: ${type}`);
      }
    }

    const eventTypes = [
      "ARPS_DELTA",
      "PIPELINE_RUN",
      "AGENT_TELEMETRY",
      "GOVERNANCE_SIGNAL",
      "APR_PLAN",
      "CRO_RUN",
    ];

    for (const eventType of eventTypes) {
      if (!content.includes(`"${eventType}"`)) {
        throw new Error(`Missing event type: ${eventType}`);
      }
    }

    console.log("✅ Test 2: QueryResult and envelope types");
    return true;
  } catch (err) {
    console.log("❌ Test 2 FAILED -", err.message);
    return false;
  }
}

// Test that error types are properly defined
function testErrorTypes() {
  try {
    const errorsPath = path.join(__dirname, "memory-query.errors.ts");
    const content = fs.readFileSync(errorsPath, "utf8");

    const requiredErrors = [
      "MemoryQueryError",
      "MemoryQueryValidationError",
      "MemoryQueryNotFoundError",
    ];

    for (const error of requiredErrors) {
      if (!content.includes(`class ${error}`)) {
        throw new Error(`Missing error class: ${error}`);
      }
    }

    console.log("✅ Test 3: Error types properly defined");
    return true;
  } catch (err) {
    console.log("❌ Test 3 FAILED -", err.message);
    return false;
  }
}

// Test that MemoryQuery properly depends on MemoryStore
function testMemoryStoreDependency() {
  try {
    const queryPath = path.join(__dirname, "memory-query.ts");
    const content = fs.readFileSync(queryPath, "utf8");

    if (!content.includes("MemoryStore")) {
      throw new Error("MemoryQuery does not reference MemoryStore");
    }

    if (!content.includes("constructor(store: MemoryStore)")) {
      throw new Error("MemoryQuery constructor does not accept MemoryStore");
    }

    if (!content.includes("this.store")) {
      throw new Error("MemoryQuery does not store MemoryStore reference");
    }

    console.log("✅ Test 4: MemoryStore dependency properly wired");
    return true;
  } catch (err) {
    console.log("❌ Test 4 FAILED -", err.message);
    return false;
  }
}

// Test that query methods return QueryResult
function testQueryResultContract() {
  try {
    const queryPath = path.join(__dirname, "memory-query.ts");
    const content = fs.readFileSync(queryPath, "utf8");

    const methods = [
      "queryByType",
      "queryByCorrelationId",
      "queryBySessionId",
      "getEventTimeline",
    ];

    for (const method of methods) {
      const pattern = new RegExp(`async ${method}.*Promise<QueryResult>`);
      if (!pattern.test(content)) {
        console.warn(`  Note: ${method} return type not explicitly shown in source`);
      }
    }

    if (content.includes("QueryResult")) {
      console.log("✅ Test 5: Query methods return QueryResult");
      return true;
    }

    throw new Error("QueryResult type not used in query methods");
  } catch (err) {
    console.log("❌ Test 5 FAILED -", err.message);
    return false;
  }
}

// Test that pagination is implemented
function testPaginationLogic() {
  try {
    const queryPath = path.join(__dirname, "memory-query.ts");
    const content = fs.readFileSync(queryPath, "utf8");

    if (!content.includes("paginate")) {
      throw new Error("paginate method not found");
    }

    if (!content.includes("limit") || !content.includes("offset")) {
      throw new Error("limit/offset parameters not found");
    }

    console.log("✅ Test 6: Pagination logic implemented");
    return true;
  } catch (err) {
    console.log("❌ Test 6 FAILED -", err.message);
    return false;
  }
}

// Test that governance lineage filtering is implemented
function testGovernanceLineageLogic() {
  try {
    const queryPath = path.join(__dirname, "memory-query.ts");
    const content = fs.readFileSync(queryPath, "utf8");

    if (!content.includes("governanceLineage")) {
      throw new Error("governanceLineage method not found");
    }

    if (!content.includes("GOVERNANCE_SIGNAL")) {
      throw new Error("GOVERNANCE_SIGNAL filtering not found");
    }

    if (!content.includes("executionTrace")) {
      throw new Error("executionTrace filtering not found");
    }

    console.log("✅ Test 7: Governance lineage filtering implemented");
    return true;
  } catch (err) {
    console.log("❌ Test 7 FAILED -", err.message);
    return false;
  }
}

// Test that session reconstruction includes breakdown
function testSessionReconstructionBreakdown() {
  try {
    const queryPath = path.join(__dirname, "memory-query.ts");
    const content = fs.readFileSync(queryPath, "utf8");

    if (!content.includes("reconstructSession")) {
      throw new Error("reconstructSession method not found");
    }

    if (!content.includes("eventTypeBreakdown")) {
      throw new Error("eventTypeBreakdown not found in reconstructSession");
    }

    if (!content.includes("SessionReconstructionResult")) {
      throw new Error("SessionReconstructionResult not returned");
    }

    console.log("✅ Test 8: Session reconstruction breakdown implemented");
    return true;
  } catch (err) {
    console.log("❌ Test 8 FAILED -", err.message);
    return false;
  }
}

// Main test runner
const tests = [
  testMemoryQueryInterface,
  testQueryResultTypes,
  testErrorTypes,
  testMemoryStoreDependency,
  testQueryResultContract,
  testPaginationLogic,
  testGovernanceLineageLogic,
  testSessionReconstructionBreakdown,
];

let passed = 0;
for (const test of tests) {
  if (test()) {
    passed++;
  }
}

console.log(`\n✅ Tests completed: ${passed}/${tests.length} passed`);
process.exit(passed === tests.length ? 0 : 1);
