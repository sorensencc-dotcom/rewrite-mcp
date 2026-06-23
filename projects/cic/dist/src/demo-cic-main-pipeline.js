#!/usr/bin/env node
/**
 * Demo: CIC Main Pipeline Execution
 *
 * This demonstrates CIC's canonical documentary workflow:
 * 1. Validate environment
 * 2. Analyze code
 * 3. Enrich with narratives
 * 4. Verify drift
 * 5. Sync documentation
 * 6. Orchestrate handoff
 *
 * Setup Requirements:
 * 1. Start MCP servers in Terminal 1:
 *    cd C:\dev\rewrite-mcp\src\mcp
 *    npm start
 *
 * 2. Run this demo in Terminal 2:
 *    cd C:\dev\rewrite-mcp\projects\cic
 *    npm run demo:cic-pipeline
 *
 * 3. With custom parameters:
 *    npm run demo:cic-pipeline ctx-auth-module docs/AUTH_SPEC.md
 *
 * Full paths (Windows):
 *   Project root: C:\dev\rewrite-mcp\projects\cic
 *   MCP servers:  C:\dev\rewrite-mcp\src\mcp
 *   This script:  C:\dev\rewrite-mcp\projects\cic\src\demo-cic-main-pipeline.ts
 */
import { randomUUID } from "node:crypto";
import { FlowRegistry } from "./ruflo-orchestration/FlowRegistry.js";
import { FlowOrchestrator } from "./ruflo-orchestration/FlowOrchestrator.js";
import { mcpAgents } from "./ruflo-orchestration/agents.js";
import { getCICMCPIntegration } from "./lib/mcp-integration.js";
async function main() {
    const contextId = process.argv[2] || "ctx-demo-run";
    const specPath = process.argv[3] || "README.md";
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║             CIC Main Pipeline Demonstration                    ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log();
    console.log(`📦 Context ID: ${contextId}`);
    console.log(`📄 Spec Path: ${specPath}`);
    console.log();
    // Initialize Ruflo
    const registry = new FlowRegistry();
    const orchestrator = new FlowOrchestrator({
        registry,
        agents: mcpAgents,
        maxConcurrency: 5,
        defaultTimeout: 60000,
    });
    // Verify MCP health
    console.log("🔍 Checking MCP Health...");
    const mcp = getCICMCPIntegration();
    const healthy = await mcp.isHealthy();
    if (!healthy) {
        console.warn("⚠️  MCP servers not all reachable. Starting demo anyway...\n");
    }
    else {
        console.log("✅ MCP servers healthy\n");
    }
    // Execute pipeline
    const traceId = randomUUID();
    const executionId = await orchestrator.executeFlow("flow-cic-main-v1", {
        context_id: contextId,
        spec_path: specPath,
        trace_id: traceId,
    }, traceId);
    console.log("🚀 Executing CIC Main Pipeline");
    console.log(`   Execution ID: ${executionId}`);
    console.log(`   Trace ID:     ${traceId}`);
    console.log();
    // Monitor execution
    let lastStatus = "queued";
    let lastStage = "";
    const monitorInterval = setInterval(() => {
        const execution = registry.getExecution(executionId);
        if (!execution)
            return;
        if (execution.status !== lastStatus) {
            lastStatus = execution.status;
            console.log(`\n📊 Status: ${execution.status}`);
        }
        // Show stage progress
        Object.entries(execution.stage_status).forEach(([stageId, status]) => {
            const stage = execution.input;
            if (status !== "pending" && stageId !== lastStage) {
                lastStage = stageId;
                const emoji = status === "completed"
                    ? "✅"
                    : status === "running"
                        ? "🔄"
                        : status === "failed"
                            ? "❌"
                            : "⏭️";
                console.log(`   ${emoji} ${stageId}: ${status}`);
            }
        });
    }, 500);
    try {
        // Wait for completion
        const execution = await orchestrator.waitForExecution(executionId, 300000);
        clearInterval(monitorInterval);
        console.log("\n" + "═".repeat(70));
        console.log("EXECUTION COMPLETE");
        console.log("═".repeat(70));
        // Summary
        console.log(`\n📈 Summary:`);
        console.log(`   Status: ${execution.status}`);
        if (execution.started_at && execution.completed_at) {
            const duration = new Date(execution.completed_at).getTime() -
                new Date(execution.started_at).getTime();
            console.log(`   Duration: ${duration}ms`);
        }
        // Stage results
        console.log(`\n🔍 Stage Results:`);
        const stageOrder = [
            "stage-preflight",
            "stage-code-analysis",
            "stage-enrichment",
            "stage-drift-verification",
            "stage-docs-update",
            "stage-orchestration",
        ];
        stageOrder.forEach((stageId) => {
            const status = execution.stage_status[stageId];
            if (!status)
                return;
            const emoji = status === "completed"
                ? "✅"
                : status === "failed"
                    ? "❌"
                    : status === "skipped"
                        ? "⏭️"
                        : "🔄";
            console.log(`\n   ${emoji} ${stageId.replace("stage-", "").toUpperCase()}`);
            console.log(`      Status: ${status}`);
            if (execution.output && execution.output[stageId]) {
                const output = execution.output[stageId];
                Object.entries(output).forEach(([agent, result]) => {
                    const resultObj = result;
                    console.log(`      ${agent}:`);
                    // Show key results (excluding large arrays)
                    Object.entries(resultObj).forEach(([key, value]) => {
                        if (key !== "findings" &&
                            key !== "results" &&
                            typeof value !== "object") {
                            console.log(`        ${key}: ${value}`);
                        }
                        else if (key === "allPassed" || key === "exceedsThreshold") {
                            console.log(`        ${key}: ${value}`);
                        }
                    });
                });
            }
        });
        // Key decisions
        console.log(`\n🎯 Key Decisions:`);
        const driftResult = execution.output?.["stage-drift-verification"]?.["mcp-drift"];
        if (driftResult) {
            const driftAcceptable = !driftResult.exceedsThreshold;
            console.log(`   Drift Check: ${driftAcceptable ? "✅ PASS" : "⚠️  HIGH"} (score: ${driftResult.driftScore})`);
            const docsSynced = execution.stage_status["stage-docs-update"] === "completed";
            console.log(`   Docs Sync: ${docsSynced ? "✅ SYNCED" : "⏭️  SKIPPED"} (${driftAcceptable ? "drift acceptable" : "drift high"})`);
        }
        // Spans
        console.log(`\n📝 Execution Spans (${execution.spans.length} total):`);
        execution.spans.forEach((span, i) => {
            const statusEmoji = span.status === "completed"
                ? "✅"
                : span.status === "failed"
                    ? "❌"
                    : "🔄";
            console.log(`   ${i + 1}. ${statusEmoji} ${span.agent} — ${span.duration_ms}ms`);
        });
        // MCP metrics
        console.log(`\n📊 MCP Metrics:`);
        const metrics = mcp.getMetrics();
        if (Array.isArray(metrics)) {
            metrics.forEach((m) => {
                const method = m.method.split(".")[1] || m.method;
                console.log(`   ${method}: ${m.status} (${m.durationMs}ms)`);
            });
        }
        console.log("\n" + "═".repeat(70));
        console.log("✨ Pipeline execution complete!");
        console.log("═".repeat(70) + "\n");
        process.exit(execution.status === "completed" ? 0 : 1);
    }
    catch (err) {
        clearInterval(monitorInterval);
        console.error("\n❌ Pipeline execution failed:");
        console.error(err.message);
        process.exit(1);
    }
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
//# sourceMappingURL=demo-cic-main-pipeline.js.map