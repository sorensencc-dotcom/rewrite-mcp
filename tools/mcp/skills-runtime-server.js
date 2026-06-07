#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SkillMcpServer } from "../../skills-runtime/mcp-server.js";

// Initialize skill runtime MCP server
const skillServer = new SkillMcpServer();

const server = new McpServer({
  name: "skill-runtime",
  version: "1.0.0"
});

// Convert JSON schema to Zod schema
function jsonSchemaToZod(schema) {
  const properties = schema.properties || {};
  const required = schema.required || [];

  const shape = {};
  for (const [key, prop] of Object.entries(properties)) {
    if (prop.type === "string") {
      shape[key] = z.string().describe(prop.description || "");
    } else if (prop.type === "array") {
      shape[key] = z.array(z.object({
        path: z.string(),
        content: z.string()
      })).optional().describe(prop.description || "");
    } else if (prop.type === "object") {
      shape[key] = z.object({}).describe(prop.description || "");
    } else {
      shape[key] = z.any();
    }
  }

  const zodSchema = z.object(shape);
  return zodSchema;
}

// Register all skill tools from skill-tool-config.json
const tools = skillServer.getTools();
tools.forEach(tool => {
  const zodSchema = jsonSchemaToZod(tool.inputSchema);

  server.registerTool(
    tool.name,
    {
      title: tool.name,
      description: tool.description,
      inputSchema: zodSchema
    },
    async (input) => {
      try {
        return await skillServer.executeTool(tool.name, input);
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: error.message
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    }
  );
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
