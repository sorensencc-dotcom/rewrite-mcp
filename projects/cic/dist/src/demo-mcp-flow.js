#!/usr/bin/env node
/**
 * Demo: MCP Agents with Ruflo Flows
 *
 * Setup Requirements:
 * 1. Start MCP servers in Terminal 1:
 *    cd C:\dev\rewrite-mcp\src\mcp
 *    npm start
 *
 * 2. Run this demo in Terminal 2:
 *    cd C:\dev\rewrite-mcp\projects\cic
 *    npm run demo:mcp-flow
 *
 * Full paths (Windows):
 *   Project root: C:\dev\rewrite-mcp\projects\cic
 *   MCP servers:  C:\dev\rewrite-mcp\src\mcp
 *   This script:  C:\dev\rewrite-mcp\projects\cic\src\demo-mcp-flow.ts
 *
 * This demonstrates:
 * 1. Registering MCP agents with Ruflo
 * 2. Executing a flow that uses MCP stages
 * 3. Observing flow execution and metrics
 */
import { randomUUID } from "node:crypto";
import { FlowRegistry } from "./ruflo-orchestration/FlowRegistry.js";
import { FlowOrchestrator } from "./ruflo-orchestration/FlowOrchestrator.js";
import { mcpAgents } from "./ruflo-orchestration/agents.js";
import { getCICMCPIntegration } from "./lib/mcp-integration.js";
async function main() {
    console.log("=".repeat(80));
    console.log("MCP Integration Flow Demo");
    console.log("=".repeat(80));
    // Initialize Ruflo
    const registry = new FlowRegistry();
    const orchestrator = new FlowOrchestrator({
        registry,
        agents: mcpAgents,
        maxConcurrency: 5,
        defaultTimeout: 30000,
    });
    // List available flows
    console.log("\n📋 Registered Flows:");
    const flows = registry.listTemplates("active");
    flows.forEach((flow) => {
        console.log(`  • ${flow.id} (v${flow.version}) — ${flow.description}`);
    });
    // Check MCP health
    console.log("\n🔍 Checking MCP System Health...");
    const mcp = getCICMCPIntegration();
    const healthy = await mcp.isHealthy();
    if (!healthy) {
        console.warn("⚠️  WARNING: MCP servers not all reachable. Some tests may fail.");
        console.log("Start MCP servers with: cd src/mcp && npm start");
    }
    else {
        console.log("✅ MCP servers healthy");
    }
    // Execute the MCP integration flow
    console.log("\n🚀 Executing MCP Integration Flow...");
    const traceId = randomUUID();
    const executionId = await orchestrator.executeFlow("flow-mcp-integration-v1", {}, traceId);
    console.log(`   Execution ID: ${executionId}`);
    console.log(`   Trace ID: ${traceId}`);
    // Wait for completion
    console.log("\n⏳ Waiting for flow completion...");
    let lastStatus = "queued";
    const checkInterval = setInterval(() => {
        const execution = registry.getExecution(executionId);
        if (execution && execution.status !== lastStatus) {
            lastStatus = execution.status;
            console.log(`   Status: ${execution.status}`);
            if (execution.stage_status) {
                Object.entries(execution.stage_status).forEach(([stageId, status]) => {
                    console.log(`     • ${stageId}: ${status}`);
                });
            }
        }
    }, 1000);
    try {
        const execution = await orchestrator.waitForExecution(executionId, 120000);
        clearInterval(checkInterval);
        console.log("\n✅ Flow Execution Complete");
        console.log(`   Final Status: ${execution.status}`);
        console.log(`   Duration: ${execution.completed_at && execution.started_at ? new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime() : "N/A"}ms`);
        // Show stage results
        console.log("\n📊 Stage Results:");
        if (execution.output) {
            Object.entries(execution.output).forEach(([stageId, output]) => {
                console.log(`\n  ${stageId}:`);
                const outputObj = output;
                Object.entries(outputObj).forEach(([agent, result]) => {
                    console.log(`    ${agent}:`);
                    const resultObj = result;
                    Object.entries(resultObj).forEach(([key, value]) => {
                        if (key !== "findings" && key !== "results") {
                            console.log(`      ${key}: ${value}`);
                        }
                    });
                });
            });
        }
        // Show spans
        console.log("\n📈 Execution Spans:");
        execution.spans.forEach((span, index) => {
            const duration = span.duration_ms ? `${span.duration_ms}ms` : "pending";
            const status = span.status === "completed" ? "✓" : "✗";
            console.log(`  ${status} ${index + 1}. ${span.agent} (${span.stage_id}) — ${duration}`);
        });
        // Show MCP metrics
        console.log("\n📊 MCP Call Metrics:");
        const metrics = mcp.getMetrics();
        if (Array.isArray(metrics) && metrics.length > 0) {
            metrics.slice(-5).forEach((m) => {
                console.log(`  ${m.method}: ${m.status} (${m.durationMs}ms) — ${m.timestamp}`);
            });
        }
        console.log("\n" + "=".repeat(80));
        console.log("Demo Complete!");
        console.log("=".repeat(80));
    }
    catch (err) {
        clearInterval(checkInterval);
        console.error("\n❌ Flow execution failed:");
        console.error(err.message);
        process.exit(1);
    }
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
//# sourceMappingURL=demo-mcp-flow.js.map