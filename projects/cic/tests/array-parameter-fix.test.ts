/**
 * Test to verify the array parameter serialization fix
 * Ensures that array parameters like `checks: ["node", "typescript"]` are preserved
 */

import { describe, it, expect, beforeEach } from "vitest";
import FlowOrchestrator, { AgentClient } from "../src/ruflo-orchestration/FlowOrchestrator.js";
import FlowRegistry from "../src/ruflo-orchestration/FlowRegistry.js";

describe("Array Parameter Serialization Fix", () => {
  let orchestrator: FlowOrchestrator;
  let registry: FlowRegistry;
  let capturedInputs: Record<string, unknown> = {};

  const mockAgent: AgentClient = {
    async invoke(method: string, input: Record<string, unknown>) {
      capturedInputs[method] = input;
      return {
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
        "test-agent": mockAgent,
      },
    });
    capturedInputs = {};
  });

  it("should preserve array literals in flow parameters", async () => {
    const flow: any = {
      id: "test-array-literal",
      version: "1.0.0",
      description: "Test array literal preservation",
      status: "active",
      stages: [
        {
          id: "stage-test",
          name: "Test Stage",
          type: "serial",
          agents: [
            {
              agent: "test-agent",
              method: "test",
              input: {
                checks: ["node", "typescript", "docker", "qdrant"],
              },
              timeout_ms: 5000,
            },
          ],
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner: "test",
    };

    registry.registerTemplate(flow);

    const executionId = await orchestrator.executeFlow(
      "test-array-literal",
      {},
      "trace-123"
    );

    const execution = await orchestrator.waitForExecution(executionId, 5000);

    expect(execution.status).toBe("completed");

    const testAgent = capturedInputs["test"];
    expect(Array.isArray(testAgent.checks)).toBe(true);
    expect(testAgent.checks).toEqual(["node", "typescript", "docker", "qdrant"]);
  });

  it("should preserve array type when using template variables", async () => {
    const flow: any = {
      id: "test-array-template",
      version: "1.0.0",
      description: "Test array template variable",
      status: "active",
      stages: [
        {
          id: "stage-test",
          name: "Test Stage",
          type: "serial",
          agents: [
            {
              agent: "test-agent",
              method: "test",
              input: {
                checks: "{{input.checks}}",
              },
              timeout_ms: 5000,
            },
          ],
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner: "test",
    };

    registry.registerTemplate(flow);

    const executionId = await orchestrator.executeFlow(
      "test-array-template",
      {
        checks: ["node", "typescript", "docker"],
      },
      "trace-456"
    );

    const execution = await orchestrator.waitForExecution(executionId, 5000);

    expect(execution.status).toBe("completed");

    const testAgent = capturedInputs["test"];
    expect(Array.isArray(testAgent.checks)).toBe(true);
    expect(testAgent.checks).toEqual(["node", "typescript", "docker"]);
  });

  it("should handle nested arrays in object parameters", async () => {
    const flow: any = {
      id: "test-nested-arrays",
      version: "1.0.0",
      description: "Test nested arrays",
      status: "active",
      stages: [
        {
          id: "stage-test",
          name: "Test Stage",
          type: "serial",
          agents: [
            {
              agent: "test-agent",
              method: "test",
              input: {
                config: {
                  checks: "{{input.checks}}",
                },
              },
              timeout_ms: 5000,
            },
          ],
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner: "test",
    };

    registry.registerTemplate(flow);

    const executionId = await orchestrator.executeFlow(
      "test-nested-arrays",
      {
        checks: ["node", "typescript"],
      },
      "trace-789"
    );

    const execution = await orchestrator.waitForExecution(executionId, 5000);

    expect(execution.status).toBe("completed");

    const testAgent = capturedInputs["test"] as any;
    expect(typeof testAgent.config).toBe("object");
    expect(Array.isArray(testAgent.config.checks)).toBe(true);
    expect(testAgent.config.checks).toEqual(["node", "typescript"]);
  });
});
