/**
 * Test for MCP parameter serialization fix
 * Verifies that array parameters (like diagnostics checks) are properly preserved
 */

import { describe, it, expect, beforeEach } from "vitest";
import FlowOrchestrator, { AgentClient } from "../src/ruflo-orchestration/FlowOrchestrator.js";
import FlowRegistry from "../src/ruflo-orchestration/FlowRegistry.js";

describe("MCP Parameter Serialization", () => {
  let orchestrator: FlowOrchestrator;
  let registry: FlowRegistry;
  let capturedInputs: Record<string, unknown[]> = {};

  const mockDiagnosticsAgent: AgentClient = {
    async invoke(method: string, input: Record<string, unknown>) {
      // Capture the input to verify it has the correct type
      capturedInputs[method] = input as Record<string, unknown>[];
      return {
        result: "diagnostics completed",
        checksType: typeof input.checks,
        checksIsArray: Array.isArray(input.checks),
        checksValue: input.checks,
      };
    },
  };

  beforeEach(() => {
    registry = new FlowRegistry();
    orchestrator = new FlowOrchestrator({
      registry,
      agents: {
        "mcp-diagnostics": mockDiagnosticsAgent,
        "code-analyzer": {
          async invoke() {
            return { result: "analysis done" };
          },
        },
        "call-graph-extractor": {
          async invoke() {
            return { result: "graph done" };
          },
        },
        "narrative-linker": {
          async invoke() {
            return { result: "narrative done" };
          },
        },
        "context-synthesizer": {
          async invoke() {
            return { result: "synthesis done" };
          },
        },
      },
    });
  });

  it("should preserve array types in single template variable substitution", async () => {
    // Create a flow template that passes array parameters
    const customFlow: any = {
      id: "test-array-param-flow",
      version: "1.0.0",
      description: "Test array parameter preservation",
      status: "active",
      stages: [
        {
          id: "stage-diagnostics",
          name: "Run Diagnostics",
          type: "serial",
          agents: [
            {
              agent: "mcp-diagnostics",
              method: "cic.diagnose",
              input: { checks: "{{input.checks}}" }, // Single template variable
              timeout_ms: 5000,
            },
          ],
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner: "test",
    };

    registry.registerTemplate(customFlow);

    // Execute the flow with array input
    const executionId = await orchestrator.executeFlow(
      "test-array-param-flow",
      {
        checks: ["node", "typescript", "docker"],
      },
      "trace-test-123"
    );

    // Wait for execution to complete
    const execution = await orchestrator.waitForExecution(executionId, 5000);

    expect(execution.status).toBe("completed");

    // Verify that the checks parameter was passed as an array, not a string
    const diagnosticsOutput = execution.output?.["stage-diagnostics"] as Record<
      string,
      unknown
    >;
    expect(diagnosticsOutput).toBeDefined();
    expect(diagnosticsOutput["mcp-diagnostics"]).toBeDefined();

    const result = diagnosticsOutput["mcp-diagnostics"] as Record<string, unknown>;
    expect(result.checksIsArray).toBe(true);
    expect(result.checksType).toBe("object");
    expect(Array.isArray(result.checksValue)).toBe(true);
  });

  it("should handle nested objects in flow parameters", async () => {
    const customFlow: any = {
      id: "test-nested-object-flow",
      version: "1.0.0",
      description: "Test nested object parameter",
      status: "active",
      stages: [
        {
          id: "stage-diagnostics",
          name: "Run Diagnostics",
          type: "serial",
          agents: [
            {
              agent: "mcp-diagnostics",
              method: "cic.diagnose",
              input: { checks: "{{input.checks}}" },
              timeout_ms: 5000,
            },
          ],
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner: "test",
    };

    registry.registerTemplate(customFlow);

    const executionId = await orchestrator.executeFlow(
      "test-nested-object-flow",
      {
        checks: ["node", "docker", "qdrant"],
      },
      "trace-test-456"
    );

    const execution = await orchestrator.waitForExecution(executionId, 5000);
    expect(execution.status).toBe("completed");

    const diagnosticsOutput = execution.output?.["stage-diagnostics"] as Record<
      string,
      unknown
    >;
    const result = diagnosticsOutput["mcp-diagnostics"] as Record<string, unknown>;

    expect(result.checksIsArray).toBe(true);
    expect((result.checksValue as string[]).length).toBe(3);
  });
});
