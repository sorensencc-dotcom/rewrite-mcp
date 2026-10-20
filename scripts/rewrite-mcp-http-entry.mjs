import { createMcpHandler, localhostAllowedOrigins, McpServer, originValidationResponse } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const zodEntry = require.resolve("zod", {
  paths: [path.dirname(require.resolve("@modelcontextprotocol/server"))],
});
const { z } = await import(pathToFileURL(zodEntry).href);

const HANDSHAKE_VERSIONS = new Set(["2024-11-05", "2025-03-26", "2025-06-18", "2025-11-25"]);
const MAX_BODY = 4194304;

export const handler = createMcpHandler(() => {
  const server = new McpServer({ name: "rewrite-mcp", version: "0.0.0" });
  server.registerTool(
    "search_kb",
    {
      description: "Search the knowledge base",
      inputSchema: z.object({ query: z.string() }),
    },
    async ({ query }) => ({
      content: [{ type: "text", text: String(query) }],
    }),
  );
  return server;
});

function unsupportedVersion(version) {
  const payload = JSON.stringify({
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32022,
      message: "Unsupported protocol version",
      data: { supported: ["2026-07-28"], requested: version },
    },
  });
  return new Response(payload, {
    status: 400,
    headers: { "content-type": "application/json" },
  });
}

export async function mountedFetch(request) {
  const pathName = new URL(request.url).pathname;
  const length = request.headers.get("content-length");
  const oversized = length !== null && Number(length) > MAX_BODY;
  if (pathName === "/mcp" && !oversized) {
    const version = request.headers.get("mcp-protocol-version");
    if (request.method === "GET") {
      return new Response(null, { status: 405, headers: { allow: "POST" } });
    }
    if (request.method === "POST" && HANDSHAKE_VERSIONS.has(version)) {
      return unsupportedVersion(version);
    }
  }
  const rejected = originValidationResponse(request, localhostAllowedOrigins());
  if (rejected) return rejected;
  return handler.fetch(request);
}

export function createHttpServer() {
  const nodeHandler = toNodeHandler({ fetch: mountedFetch });
  return http.createServer((req, res) => {
    nodeHandler(req, res);
  });
}

const entryUrl = pathToFileURL(path.resolve(process.argv[1] || "")).href;
if (entryUrl === import.meta.url) {
  const port = Number(process.env.REWRITE_MCP_HTTP_PORT || 8769);
  const server = createHttpServer();
  server.listen(port, "127.0.0.1", () => {
    console.log(`rewrite-mcp HTTP entry http://127.0.0.1:${port}/mcp`);
  });
}
