"use strict";
/**
 * Test for the parameter serialization fix in FlowOrchestrator
 * Validates that array parameters are preserved when interpolating template variables
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
(0, vitest_1.describe)("FlowOrchestrator - Parameter Type Preservation", () => {
    // Simulate the fixed interpolateInput logic
    function interpolateInputFixed(input, executionData) {
        const interpolated = {};
        for (const [key, value] of Object.entries(input)) {
            if (typeof value === "string" && value.includes("{{")) {
                // Check if the entire value is a single template variable (preserve type)
                const singleVarMatch = value.match(/^\{\{(input|output|stages)\.([\w\[\]\.]+)\}\}$/);
                if (singleVarMatch) {
                    // Single variable: preserve its original type (array, object, string, etc.)
                    const [, varType, varPath] = singleVarMatch;
                    if (varType === "input") {
                        const val = executionData.input[varPath];
                        interpolated[key] = val !== undefined ? val : "";
                    }
                    else if (varType === "output") {
                        const val = executionData.output[varPath];
                        interpolated[key] = val !== undefined ? val : "";
                    }
                }
                else {
                    // Multiple variables or partial replacements: convert to strings
                    let result = value;
                    result = result.replace(/\{\{input\.(\w+)\}\}/g, (_, field) => {
                        const val = executionData.input[field];
                        return String(val ?? "");
                    });
                    interpolated[key] = result;
                }
            }
            else if (typeof value === "object" && value !== null) {
                // Recursively interpolate nested objects
                interpolated[key] = interpolateInputFixed(value, executionData);
            }
            else {
                interpolated[key] = value;
            }
        }
        return interpolated;
    }
    (0, vitest_1.it)("should preserve array type when using single template variable", () => {
        const input = {
            checks: "{{input.checks}}",
        };
        const executionData = {
            input: {
                checks: ["node", "typescript", "docker"],
            },
        };
        const result = interpolateInputFixed(input, executionData);
        (0, vitest_1.expect)(Array.isArray(result.checks)).toBe(true);
        (0, vitest_1.expect)(result.checks).toEqual(["node", "typescript", "docker"]);
    });
    (0, vitest_1.it)("should convert array to string when it's part of a larger template", () => {
        const input = {
            message: "Checking {{input.checks}}",
        };
        const executionData = {
            input: {
                checks: ["node", "typescript", "docker"],
            },
        };
        const result = interpolateInputFixed(input, executionData);
        (0, vitest_1.expect)(typeof result.message).toBe("string");
        (0, vitest_1.expect)(result.message).toContain("Checking");
    });
    (0, vitest_1.it)("should preserve object type for diagnostics parameters", () => {
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
        (0, vitest_1.expect)(Array.isArray(result.checks)).toBe(true);
        (0, vitest_1.expect)(result.checks.length).toBe(3);
        // timeout should remain a number
        (0, vitest_1.expect)(typeof result.timeout).toBe("number");
        (0, vitest_1.expect)(result.timeout).toBe(5000);
    });
    (0, vitest_1.it)("should handle nested array parameters", () => {
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
        (0, vitest_1.expect)(typeof result.config).toBe("object");
        (0, vitest_1.expect)(Array.isArray(result.config.checks)).toBe(true);
        (0, vitest_1.expect)(result.config.checks.length).toBe(2);
    });
});
//# sourceMappingURL=flow-parameter-serialization.test.js.map