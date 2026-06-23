/**
 * MCP Integration Flow — Demonstrates end-to-end MCP usage in Ruflo
 *
 * Flow stages:
 * 1. Validate environment (diagnostics)
 * 2. Detect drift between spec and implementation
 * 3. Auto-sync documentation (conditional on no drift)
 * 4. Run orchestrator task (always, for completeness)
 *
 * This flow is used for integration testing and as a reference for building
 * MCP-aware flows.
 */
export const mcpIntegrationFlow = {
    id: "flow-mcp-integration-v1",
    version: "1.0.0",
    description: "End-to-end MCP integration: diagnostics → drift → docs-sync → orchestrate",
    status: "active",
    stages: [
        {
            id: "stage-env-check",
            name: "Environment Diagnostics",
            type: "serial",
            agents: [
                {
                    agent: "mcp-diagnostics",
                    method: "diagnose",
                    input: {
                        checks: ["node", "typescript", "docker"],
                    },
                    timeout_ms: 15000,
                },
            ],
            on_error: "fail",
        },
        {
            id: "stage-drift-analysis",
            name: "Drift Detection",
            type: "serial",
            agents: [
                {
                    agent: "mcp-drift",
                    method: "detectDrift",
                    input: {
                        specPath: "docs/CIC_MASTER_ROADMAP.md",
                        implPath: "src/cic.ts",
                        threshold: 30,
                    },
                    timeout_ms: 10000,
                },
            ],
            on_error: "continue",
        },
        {
            id: "stage-docs-sync",
            name: "Documentation Sync",
            type: "serial",
            agents: [
                {
                    agent: "mcp-docs-sync",
                    method: "syncDocs",
                    input: {
                        changeType: "feature",
                        description: "MCP integration layer deployed",
                        affectedFiles: ["src/lib/mcp-integration.ts"],
                        roadmapSection: "## MCP Integration",
                    },
                    timeout_ms: 10000,
                },
            ],
            // Only sync docs if drift detection passed
            if: "stage-drift-analysis.status === 'completed' && !stage-drift-analysis.output['mcp-drift'].exceedsThreshold",
            on_error: "continue",
        },
        {
            id: "stage-orchestration",
            name: "Cross-System Task Execution",
            type: "serial",
            agents: [
                {
                    agent: "mcp-orchestrator",
                    method: "runTask",
                    input: {
                        taskId: "test-flow-001",
                        owner: "cic",
                        taskType: "ingest",
                        input: {
                            source: "integration-test",
                            timestamp: Date.now(),
                        },
                    },
                    timeout_ms: 20000,
                },
            ],
            on_error: "continue",
        },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner: "mcp-integration",
};
//# sourceMappingURL=mcp-integration-flow.js.map