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

export async function mountedFetch(request) {
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
