import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const stdioServerEntries = [
  "projects/cic/ingestion/mcp-servers/executive-intelligence-engine/src/server.js",
  "services/torquequery-mcp/src/index.ts",
  "skills-runtime/mcp-server-client.js",
  "tools/mcp/portfolio-mcp.js",
  "tools/mcp/session-wrap-server.js",
  "tools/mcp/skills-runtime-server.js",
];

const skipDirs = new Set(["node_modules", "dist", ".git", "coverage"]);

function sdkServerEntryImports() {
  const hits = [];
  const pattern = /@modelcontextprotocol\/sdk\/server(?:\/|['"])/;
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skipDirs.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(mjs|cjs|js|ts|tsx)$/.test(entry.name)) continue;
      const text = fs.readFileSync(full, "utf8");
      if (pattern.test(text)) hits.push(path.relative(root, full).replaceAll("\\", "/"));
    }
  }
  walk(root);
  hits.sort();
  return hits;
}

test("stdio routes keep their sdk server imports", () => {
  assert.deepEqual(sdkServerEntryImports(), stdioServerEntries);
});

test("root depends on @modelcontextprotocol/server and not the sdk", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.equal(deps["@modelcontextprotocol/server"], "2.3.1");
  assert.equal(Object.hasOwn(deps, "@modelcontextprotocol/sdk"), false);
  assert.equal(Object.hasOwn(deps, "@modelcontextprotocol/node"), false);
  assert.equal(pkg.scripts["mcp:http"], undefined);
});

test("createMcpHandler answers server/discover without listening", async () => {
  const handler = createMcpHandler(() => new McpServer({
    name: "rewrite-mcp-mcp-package",
    version: "0.0.0",
  }));
  const response = await handler.fetch(new Request("http://127.0.0.1/mcp", {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "mcp-protocol-version": "2026-07-28",
      "mcp-method": "server/discover",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "server/discover",
      params: {
        _meta: {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
          "io.modelcontextprotocol/clientInfo": { name: "rewrite-mcp-mcp-package", version: "0.0.0" },
          "io.modelcontextprotocol/clientCapabilities": {},
        },
      },
    }),
  }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.result.resultType, "complete");
  assert.equal(body.result.supportedVersions.includes("2026-07-28"), true);
  await handler.close();
});
