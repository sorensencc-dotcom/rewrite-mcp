/**
 * PHASE D ZERO RUN — CIC Main Pipeline End-to-End Execution
 *
 * Executes the complete 6-stage CIC Main Pipeline:
 * 1. Code Analyzer
 * 2. Call Graph Extractor
 * 3. Narrative Linker
 * 4. Context Synthesizer
 * 5. Conditional Router
 * 6. Diagnostics (validates parameter serialization: receives array)
 */
import { FlowRegistry } from "../src/ruflo-orchestration/FlowRegistry.js";
import { FlowOrchestrator } from "../src/ruflo-orchestration/FlowOrchestrator.js";
import { FlowLoader } from "../src/ruflo-orchestration/FlowLoader.js";
// Create mock agents for Phase D testing
const createPhaseDAgets = () => {
    return {
        "code-analyzer": {
            invoke: async (method, input) => ({
                agent: "code-analyzer",
                method,
                status: "success",
                output: { classes: 42, functions: 156, imports: 18 }
            })
        },
        "call-graph-extractor": {
            invoke: async (method, input) => ({
                agent: "call-graph-extractor",
                method,
                status: "success",
                output: { edges: 203, cycles: 0, hotspots: 5 }
            })
        },
        "narrative-linker": {
            invoke: async (method, input) => ({
                agent: "narrative-linker",
                method,
                status: "success",
                output: { docs_linked: 28, orphans: 3 }
            })
        },
        "context-synthesizer": {
            invoke: async (method, input) => ({
                agent: "context-synthesizer",
                method,
                status: "success",
                output: { coherence_score: 0.82, context_depth: 5 }
            })
        },
        "conditional-router": {
            invoke: async (method, input) => ({
                agent: "conditional-router",
                method,
                status: "success",
                route: "diagnostics",
                condition_met: true
            })
        },
        "diagnostics": {
            invoke: async (method, input) => {
                // CRITICAL: Validate that diagnostics receives array, not string
                const stagesInput = input.stages;
                if (!Array.isArray(stagesInput)) {
                    throw new Error(`SERIALIZATION ERROR: Diagnostics received ${typeof stagesInput}, expected array`);
                }
                return {
                    agent: "diagnostics",
                    method,
                    status: "success",
                    array_received: true,
                    stage_count: stagesInput.length,
                    diagnostics: {
                        overall_health: "green",
                        stage_health: ["green", "green", "green", "green", "green"],
                        issues: 0
                    }
                };
            }
        }
    };
};
async function runPhaseDZeroRun() {
    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║         PHASE D ZERO RUN — CIC Main Pipeline Execution         ║");
    console.log("║                   6-Stage Governance-Enforced                   ║");
    console.log("╚════════════════════════════════════════════════════════════════╝\n");
    const executionStartTime = Date.now();
    let executionStatus = "SUCCESS";
    let diagnosticsArrayCheck = false;
    try {
        // 1. Initialize
        console.log("📦 [1] Initializing Phase D System");
        const registry = new FlowRegistry();
        const agents = createPhaseDAgets();
        const orchestrator = new FlowOrchestrator({
            registry,
            agents,
            maxConcurrency: 5,
            defaultTimeout: 30000
        });
        console.log("   ✓ Registry initialized\n");
        // 2. Load flows
        console.log("📂 [2] Loading Flow Templates");
        const flowsPath = "data/flows.json";
        const loaded = FlowLoader.loadAndRegister(registry, flowsPath);
        console.log(`   ✓ Loaded ${loaded} flow templates\n`);
        // 3. Verify cic-main-pipeline exists
        console.log("✅ [3] Verifying CIC Main Pipeline Registration");
        const flows = registry.listTemplates("active");
        const mainPipelineExists = flows.some((f) => f.id === "cic-main-pipeline");
        if (!mainPipelineExists) {
            throw new Error("❌ cic-main-pipeline not found in registry");
        }
        console.log("   ✓ CIC Main Pipeline registered\n");
        // 4. Execute pipeline
        const pipelineStartTime = Date.now();
        const traceId = `phase-d-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const flowInput = {
            context_id: "phase-d-zero-run-001",
            repo_name: "rewrite-mcp"
        };
        console.log("🚀 [4] Executing CIC Main Pipeline (6 Stages)");
        console.log(`   Trace ID: ${traceId}`);
        console.log(`   Input: ${JSON.stringify(flowInput)}\n`);
        const executionId = await orchestrator.executeFlow("cic-main-pipeline", flowInput, traceId);
        console.log(`   Execution ID: ${executionId}`);
        console.log(`   Status: queued\n`);
        // 5. Wait for completion
        console.log("⏳ [5] Waiting for Pipeline Execution (max 60s)");
        const execution = await orchestrator.waitForExecution(executionId, 60000);
        const pipelineDuration = Date.now() - pipelineStartTime;
        console.log(`   ✓ Complete (${pipelineDuration}ms)\n`);
        // 6. Validate stages
        console.log("✅ [6] Stage Validation Results\n");
        const expectedStages = [
            "stage-1",
            "stage-2",
            "stage-3",
            "stage-4",
            "stage-5",
            "stage-6"
        ];
        let stagesGreen = 0;
        expectedStages.forEach((stageId) => {
            const status = execution.stage_status?.[stageId] || "unknown";
            const icon = status === "completed" ? "✓" : "✗";
            console.log(`   ${icon} ${stageId.toUpperCase()}: ${status}`);
            if (status === "completed")
                stagesGreen++;
        });
        console.log(`\n   Stages Passed: ${stagesGreen}/${expectedStages.length}\n`);
        if (stagesGreen !== expectedStages.length) {
            throw new Error(`❌ Only ${stagesGreen}/${expectedStages.length} stages completed`);
        }
        // 7. Validate Diagnostics Parameter Fix
        console.log("📊 [7] Diagnostics Parameter Serialization Validation");
        // Check if diagnostics stage received array parameter
        const diagnosticsSpan = execution.spans?.find((s) => s.stage_id === "stage-6");
        if (diagnosticsSpan?.error) {
            if (diagnosticsSpan.error.includes("SERIALIZATION ERROR")) {
                executionStatus = "FAILURE";
                console.log(`   ✗ DIAGNOSTICS RECEIVED WRONG TYPE`);
                console.log(`   Error: ${diagnosticsSpan.error}\n`);
            }
        }
        else {
            diagnosticsArrayCheck = true;
            console.log(`   ✓ Diagnostics received array parameter`);
            console.log(`   ✓ Parameter serialization fix validated\n`);
        }
        // 8. Trace structure validation
        console.log("📊 [8] Trace Structure Validation");
        const spans = execution.spans || [];
        console.log(`   Total spans: ${spans.length}`);
        console.log(`   Trace ID consistent: ${spans.every((s) => s.trace_id === traceId) ? "✓" : "✗"}`);
        console.log(`   No orphans: ${spans.every((s) => !s.parent_span_id || spans.some((p) => p.span_id === s.parent_span_id)) ? "✓" : "✗"}`);
        console.log();
        // 9. Latency breakdown
        console.log("⏱️  [9] Stage Latency Breakdown");
        execution.spans?.forEach((span, idx) => {
            console.log(`   Stage ${idx + 1}: ${span.duration_ms}ms`);
        });
        console.log();
        // 10. Summary
        const totalDuration = Date.now() - executionStartTime;
        console.log("╔════════════════════════════════════════════════════════════════╗");
        if (executionStatus === "SUCCESS" && diagnosticsArrayCheck) {
            console.log("║                    ✅ PHASE D ZERO RUN PASSED                   ║");
        }
        else {
            console.log("║                   ❌ PHASE D ZERO RUN FAILED                    ║");
        }
        console.log("╚════════════════════════════════════════════════════════════════╝\n");
        console.log("📈 Execution Summary:");
        console.log(`   Duration: ${totalDuration}ms`);
        console.log(`   Stages: ${stagesGreen}/${expectedStages.length}`);
        console.log(`   Spans: ${spans.length}`);
        console.log(`   Trace ID: ${traceId}`);
        console.log(`   Diagnostics Parameter: ${diagnosticsArrayCheck ? "✓ ARRAY" : "✗ WRONG TYPE"}`);
        console.log(`   Status: ${executionStatus}\n`);
        if (executionStatus === "SUCCESS") {
            console.log("✨ Next Steps (Phase D Hardening Loop):");
            console.log("   1. Run 4 more identical executions (determinism check)");
            console.log("   2. Expand test coverage for missing agents");
            console.log("   3. Validate trace structure completeness");
            console.log("   4. Target Phase D Gate: 2026-06-20\n");
        }
        else {
            console.log("❌ Action Required:");
            console.log("   1. Investigate parameter serialization failure");
            console.log("   2. Check diagnostics stage input handling");
            console.log("   3. Re-run Phase D Zero Run\n");
        }
    }
    catch (error) {
        executionStatus = "ERROR";
        console.error("❌ PHASE D ZERO RUN FAILED");
        console.error(`Error: ${error}\n`);
        process.exit(1);
    }
}
// Run the test
runPhaseDZeroRun().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
//# sourceMappingURL=phase-d-zero-run.js.map