"use strict";
/**
 * Test for MCP parameter serialization fix
 * Verifies that array parameters (like diagnostics checks) are properly preserved
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const FlowOrchestrator_js_1 = __importDefault(require("../src/ruflo-orchestration/FlowOrchestrator.js"));
const FlowRegistry_js_1 = __importDefault(require("../src/ruflo-orchestration/FlowRegistry.js"));
(0, vitest_1.describe)("MCP Parameter Serialization", () => {
    let orchestrator;
    let registry;
    let capturedInputs = {};
    const mockDiagnosticsAgent = {
        async invoke(method, input) {
            // Capture the input to verify it has the correct type
            capturedInputs[method] = input;
            return {
                result: "diagnostics completed",
                checksType: typeof input.checks,
                checksIsArray: Array.isArray(input.checks),
                checksValue: input.checks,
            };
        },
    };
    (0, vitest_1.beforeEach)(() => {
        registry = new FlowRegistry_js_1.default();
        orchestrator = new FlowOrchestrator_js_1.default({
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
    (0, vitest_1.it)("should preserve array types in single template variable substitution", async () => {
        // Create a flow template that passes array parameters
        const customFlow = {
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
        const executionId = await orchestrator.executeFlow("test-array-param-flow", {
            checks: ["node", "typescript", "docker"],
        }, "trace-test-123");
        // Wait for execution to complete
        const execution = await orchestrator.waitForExecution(executionId, 5000);
        (0, vitest_1.expect)(execution.status).toBe("completed");
        // Verify that the checks parameter was passed as an array, not a string
        const diagnosticsOutput = execution.output?.["stage-diagnostics"];
        (0, vitest_1.expect)(diagnosticsOutput).toBeDefined();
        (0, vitest_1.expect)(diagnosticsOutput["mcp-diagnostics"]).toBeDefined();
        const result = diagnosticsOutput["mcp-diagnostics"];
        (0, vitest_1.expect)(result.checksIsArray).toBe(true);
        (0, vitest_1.expect)(result.checksType).toBe("object");
        (0, vitest_1.expect)(Array.isArray(result.checksValue)).toBe(true);
    });
    (0, vitest_1.it)("should handle nested objects in flow parameters", async () => {
        const customFlow = {
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
        const executionId = await orchestrator.executeFlow("test-nested-object-flow", {
            checks: ["node", "docker", "qdrant"],
        }, "trace-test-456");
        const execution = await orchestrator.waitForExecution(executionId, 5000);
        (0, vitest_1.expect)(execution.status).toBe("completed");
        const diagnosticsOutput = execution.output?.["stage-diagnostics"];
        const result = diagnosticsOutput["mcp-diagnostics"];
        (0, vitest_1.expect)(result.checksIsArray).toBe(true);
        (0, vitest_1.expect)(result.checksValue.length).toBe(3);
    });
});
//# sourceMappingURL=mcp-param-serialization.test.js.map