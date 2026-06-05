#!/usr/bin/env node
// tools/mcp/idea-inbox.smoke-test.js
// Smoke test for idea-inbox MCP server
// Spawns the server process and sends JSON-RPC messages via stdin

import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "idea-inbox-server.js");

// ============================================================================
// SERVER & TEST RUNNER
// ============================================================================

let server;
let passed = 0;
let failed = 0;
let msgId = 0;
const pendingResponses = new Map();

function nextId() {
  return ++msgId;
}

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    const id = nextId();
    const timeoutHandle = setTimeout(() => {
      pendingResponses.delete(id);
      reject(new Error(`Timeout waiting for response to message ${id}`));
    }, 5000);

    pendingResponses.set(id, (response) => {
      clearTimeout(timeoutHandle);
      resolve(response);
    });

    server.stdin.write(JSON.stringify({ ...message, id }) + "\n");
  });
}

async function startServer() {
  return new Promise((resolve, reject) => {
    server = spawn("node", [serverPath], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let initialized = false;

    server.stdout.on("data", (data) => {
      const lines = data.toString().split("\n").filter(l => l.trim());
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          const { id } = response;
          if (id && pendingResponses.has(id)) {
            const resolve = pendingResponses.get(id);
            pendingResponses.delete(id);
            resolve(response);
          } else if (!initialized && response.result?.protocolVersion) {
            initialized = true;
          }
        } catch (e) {
          console.error("Failed to parse server response:", line);
        }
      }
    });

    server.stderr.on("data", (data) => {
      console.error("Server stderr:", data.toString());
    });

    server.on("error", reject);

    // Send initialize
    setTimeout(() => {
      server.stdin.write(JSON.stringify({ method: "initialize", params: {} }) + "\n");
      setTimeout(() => {
        if (initialized || server.exitCode === null) {
          resolve();
        } else {
          reject(new Error("Failed to initialize server"));
        }
      }, 100);
    }, 100);
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.kill();
      server.on("exit", resolve);
      setTimeout(resolve, 1000);
    } else {
      resolve();
    }
  });
}

// ============================================================================
// TESTS
// ============================================================================

