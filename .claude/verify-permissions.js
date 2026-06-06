#!/usr/bin/env node

/**
 * Verification Script: Permission Manager Integration
 *
 * Tests that helm-server.js permission manager is working:
 * 1. Whitelisted tools execute without permission error
 * 2. Non-whitelisted tools are blocked with permission error
 * 3. Approval decisions are recorded in cache
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let testsPassed = 0;
let testsFailed = 0;

function log(msg) {
  console.log(`\n${msg}`);
}

function pass(msg) {
  testsPassed++;
  console.log(`✅ ${msg}`);
}

function fail(msg) {
  testsFailed++;
  console.log(`❌ ${msg}`);
}

function info(msg) {
  console.log(`   ${msg}`);
}

/**
 * Start helm-server and test permission manager
 */
async function runTests() {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 PERMISSION MANAGER VERIFICATION");
  console.log("=".repeat(70));

  const serverPath = path.resolve(__dirname, "../tools/mcp/helm-server.js");

  if (!fs.existsSync(serverPath)) {
    fail(`helm-server.js not found at ${serverPath}`);
    return;
  }

  log("Starting helm-server.js...");

  const server = spawn("node", [serverPath], {
    cwd: path.resolve(__dirname, "../"),
    stdio: ["pipe", "pipe", "pipe"],
  });

  let serverOutput = "";
  let testResults = {
    whitelistedToolSuccess: false,
    nonWhitelistedToolBlocked: false,
    cacheUpdated: false,
  };

  return new Promise((resolve) => {
    server.stderr.on("data", (data) => {
      serverOutput += data.toString();
    });

    // Give server time to start and initialize
    setTimeout(() => {
      log("Running tests...\n");

      // Test 1: Whitelisted tool (helm:ideas-summary)
      const whitelistTest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "helm:ideas-summary",
          arguments: {},
        },
        id: 1,
      };

      info("Test 1: Calling whitelisted tool (helm:ideas-summary)");
      server.stdin.write(JSON.stringify(whitelistTest) + "\n");

      // Test 2: Non-whitelisted tool (npm:deploy)
      setTimeout(() => {
        const nonWhitelistTest = {
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: "npm:deploy",
            arguments: {},
          },
          id: 2,
        };

        info("Test 2: Calling non-whitelisted tool (npm:deploy)");
        server.stdin.write(JSON.stringify(nonWhitelistTest) + "\n");
      }, 500);

      // Collect stdout responses
      let responseCount = 0;
      server.stdout.on("data", (data) => {
        const line = data.toString().trim();
        if (!line) return;

        try {
          const response = JSON.parse(line);

          if (response.id === 1) {
            // Test 1 response (whitelisted tool)
            info("→ Whitelisted tool response received");

            if (response.result) {
              pass("Whitelisted tool executed without permission error");
              testResults.whitelistedToolSuccess = true;
              info(`  Result type: ${response.result.type}`);
              if (response.result.text) {
                info(`  Response: ${response.result.text.substring(0, 100)}...`);
              }
            } else if (response.error) {
              fail(
                `Whitelisted tool blocked: ${response.error.message}`
              );
            }
            responseCount++;
          } else if (response.id === 2) {
            // Test 2 response (non-whitelisted tool)
            info("→ Non-whitelisted tool response received");

            if (response.error) {
              const errorMsg = response.error.message;
              if (errorMsg.includes("Permission required")) {
                pass("Non-whitelisted tool blocked with permission error");
                testResults.nonWhitelistedToolBlocked = true;
                info(`  Error: ${errorMsg}`);
              } else {
                fail(
                  `Non-whitelisted tool blocked but with wrong error: ${errorMsg}`
                );
              }
            } else if (response.result) {
              fail(
                "Non-whitelisted tool should be blocked but executed instead"
              );
            }
            responseCount++;
          }

          // After both responses, check cache and stop
          if (responseCount === 2) {
            setTimeout(() => {
              checkApprovalCache();
              server.kill();
              printSummary();
              resolve();
            }, 500);
          }
        } catch (e) {
          info(`Failed to parse response: ${line}`);
        }
      });

      server.on("error", (err) => {
        fail(`Server error: ${err.message}`);
        printSummary();
        resolve();
      });
    }, 1000);

    /**
     * Check if approval-cache.json was updated with our calls
     */
    function checkApprovalCache() {
      log("\nChecking approval cache...\n");

      const cachePath = path.resolve(
        __dirname,
        "../skills-runtime/approval-cache.json"
      );

      if (!fs.existsSync(cachePath)) {
        fail("approval-cache.json not found");
        return;
      }

      try {
        const cache = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
        info(`Cache file exists with ${Object.keys(cache.approvals || {}).length} entries`);

        // Look for our test operations in cache
        const approvals = cache.approvals || {};
        const hasWhitelistedEntry = Object.values(approvals).some(
          (entry) =>
            entry.tool === "helm:ideas-summary" &&
            entry.reason === "whitelisted"
        );
        const hasNonWhitelistedEntry = Object.values(approvals).some(
          (entry) =>
            entry.tool === "npm:deploy" && entry.reason === "default"
        );

        if (hasWhitelistedEntry) {
          pass("Whitelisted tool recorded in cache with reason='whitelisted'");
          testResults.cacheUpdated = true;
          info(
            `  Entry: ${JSON.stringify(
              Object.values(approvals).find(
                (e) => e.tool === "helm:ideas-summary"
              ),
              null,
              2
            ).substring(0, 100)}...`
          );
        } else {
          fail("Whitelisted tool not found in approval cache");
        }

        if (hasNonWhitelistedEntry) {
          info("Non-whitelisted tool recorded in cache");
        } else {
          info("Non-whitelisted tool not in cache (expected, was blocked)");
        }
      } catch (e) {
        fail(`Failed to read approval cache: ${e.message}`);
      }
    }

    /**
     * Print final summary
     */
    function printSummary() {
      console.log("\n" + "=".repeat(70));
      console.log("📊 TEST SUMMARY");
      console.log("=".repeat(70));

      console.log(`\n✅ Passed: ${testsPassed}`);
      console.log(`❌ Failed: ${testsFailed}`);

      const total = testsPassed + testsFailed;
      const passRate = ((testsPassed / total) * 100).toFixed(1);
      console.log(`📈 Pass rate: ${passRate}%`);

      console.log("\n🎯 VERDICT:");
      if (testsFailed === 0) {
        console.log("  ✅ PASS — Permission manager is working correctly");
        console.log("     - Whitelisted tools execute without permission errors");
        console.log("     - Non-whitelisted tools are blocked");
        console.log("     - Approval decisions are recorded in cache");
      } else {
        console.log(`  ❌ FAIL — ${testsFailed} test(s) failed`);
      }

      console.log("\n" + "=".repeat(70) + "\n");
    }
  });
}

// Run tests
runTests().catch((err) => {
  console.error(`Test error: ${err.message}`);
  process.exit(1);
});
