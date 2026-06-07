#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { sessionWrap } from "../../skills/session-wrap/index.js";

const server = new McpServer({
  name: "session-wrap",
  version: "1.0.0"
});

// Input schema for session-wrap tool
const SessionWrapInputSchema = z.object({
  commitMessage: z.string().describe(
    "Git commit message with [tool] prefix (e.g., '[claude] Phase 47: Description')"
  ),
  summary: z.string().optional().describe("Session summary text"),
  docUpdates: z
    .array(
      z.object({
        path: z.string().describe("File path to update"),
        content: z.string().describe("File content")
      })
    )
    .optional()
    .describe("Documentation files to update")
});

// Register the session-wrap tool
server.registerTool(
  "session_wrap",
  {
    title: "Session Wrap",
    description:
      "Wrap up session: update documentation, stage changes, commit with [tool] prefix, generate report and next steps",
    inputSchema: SessionWrapInputSchema
  },
  async (input) => {
    try {
      const result = await sessionWrap({
        commitMessage: input.commitMessage,
        summary: input.summary,
        docUpdates: input.docUpdates || []
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: error.message
              },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
