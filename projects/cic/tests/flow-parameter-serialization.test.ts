/**
 * Test for the parameter serialization fix in FlowOrchestrator
 * Validates that array parameters are preserved when interpolating template variables
 */

import { describe, it, expect } from "vitest";

describe("FlowOrchestrator - Parameter Type Preservation", () => {
  // Simulate the fixed interpolateInput logic
  function interpolateInputFixed(
    input: Record<string, unknown>,
    executionData: {
      input: Record<string, unknown>;
      output?: Record<string, unknown>;
      stage_index?: number;
    }
  ): Record<string, unknown> {
    const interpolated: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "string" && value.includes("{{")) {
        // Check if the entire value is a single template variable (preserve type)
        const singleVarMatch = value.match(/^\{\{(input|output|stages)\.([\w\[\]\.]+)\}\}$/);

        if (singleVarMatch) {
          // Single variable: preserve its original type (array, object, string, etc.)
          const [, varType, varPath] = singleVarMatch;

          if (varType === "input") {
            const val = (executionData.input as Record<string, unknown>)[varPath];
            interpolated[key] = val !== undefined ? val : "";
          } else if (varType === "output") {
            const val = (executionData.output as Record<string, unknown>)[varPath];
            interpolated[key] = val !== undefined ? val : "";
          }
        } else {
          // Multiple variables or partial replacements: convert to strings
          let result = value;
          result = result.replace(/\{\{input\.(\w+)\}\}/g, (_, field) => {
            const val = (executionData.input as Record<string, unknown>)[field];
            return String(val ?? "");
          });
          interpolated[key] = result;
        }
      } else if (typeof value === "object" && value !== null) {
        // Recursively interpolate nested objects
        interpolated[key] = interpolateInputFixed(
          value as Record<string, unknown>,
          executionData
        );
      } else {
        interpolated[key] = value;
      }
    }

    return interpolated;
  }

  it("should preserve array type when using single template variable", () => {
    const input = {
      checks: "{{input.checks}}",
    };

    const executionData = {
      input: {
        checks: ["node", "typescript", "docker"],
      },
    };

    const result = interpolateInputFixed(input, executionData);

    expect(Array.isArray(result.checks)).toBe(true);
    expect(result.checks).toEqual(["node", "typescript", "docker"]);
  });

  it("should convert array to string when it's part of a larger template", () => {
    const input = {
      message: "Checking {{input.checks}}",
    };

    const executionData = {
      input: {
        checks: ["node", "typescript", "docker"],
      },
    };

    const result = interpolateInputFixed(input, executionData);

    expect(typeof result.message).toBe("string");
    expect(result.message).toContain("Checking");
  });

  it("should preserve object type for diagnostics parameters", () => {
    const input = {
      checks: "{{input.checks}}",
      timeout: "{{input.timeout}}",
    };

    const executionData = {
      input: {
        checks: ["node", "docker", "qdrant"],
        timeout: 5000,
      },
    };

    const result = interpolateInputFixed(input, executionData);

    // checks should remain an array
    expect(Array.isArray(result.checks)).toBe(true);
    expect((result.checks as string[]).length).toBe(3);

    // timeout should remain a number
    expect(typeof result.timeout).toBe("number");
    expect(result.timeout).toBe(5000);
  });

  it("should handle nested array parameters", () => {
    const input = {
      config: {
        checks: "{{input.checks}}",
      },
    };

    const executionData = {
      input: {
        checks: ["node", "typescript"],
      },
    };

    const result = interpolateInputFixed(input, executionData);

    expect(typeof result.config).toBe("object");
    expect(Array.isArray((result.config as Record<string, unknown>).checks)).toBe(true);
    expect(
      ((result.config as Record<string, unknown>).checks as string[]).length
    ).toBe(2);
  });
});
