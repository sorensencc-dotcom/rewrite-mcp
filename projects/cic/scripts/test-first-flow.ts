/**
 * Test First Flow Execution
 * Demonstrates end-to-end CIC flow execution with agents and observability
 */

import { FlowRegistry } from "../ruflo-orchestration/FlowRegistry";
import { FlowOrchestrator } from "../ruflo-orchestration/FlowOrchestrator";
import { FlowLoader } from "../ruflo-orchestration/FlowLoader";

// Simple mock agents for demonstration
const createMockAgents = () => {
  const logAgent = (name: string) => ({
    invoke: async (method: string, input: Record<string, unknown>, traceId: string) => {
      console.log(`  → [${name}::${method}]`);
      console.log(`     Input: ${JSON.stringify(input).substring(0, 80)}...`);

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

      return {
        agent: name,
        method,
        status: "completed",
        results: {
          items_processed: Math.floor(Math.random() * 100) + 10,
          quality_score: (Math.random() * 0.5) + 0.5,
        },
        timestamp: new Date().toISOString(),
      };
    },
  });

  return {
    "code-analyzer": logAgent("code-analyzer"),
    "call-graph-extractor": logAgent("call-graph-extractor"),
    "narrative-linker": logAgent("narrative-linker"),
    "context-synthesizer": logAgent("context-synthesizer"),
    "idea-parser": logAgent("idea-parser"),
    "idea-classifier": logAgent("idea-classifier"),
    "refactor-proposal-engine": logAgent("refactor-proposal-engine"),
    "test-generator": logAgent("test-generator"),
  };
};

async function runFirstFlow() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║         CIC First Flow Execution — End-to-End Test             ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  // 1. Initialize registry and orchestrator
  console.log("📦 [1] Initializing Flow Registry...");
  const registry = new FlowRegistry();
  const agents = createMockAgents();
  const orchestrator = new FlowOrchestrator({
    registry,
    agents,
    maxConcurrency: 5,
    defaultTimeout: 30000,
  });
  console.log("   ✓ Registry initialized\n");

  // 2. Load flow templates
  console.log("📂 [2] Loading Flow Templates from data/flows.json...");
  const flowsPath = "projects/cic/data/flows.json";
  const loaded = FlowLoader.loadAndRegister(registry, flowsPath);
  console.log(`   ✓ Loaded ${loaded} flow templates\n`);

  // 3. List available flows
  console.log("📋 [3] Available Flows:");
  const flows = registry.listTemplates("active");
  flows.forEach((flow) => {
    console.log(`   • ${flow.id} (${flow.description})`);
  });
  console.log();

  // 4. Execute first flow: analyze-repository
  const templateId = "flow-analyze-repository-v1";
  const flowInput = {
    context_id: "ctx-demo-repo-001",
    repo_name: "CIC",
  };

  console.log("🚀 [4] Executing Flow: flow-analyze-repository-v1");
  console.log(`   Input: context_id=${flowInput.context_id}, repo=${flowInput.repo_name}\n`);

  const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`   Trace ID: ${traceId}\n`);

  try {
    const startTime = Date.now();

    // Execute the flow
    const executionId = await orchestrator.executeFlow(templateId, flowInput, traceId);
    console.log(`   Execution ID: ${executionId}`);
    console.log(`   Status: queued\n`);

    // Wait for completion
    console.log("⏳ [5] Waiting for Flow Execution...\n");
    const execution = await orchestrator.waitForExecution(executionId, 60000);

    const duration = Date.now() - startTime;

    // 5. Display results
    console.log("✅ [6] Flow Execution Complete\n");
    console.log(`   Status: ${execution.status}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Stages Completed: ${Object.values(execution.stage_status).filter(s => s === "completed").length}`);
    console.log(`   Spans Recorded: ${execution.spans.length}\n`);

    // 6. Show span timeline
    console.log("📊 [7] Execution Timeline (Spans):\n");
    execution.spans.forEach((span, idx) => {
      const indent = "   ";
      const duration = span.duration_ms || 0;
      console.log(`   ${idx + 1}. ${span.stage_id}`);
      console.log(`      Agent: ${span.agent}`);
      console.log(`      Duration: ${duration}ms`);
      console.log(`      Status: ${span.status}`);
      if (span.error) {
        console.log(`      Error: ${span.error}`);
      }
      console.log();
    });

    // 7. Show output
    console.log("📤 [8] Flow Output Summary:\n");
    if (execution.output) {
      const outputKeys = Object.keys(execution.output);
      console.log(`   Stages with Output: ${outputKeys.length}`);
      outputKeys.forEach((key) => {
        console.log(`   • ${key}`);
      });
    }
    console.log();

    // 8. Execution stats
    console.log("📈 [9] Execution Statistics:");
    console.log(`   Total Duration: ${duration}ms`);
    console.log(`   Stages: ${Object.keys(execution.stage_status).length}`);
    console.log(`   Spans: ${execution.spans.length}`);
    console.log(`   Success Rate: ${execution.spans.filter(s => s.status === "completed").length}/${execution.spans.length}`);
    console.log();

    // 9. Ready for next phase
    console.log("✨ [10] Next Steps:");
    console.log("   1. Deploy CIC Service with `npm start`");
    console.log("   2. Open Operator Console at http://localhost:5173");
    console.log("   3. Navigate to Flow Explorer");
    console.log("   4. Paste execution ID to view timeline");
    console.log();

    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║              ✅ First Flow Execution Successful! 🎉            ║");
    console.log("╚════════════════════════════════════════════════════════════════╝\n");

  } catch (error) {
    console.error("❌ Flow execution failed:", error);
    console.log();
  }
}

// Run the test
runFirstFlow().catch(console.error);
