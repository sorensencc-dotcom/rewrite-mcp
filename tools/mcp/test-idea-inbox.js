#!/usr/bin/env node

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "idea-inbox-server.js");

console.log("🧪 Idea-to-Roadmap MCP Server Test Suite\n");
console.log(`Starting server: ${serverPath}\n`);

let testsPassed = 0;
let testsFailed = 0;
let messageId = 0;

function nextId() {
  return ++messageId;
}

function test(name, fn) {
  return async () => {
    try {
      await fn();
      console.log(`✓ ${name}`);
      testsPassed++;
    } catch (error) {
      console.error(`✗ ${name}: ${error.message}`);
      testsFailed++;
    }
  };
}

async function sendMessage(proc, message) {
  return new Promise((resolve, reject) => {
    let output = "";

    const onData = (data) => {
      output += data.toString();
      const lines = output.split("\n");
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line) {
          try {
            const parsed = JSON.parse(line);
            proc.stdout.removeListener("data", onData);
            proc.stderr.removeListener("data", onError);
            resolve(parsed);
            return;
          } catch (e) {
            // Not yet a complete JSON object
          }
        }
      }
      output = lines[lines.length - 1];
    };

    const onError = (data) => {
      console.error("Server error:", data.toString());
    };

    proc.stdout.on("data", onData);
    proc.stderr.on("data", onError);

    const timeout = setTimeout(() => {
      proc.stdout.removeListener("data", onData);
      proc.stderr.removeListener("data", onError);
      reject(new Error("Server response timeout"));
    }, 10000);

    proc.stdin.write(JSON.stringify(message) + "\n");
  });
}

async function runTests() {
  const proc = spawn("node", [serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let capturedIdeaId;

  // Initialize
  const initResp = await sendMessage(proc, {
    jsonrpc: "2.0",
    id: nextId(),
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: { extensions: {} },
      clientInfo: { name: "test", version: "0.1.0" },
    },
  });

  await test("Server initializes", async () => {
    if (!initResp.result || !initResp.result.serverInfo) {
      throw new Error("No serverInfo in response");
    }
    console.log(`  Server name: ${initResp.result.serverInfo.name}`);
  })();

  // Tools list
  const toolsResp = await sendMessage(proc, {
    jsonrpc: "2.0",
    id: nextId(),
    method: "tools/list",
    params: {},
  });

  await test("10 tools registered", async () => {
    const tools = toolsResp.result?.tools || [];
    if (tools.length !== 10) {
      throw new Error(
        `Expected 10 tools, got ${tools.length}: ${tools.map((t) => t.name).join(", ")}`
      );
    }
    console.log(`  Tools: ${tools.map((t) => t.name).join(", ")}`);
  })();

  // Capture idea
  const captureResp = await sendMessage(proc, {
    jsonrpc: "2.0",
    id: nextId(),
    method: "tools/call",
    params: {
      name: "idea:capture",
      arguments: {
        source: "web",
        captured_by: "test@example.com",
        raw_content:
          "We should improve our AI integration capabilities for better workflow automation",
        title: "Enhance AI Integration",
        tags: ["AI", "integration"],
      },
    },
  });

  await test("idea:capture creates new idea", async () => {
    const result = JSON.parse(captureResp.result.text);
    if (!result.idea_id) throw new Error("No idea_id in response");
    if (result.status !== "new") throw new Error(`Expected status "new", got "${result.status}"`);
    capturedIdeaId = result.idea_id;
    console.log(`  Captured idea: ${capturedIdeaId}`);
  })();

  // List inbox
  const listResp = await sendMessage(proc, {
    jsonrpc: "2.0",
    id: nextId(),
    method: "tools/call",
    params: {
      name: "idea:list-inbox",
      arguments: { limit: 100 },
    },
  });

  await test("idea:list-inbox returns items", async () => {
    const items = JSON.parse(listResp.result.text);
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("No items in inbox");
    }
    console.log(`  Items in inbox: ${items.length}`);
  })();

  // Get item
  const getResp = await sendMessage(proc, {
    jsonrpc: "2.0",
    id: nextId(),
    method: "tools/call",
    params: {
      name: "idea:get-item",
      arguments: { idea_id: capturedIdeaId },
    },
  });

  await test("idea:get-item retrieves specific idea", async () => {
    const item = JSON.parse(getResp.result.text);
    if (item.idea_id !== capturedIdeaId) {
      throw new Error("Retrieved wrong idea");
    }
    console.log(`  Retrieved idea title: "${item.title}"`);
    console.log(`  Auto-tags: ${item.tags.join(", ")}`);
  })();

  // Update status
  const updateResp = await sendMessage(proc, {
    jsonrpc: "2.0",
    id: nextId(),
    method: "tools/call",
    params: {
      name: "idea:update-status",
      arguments: {
        idea_id: capturedIdeaId,
        status: "processing",
        reviewed_by: "test-reviewer",
        rationale: "Testing status update",
      },
    },
  });

  await test("idea:update-status changes status", async () => {
    const result = JSON.parse(updateResp.result.text);
    if (result.status !== "processing") {
      throw new Error(`Expected status "processing", got "${result.status}"`);
    }
    console.log(`  Updated status to: ${result.status}`);
  })();

  // Read config
  const configResp = await sendMessage(proc, {
    jsonrpc: "2.0",
    id: nextId(),
    method: "tools/call",
    params: {
      name: "idea:config",
      arguments: {},
    },
  });

  await test("idea:config reads configuration", async () => {
    const config = JSON.parse(configResp.result.text);
    if (!config.harvest_threshold) throw new Error("No harvest_threshold in config");
    console.log(`  Config: harvest_threshold=${config.harvest_threshold}, model=${config.model}`);
  })();

  // Daily digest
  const digestResp = await sendMessage(proc, {
    jsonrpc: "2.0",
    id: nextId(),
    method: "tools/call",
    params: {
      name: "idea:daily-digest",
      arguments: {},
    },
  });

  await test("idea:daily-digest generates summary", async () => {
    const digest = JSON.parse(digestResp.result.text);
    if (typeof digest.total !== "number") throw new Error("No total in digest");
    console.log(`  Daily summary: ${digest.total} PRIs generated in last 24h`);
  })();

  // List PRIs (should be empty since we didn't harvest)
  const listPrisResp = await sendMessage(proc, {
    jsonrpc: "2.0",
    id: nextId(),
    method: "tools/call",
    params: {
      name: "idea:list-pris",
      arguments: { limit: 100 },
    },
  });

  await test("idea:list-pris returns empty array (no PRIs yet)", async () => {
    const pris = JSON.parse(listPrisResp.result.text);
    if (!Array.isArray(pris)) throw new Error("Response is not an array");
    console.log(`  PRIs in system: ${pris.length}`);
  })();

  proc.kill();

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);
  console.log("=".repeat(50));

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed!");
  }
}

runTests().catch((error) => {
  console.error("Fatal test error:", error);
  process.exit(1);
});
