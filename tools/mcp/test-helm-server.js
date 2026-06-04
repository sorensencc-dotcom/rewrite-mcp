#!/usr/bin/env node

/**
 * Test script for Helm MCP Server
 * Simulates Claude Desktop calling the tools
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function runTest(name, message) {
  return new Promise((resolve) => {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`TEST: ${name}`);
    console.log(`${"=".repeat(60)}`);

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
        console.log("[Server Response]:", line);
      }
    });

    server.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    setTimeout(() => {
      console.log("[Client Request]:", JSON.stringify(message, null, 2));
      server.stdin.write(JSON.stringify(message) + "\n");

      setTimeout(() => {
        server.kill();
        resolve(output);
      }, 500);
    }, 200);
  });
}

async function runTests() {
  console.log("🧪 Helm MCP Server Test Suite");
  console.log("Testing Phase 4 & 5 Implementation");

  // Test 1: Initialize
  await runTest("Initialize Server", {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    },
  });

  // Test 2: Get today's costs
  await runTest("Get Today's Costs (helm:today)", {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "helm:today", arguments: {} },
  });

  // Test 3: Costs alias
  await runTest("Get Costs via alias", {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "costs", arguments: { breakdown: true } },
  });

  // Test 4: Get trends
  await runTest("Get Cost Trends", {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { name: "helm:trends", arguments: {} },
  });

  // Test 5: Get routing status
  await runTest("Get Routing Status", {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "routing", arguments: {} },
  });

  // Test 6: Set routing preference (Phase 5)
  await runTest("Set Routing Preference (Phase 5)", {
    jsonrpc: "2.0",
    id: 6,
    method: "tools/call",
    params: {
      name: "routing",
      arguments: { set: "rewrite:haiku" },
    },
  });

  // Test 7: Get budget warning
  await runTest("Get Budget Warning", {
    jsonrpc: "2.0",
    id: 7,
    method: "tools/call",
    params: { name: "budget", arguments: {} },
  });

  // Test 8: List tools
  await runTest("List Available Tools", {
    jsonrpc: "2.0",
    id: 8,
    method: "tools/list",
    params: {},
  });

  console.log("\n✅ All tests completed!");
}

runTests().catch(console.error);
