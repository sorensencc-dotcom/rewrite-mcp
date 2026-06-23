"use strict";
/**
 * Test to verify the array parameter serialization fix
 * Ensures that array parameters like `checks: ["node", "typescript"]` are preserved
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const FlowOrchestrator_js_1 = __importDefault(require("../src/ruflo-orchestration/FlowOrchestrator.js"));
const FlowRegistry_js_1 = __importDefault(require("../src/ruflo-orchestration/FlowRegistry.js"));
(0, vitest_1.describe)("Array Parameter Serialization Fix", () => {
    let orchestrator;
    let registry;
    let capturedInputs = {};
    const mockAgent = {
        async invoke(method, input) {
            capturedInputs[method] = input;
            return {
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
                "test-agent": mockAgent,
            },
        });
        capturedInputs = {};
    });
    (0, vitest_1.it)("should preserve array literals in flow parameters", async () => {
        const flow = {
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
        const executionId = await orchestrator.executeFlow("test-array-literal", {}, "trace-123");
        const execution = await orchestrator.waitForExecution(executionId, 5000);
        (0, vitest_1.expect)(execution.status).toBe("completed");
        const testAgent = capturedInputs["test"];
        (0, vitest_1.expect)(Array.isArray(testAgent.checks)).toBe(true);
        (0, vitest_1.expect)(testAgent.checks).toEqual(["node", "typescript", "docker", "qdrant"]);
    });
    (0, vitest_1.it)("should preserve array type when using template variables", async () => {
        const flow = {
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
        const executionId = await orchestrator.executeFlow("test-array-template", {
            checks: ["node", "typescript", "docker"],
        }, "trace-456");
        const execution = await orchestrator.waitForExecution(executionId, 5000);
        (0, vitest_1.expect)(execution.status).toBe("completed");
        const testAgent = capturedInputs["test"];
        (0, vitest_1.expect)(Array.isArray(testAgent.checks)).toBe(true);
        (0, vitest_1.expect)(testAgent.checks).toEqual(["node", "typescript", "docker"]);
    });
    (0, vitest_1.it)("should handle nested arrays in object parameters", async () => {
        const flow = {
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
        const executionId = await orchestrator.executeFlow("test-nested-arrays", {
            checks: ["node", "typescript"],
        }, "trace-789");
        const execution = await orchestrator.waitForExecution(executionId, 5000);
        (0, vitest_1.expect)(execution.status).toBe("completed");
        const testAgent = capturedInputs["test"];
        (0, vitest_1.expect)(typeof testAgent.config).toBe("object");
        (0, vitest_1.expect)(Array.isArray(testAgent.config.checks)).toBe(true);
        (0, vitest_1.expect)(testAgent.config.checks).toEqual(["node", "typescript"]);
    });
});
//# sourceMappingURL=array-parameter-fix.test.js.map