const tests = [
  {
    name: "tools/list — returns all 10 tools",
    run: async () => {
      const response = await sendMessage({
        method: "tools/list",
        params: {}
      });

      if (!response.result || !response.result.tools) throw new Error("No tools returned");
      if (response.result.tools.length !== 10) throw new Error(`Expected 10 tools, got ${response.result.tools.length}`);
    }
  },
  {
    name: "idea:capture — basic capture",
    run: async () => {
      const response = await sendMessage({
        method: "tools/call",
        params: {
          name: "idea:capture",
          arguments: {
            title: "Test Idea #1",
            raw_content: "This is a test idea about performance improvements",
            source: "notes",
            captured_by: "test-suite"
          }
        }
      });

      if (response.error) throw new Error(response.error.message);
      const result = JSON.parse(response.result.text);
      if (!result.idea_id) throw new Error("No idea_id returned");
      if (result.status !== "new") throw new Error(`Status should be 'new', got ${result.status}`);
    }
  },
  {
    name: "idea:list-inbox — retrieves captured items",
    run: async () => {
      const response = await sendMessage({
        method: "tools/call",
        params: {
          name: "idea:list-inbox",
          arguments: { status: "new", limit: 100 }
        }
      });

      if (response.error) throw new Error(response.error.message);
      const result = JSON.parse(response.result.text);
      if (!Array.isArray(result)) throw new Error("Result should be array");
      if (result.length === 0) throw new Error("Should have at least 1 item");
    }
  },
  {
    name: "idea:capture — deduplication",
    run: async () => {
      const resp1 = await sendMessage({
        method: "tools/call",
        params: {
          name: "idea:capture",
          arguments: {
            title: "Duplicate Test",
            raw_content: "performance improvements for database queries",
            source: "notes",
            captured_by: "test-suite"
          }
        }
      });

      const result1 = JSON.parse(resp1.result.text);
      const firstId = result1.idea_id;

      const resp2 = await sendMessage({
        method: "tools/call",
        params: {
          name: "idea:capture",
          arguments: {
            title: "Duplicate Test 2",
            raw_content: "performance improvements for database queries",
            source: "notes",
            captured_by: "test-suite"
          }
        }
      });

      const result2 = JSON.parse(resp2.result.text);
      if (result2.status !== "duplicate") throw new Error(`Should be marked duplicate, got ${result2.status}`);
    }
  },
  {
    name: "idea:get-item — retrieves by id",
    run: async () => {
      const listResp = await sendMessage({
        method: "tools/call",
        params: {
          name: "idea:list-inbox",
          arguments: { status: "new", limit: 1 }
        }
      });

      const items = JSON.parse(listResp.result.text);
      if (items.length === 0) throw new Error("No items to test");

      const itemId = items[0].idea_id;
      const getResp = await sendMessage({
        method: "tools/call",
        params: {
          name: "idea:get-item",
          arguments: { idea_id: itemId }
        }
      });

      const result = JSON.parse(getResp.result.text);
      if (result.idea_id !== itemId) throw new Error("Retrieved wrong item");
    }
  },
  {
    name: "idea:list-pris — retrieves PRIs",
    run: async () => {
      const response = await sendMessage({
        method: "tools/call",
        params: {
          name: "idea:list-pris",
          arguments: { limit: 100 }
        }
      });

      if (response.error) throw new Error(response.error.message);
      const result = JSON.parse(response.result.text);
      if (!Array.isArray(result)) throw new Error("Result should be array");
    }
  },
  {
    name: "idea:update-status — updates inbox item",
    run: async () => {
      const listResp = await sendMessage({
        method: "tools/call",
        params: {
          name: "idea:list-inbox",
          arguments: { limit: 1 }
        }
      });

      const items = JSON.parse(listResp.result.text);
      if (items.length === 0) throw new Error("No items to update");

      const itemId = items[0].idea_id;
      const updateResp = await sendMessage({
        method: "tools/call",
        params: {
          name: "idea:update-status",
          arguments: {
            idea_id: itemId,
            status: "processing",
            reviewed_by: "test-suite",
            rationale: "Test update"
          }
        }
      });

      if (updateResp.error) throw new Error(updateResp.error.message);
      const result = JSON.parse(updateResp.result.text);
      if (result.status !== "processing") throw new Error(`Status not updated correctly`);
    }
  },
  {
    name: "idea:daily-digest — summarizes last 24h",
    run: async () => {
      const response = await sendMessage({
        method: "tools/call",
        params: {
          name: "idea:daily-digest",
          arguments: {}
        }
      });

      if (response.error) throw new Error(response.error.message);
      const result = JSON.parse(response.result.text);
      if (!result.period) throw new Error("No period in digest");
      if (typeof result.total !== "number") throw new Error("No total count");
    }
  },
  {
    name: "idea:config — reads config",
    run: async () => {
      const response = await sendMessage({
        method: "tools/call",
        params: {
          name: "idea:config",
          arguments: {}
        }
      });

      if (response.error) throw new Error(response.error.message);
      const result = JSON.parse(response.result.text);
      if (!result.harvest_threshold) throw new Error("No harvest_threshold");
      if (!result.model) throw new Error("No model");
    }
  },
  {
    name: "data persistence — inbox.json exists and is valid",
    run: async () => {
      const inboxPath = path.join(
        "C:\\dev\\rewrite-mcp",
        "data",
        "idea-inbox",
        "inbox.json"
      );

      if (!fs.existsSync(inboxPath)) throw new Error("inbox.json not found");

      const content = fs.readFileSync(inboxPath, "utf8");
      const data = JSON.parse(content);

      if (!Array.isArray(data)) throw new Error("inbox.json should be array");
    }
  },
  {
    name: "data persistence — audit.log exists and is valid NDJSON",
    run: async () => {
      const auditPath = path.join(
        "C:\\dev\\rewrite-mcp",
        "data",
        "idea-inbox",
        "audit.log"
      );

      if (!fs.existsSync(auditPath)) throw new Error("audit.log not found");

      const content = fs.readFileSync(auditPath, "utf8");
      if (content.trim().length === 0) throw new Error("audit.log is empty");

      // Verify each line is valid JSON
      const lines = content.trim().split("\n");
      for (const line of lines) {
        try {
          JSON.parse(line);
        } catch (e) {
          throw new Error(`Invalid JSON in audit.log: ${line}`);
        }
      }
    }
  },
  {
    name: "config file — config.json has required fields",
    run: async () => {
      const configPath = path.join(
        "C:\\dev\\rewrite-mcp",
        "data",
        "idea-inbox",
        "config.json"
      );

      if (!fs.existsSync(configPath)) throw new Error("config.json not found");

      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

      const required = [
        "harvest_threshold",
        "escalation_confidence",
        "dedup_similarity",
        "batch_size",
        "max_pris_per_day",
        "model"
      ];

      for (const field of required) {
        if (!(field in config)) throw new Error(`Missing field: ${field}`);
      }
    }
  }
];

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  console.log("\n=== IDEA-INBOX MCP SMOKE TEST ===\n");

  // Clean data directory before test
  const dataDir = path.join("C:\\dev\\rewrite-mcp", "data", "idea-inbox");
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  try {
    await startServer();
    console.log("✓ Server started\n");
  } catch (e) {
    console.error("❌ Failed to start server:", e.message);
    process.exit(1);
  }

  for (const test of tests) {
    try {
      await test.run();
      console.log(`✅ ${test.name}`);
      passed++;
    } catch (e) {
      console.log(`❌ ${test.name}`);
      console.log(`   Error: ${e.message}\n`);
      failed++;
    }
  }

  await stopServer();

  console.log(`\n=== RESULTS ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${tests.length}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch((e) => {
  console.error("Test suite error:", e.message);
  stopServer().then(() => process.exit(1));
});
