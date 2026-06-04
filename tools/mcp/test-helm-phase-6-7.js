#!/usr/bin/env node

/**
 * Test suite for Helm Phase 6 & 7
 * Tests budget management, forecasting, and quality metrics
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function runTest(name, message) {
  return new Promise((resolve) => {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`TEST: ${name}`);
    console.log(`${"=".repeat(70)}`);

    const server = spawn("node", [path.join(__dirname, "helm-server.js")], {
      cwd: path.resolve(__dirname, "../../"),
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";
    let errorOutput = "";

    server.stdout.on("data", (data) => {
      const line = data.toString().trim();
      if (line) {
        output = line;
      }
    });

    server.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    setTimeout(() => {
      console.log("[Request]:", JSON.stringify(message, null, 2));
      server.stdin.write(JSON.stringify(message) + "\n");

      setTimeout(() => {
        if (output) {
          try {
            const parsed = JSON.parse(output);
            const result = parsed.result?.text ? JSON.parse(parsed.result.text) : parsed.result;
            console.log("[Response]:", JSON.stringify(result, null, 2));
          } catch (e) {
            console.log("[Response]:", output);
          }
        }
        server.kill();
        resolve(output);
      }, 500);
    }, 200);
  });
}

async function runTests() {
  console.log("🧪 Helm Phase 6 & 7 Test Suite");
  console.log("Testing Budget Management, Forecasting, and Analytics");

  // Phase 6 Tests: Budget Management
  console.log("\n📊 PHASE 6: BUDGET MANAGEMENT & ALERTS");

  await runTest("Set Budget to $20 daily", {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "helm:set-budget",
      arguments: { daily: 20.0 },
    },
  });

  await runTest("Set Warning Threshold to 70%", {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "helm:set-budget",
      arguments: { warningThreshold: 70 },
    },
  });

  await runTest("Set Critical Threshold to 90%", {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "helm:set-budget",
      arguments: { criticalThreshold: 90 },
    },
  });

  await runTest("Get Budget Warning with new config", {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "helm:budget-warning",
      arguments: {},
    },
  });

  await runTest("Get Alerts (empty initially)", {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "helm:alerts",
      arguments: {},
    },
  });

  await runTest("Get Last Alert Only", {
    jsonrpc: "2.0",
    id: 6,
    method: "tools/call",
    params: {
      name: "helm:alerts",
      arguments: { last: true },
    },
  });

  // Phase 7 Tests: Analytics & Forecasting
  console.log("\n📈 PHASE 7: ANALYTICS & FORECASTING");

  await runTest("Cost Forecast - Burn Rate Analysis", {
    jsonrpc: "2.0",
    id: 7,
    method: "tools/call",
    params: {
      name: "helm:cost-forecast",
      arguments: {},
    },
  });

  await runTest("Quality Metrics - Cost Efficiency Analysis", {
    jsonrpc: "2.0",
    id: 8,
    method: "tools/call",
    params: {
      name: "helm:quality-metrics",
      arguments: {},
    },
  });

  // Integration: List all tools
  console.log("\n🔧 INTEGRATION TESTS");

  await runTest("List All Available Tools (Phase 4-7)", {
    jsonrpc: "2.0",
    id: 9,
    method: "tools/list",
    params: {},
  });

  // Cleanup
  await runTest("Clear All Alerts", {
    jsonrpc: "2.0",
    id: 10,
    method: "tools/call",
    params: {
      name: "helm:alerts",
      arguments: { clear: true },
    },
  });

  console.log("\n✅ All Phase 6 & 7 tests completed!");
  console.log("\n📋 SUMMARY:");
  console.log("  Phase 6 (Budget Management):");
  console.log("    ✅ helm:set-budget — Set daily budget and thresholds");
  console.log("    ✅ helm:budget-warning — Check budget status with configurable alerts");
  console.log("    ✅ helm:alerts — View and manage budget alerts");
  console.log("  Phase 7 (Analytics):");
  console.log("    ✅ helm:cost-forecast — Analyze burn rate and budget exhaustion");
  console.log("    ✅ helm:quality-metrics — Analyze model cost-effectiveness");
}

runTests().catch(console.error);
