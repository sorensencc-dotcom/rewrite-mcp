#!/usr/bin/env node

// MCP Server Client — Skill Runtime for Claude Code
// Launches the Skill Runtime as an MCP server

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  StdioServerTransport
} from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { mcpServer } from "./mcp-server.js";

// Initialize MCP server with tools capability
const server = new Server({
  name: "skill-runtime",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

// Handle ListTools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: mcpServer.getTools()
  };
});

// Handle CallTool request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: toolInput } = request.params;

    // Execute tool via skill runtime
    const result = await mcpServer.executeTool(name, toolInput);

    return result;
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: true,
              message: error?.message || String(error),
              type: error?.name || "Error"
            },
            null,
            2
          )
        }
      ],
      isError: true
    };
  }
});

// Start server on stdio
const transport = new StdioServerTransport();
await server.connect(transport);

console.error("[skill-runtime] Server started on stdio");
