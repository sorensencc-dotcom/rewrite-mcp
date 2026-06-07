#!/usr/bin/env node

/**
 * Comprehensive AAB System Batch Test
 * Exercises all whitelisted operations in autonomous mode
 * Should complete with zero approval interrupts
 */

import { PermissionManager } from "../skills-runtime/permission-manager.js";

async function runBatchTest() {
  console.log("\n🚀 AAB BATCH TEST — 50+ OPERATIONS\n");
  console.log(`Mode: ${process.env.AUTONOMOUS_EXECUTION === "true" ? "AUTONOMOUS" : "NORMAL"}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  const pm = new PermissionManager();
  const results = {
    passed: [],
    failed: [],
    blocked: [],
    stats: {
      total: 0,
      auto: 0,
      cached: 0,
      blocked: 0,
    },
  };

  // Define batch operations covering all whitelisted tools
  const operations = [
    // Helm operations (wildcards, 7 tools)
    { op: "query", tool: "helm:ideas-summary" },
    { op: "search", tool: "helm:pri-search" },
    { op: "query", tool: "helm:rl-pipeline" },
    { op: "query", tool: "helm:cic-status" },
    { op: "query", tool: "helm:credit-score" },
    { op: "query", tool: "helm:outreach-queue" },
    { op: "query", tool: "helm:revenue-pipeline" },

    // Idea operations (wildcards, 2 tools)
    { op: "capture", tool: "idea:capture" },
    { op: "list", tool: "idea:list-inbox" },

    // Git operations (5 tools)
    { op: "status", tool: "git:status" },
    { op: "log", tool: "git:log" },
    { op: "diff", tool: "git:diff" },
    { op: "show", tool: "git:show" },
    { op: "status", tool: "git:status" }, // Repeated to test cache
    { op: "log", tool: "git:log" },       // Repeated to test cache

    // NPM operations (7 tools)
    { op: "list", tool: "npm:list" },
    { op: "test", tool: "npm:test" },
    { op: "build", tool: "npm:build" },
    { op: "audit", tool: "npm:audit" },
    { op: "info", tool: "npm:info" },
    { op: "test", tool: "npm:test" },   // Repeated to test cache
    { op: "build", tool: "npm:build" },  // Repeated to test cache

    // Verification operations (3 tools)
    { op: "run", tool: "lint" },
    { op: "run", tool: "type-check" },
    { op: "run", tool: "validate" },
    { op: "run", tool: "lint" },         // Repeated to test cache

    // More diverse operations (15+ more)
    { op: "query", tool: "helm:ideas-summary" },
    { op: "search", tool: "helm:pri-search" },
    { op: "capture", tool: "idea:capture" },
    { op: "status", tool: "git:status" },
    { op: "list", tool: "npm:list" },
    { op: "run", tool: "lint" },
    { op: "query", tool: "helm:rl-pipeline" },
    { op: "search", tool: "helm:cic-status" },
    { op: "capture", tool: "idea:list-inbox" },
    { op: "diff", tool: "git:diff" },
    { op: "test", tool: "npm:test" },
    { op: "run", tool: "type-check" },
    { op: "query", tool: "helm:credit-score" },
    { op: "capture", tool: "idea:capture" },
    { op: "status", tool: "git:log" },
    { op: "list", tool: "npm:audit" },
    { op: "run", tool: "validate" },

    // Risky operations (should block in autonomous mode)
    { op: "push", tool: "git:push", expectBlock: true },
    { op: "publish", tool: "npm:publish", expectBlock: true },
  ];

  // Run all operations
  for (const { op, tool, expectBlock } of operations) {
    results.stats.total++;

    try {
      const result = pm.checkPermission(op, tool);

      if (result.autonomousDecision) {
        results.stats.auto++;
        results.passed.push({ tool, op, reason: result.reason, cached: false });
        pm.recordApproval(op, tool, true, result.reason);
      } else if (!result.requires) {
        // Auto-approved in normal mode (whitelisted or cached)
        if (result.reason === "cached") {
          results.stats.cached++;
        } else {
          results.stats.auto++;
        }
        results.passed.push({ tool, op, reason: result.reason, cached: result.reason === "cached" });
        pm.recordApproval(op, tool, true, result.reason);
      } else {
        // Requires approval
        results.failed.push({ tool, op, reason: result.reason });
      }
    } catch (error) {
      if (expectBlock && process.env.AUTONOMOUS_EXECUTION === "true") {
        results.stats.blocked++;
        results.blocked.push({ tool, op, reason: error.message.split("\n")[0] });
      } else {
        results.failed.push({ tool, op, reason: error.message });
      }
    }
  }

  // Report results
  console.log("📊 BATCH TEST RESULTS\n");
  console.log(`Total Operations: ${results.stats.total}`);
  console.log(`✅ Auto-Approved: ${results.stats.auto}`);
  console.log(`♻️  Cached: ${results.stats.cached}`);
  console.log(`⛔ Blocked (Expected): ${results.stats.blocked}`);
  console.log(`❌ Failed (Unexpected): ${results.failed.length}\n`);

  if (results.failed.length > 0) {
    console.log("❌ FAILED OPERATIONS:");
    for (const { tool, op, reason } of results.failed) {
      console.log(`   ${tool}:${op} — ${reason}`);
    }
    console.log();
  }

  if (results.blocked.length > 0) {
    console.log("⛔ BLOCKED OPERATIONS (Expected in Autonomous Mode):");
    for (const { tool, op } of results.blocked) {
      console.log(`   ${tool}:${op} — Correctly rejected in autonomous mode`);
    }
    console.log();
  }

  console.log("📈 APPROVAL SUMMARY:");
  const summary = pm.getSummary();
  console.log(`   Whitelist: ${summary.config.whitelistCount} tools`);
  console.log(`   Cache Size: ${summary.cacheSize} decisions`);
  console.log(`   Auto-Approval Rate: ${summary.autoApprovalRate}`);
  console.log(`   Cached Rate: ${summary.cachedApprovalRate}\n`);

  // Overall result
  const success = results.failed.length === 0;
  if (success) {
    console.log("✅ BATCH TEST PASSED — All whitelisted operations approved automatically");
    console.log("✅ No user approval interrupts needed\n");
  } else {
    console.log("❌ BATCH TEST FAILED — Some operations failed");
    console.log("Check failures above\n");
  }

  return success ? 0 : 1;
}

// Run the test
runBatchTest()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("❌ Test error:", err.message);
    process.exit(1);
  });
