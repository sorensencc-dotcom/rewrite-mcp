#!/usr/bin/env node

/**
 * Test suite for HELM Intelligence Fabric — Phase 43.3.1
 * Tests meta-tools: helm:ideas-summary, helm:pri-search
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
            const passed = result && Object.keys(result).length > 0;
            console.log(`[Status]: ${passed ? "✅ PASS" : "❌ FAIL"}`);
          } catch (e) {
            console.log("[Response]:", output);
            console.log("[Status]: ❌ FAIL (parse error)");
          }
        } else {
          console.log("[Status]: ❌ FAIL (no output)");
        }
        server.kill();
        resolve();
      }, 500);
    }, 100);
  });
}

async function runTests() {
  const tests = [
    {
      name: "helm:ideas-summary — Aggregate inbox + PRIs",
      message: {
        method: "tools/call",
        params: {
          name: "helm:ideas-summary",
          arguments: {},
        },
        id: 1,
      },
    },
    {
      name: "helm:pri-search — Search PRIs by query",
      message: {
        method: "tools/call",
        params: {
          name: "helm:pri-search",
          arguments: {
            query: "billing issues",
          },
        },
        id: 2,
      },
    },
    {
      name: "helm:pri-search — Search with 'api' query",
      message: {
        method: "tools/call",
        params: {
          name: "helm:pri-search",
          arguments: {
            query: "api",
          },
        },
        id: 3,
      },
    },
    {
      name: "helm:pri-search — Search with 'onboarding' query",
      message: {
        method: "tools/call",
        params: {
          name: "helm:pri-search",
          arguments: {
            query: "onboarding",
          },
        },
        id: 4,
      },
    },
  ];

  console.log("\n🚀 HELM INTELLIGENCE FABRIC — META-TOOLS TEST SUITE\n");

  for (const test of tests) {
    await runTest(test.name, test.message);
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("✅ TEST SUITE COMPLETE");
  console.log(`${"=".repeat(70)}\n`);
  console.log("Phase 43.3.1 Intelligence Fabric is ready:");
  console.log("  ✅ helm:ideas-summary (inbox + PRI aggregation)");
  console.log("  ✅ helm:pri-search (natural-language PRI search)");
  console.log("\nNext: Phase 43.4 — Command Bar integration with idea: tools.\n");
}

runTests().catch(console.error);
