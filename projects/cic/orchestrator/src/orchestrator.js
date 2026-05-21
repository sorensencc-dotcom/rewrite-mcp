// orchestrator.js - v1.2.0
// Main orchestration flow for CIC Orchestrator

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { performance } from "node:perf_hooks";
import { interpretTask } from "./taskInterpreter.js";
import { selectPipeline } from "./pipelineSelector.js";
import { generatePlan } from "./agentPlanner.js";
import { executeAgent } from "./agentExecutor.js";
import { synthesize } from "./synthesizer.js";
import { config } from "./config.js";
import { emitPipeline } from "../../../../apps/cic-pms/src/telemetryClient.js";
import { processTelemetry as masProcessTelemetry } from "./mas/mas.js";

const MAS_AGENT_MAP = {
  extractor:   "INGEST",
  enrich:      "ENRICH",
  orchestrate: "ORCHESTRATE",
  synthesizer: "SYNTHESIZE",
  audit:       "AUDIT"
};

async function runAgentWithMAS(step, context) {
  const start = performance.now();
  let errors = 0;
  let output;

  const execute = async () => {
    return await executeAgent({
      agent: step.agent,
      task: step.task || "process",
      inputs: { ...step.inputs, jobText: context.jobText },
      correlationId: context.correlationId
    });
  };

  try {
    output = await execute();
  } catch (err) {
    errors = 1;
    throw err;
  } finally {
    const masAgent = MAS_AGENT_MAP[step.agent] ?? "ORCHESTRATE";
    const directive = masProcessTelemetry({
      agent:      masAgent,
      latencyMs:  performance.now() - start,
      confidence: output?.confidence ?? (output?._meta?.confidence ?? 1.0),
      drift:      output?.drift      ?? (output?._meta?.drift      ?? 0.0),
      errors,
      queueDepth: context.queueDepth ?? 0,
      timestamp:  Date.now()
    });

    if (directive.action === "rerunAgent") {
      console.log(`[MAS] Rerunning agent ${step.agent} due to directive: ${directive.reason}`);
      output = await execute();
    } else if (directive.action === "fallbackAgent") {
      console.log(`[MAS] Fallback requested for agent ${step.agent} due to directive: ${directive.reason}`);
      // Fallback is already handled by runWithFallback inside executeAgent, 
      // but we could trigger a more drastic fallback here if needed.
    }
  }

  return output;
}

/**
 * Run the full orchestration pipeline for a job.
 * Antigravity 2.0: Supports parallel agent execution, background scheduling, and Phase-26 Checkpointing.
 */
export async function runOrchestration(job, correlationId = crypto.randomUUID()) {
  const jobId = job.id || crypto.randomUUID();
  const availableAgents = ["extractor", "synthesizer"]; 

  // 1. Interpret the task
  const interpretation = await interpretTask(job);

  // 2. Select the pipeline
  const pipelineResult = await selectPipeline({ job, agents: availableAgents });
  const pipeline = pipelineResult.pipeline;

  // 3. Generate the plan
  const plan = await generatePlan({ job, agents: pipeline });

  // 4. Record the pipeline event for telemetry
  const packs = [
    "orchestrator_planning_v1", 
    "orchestrator_agent_v1",    
    "orchestrator_synthesis_v1" 
  ];
  
  await emitPipeline({ jobId, pipeline, packs, correlationId });

  // 5. Execute the plan (Antigravity: Parallel Execution + Phase-26 Checkpointing)
  console.log(`[Antigravity] Executing plan for Job: ${jobId} with ${plan.steps.length} steps in parallel.`);
  
  const masContext = { jobText: job.text, correlationId };

  const executionPromises = plan.steps.map(async (step) => {
    const output = await runAgentWithMAS(step, masContext);

    // Checkpoint: Save output even if partial/error
    const checkpointDir = path.resolve("../../../../checkpoints", jobId);
    await fs.mkdir(checkpointDir, { recursive: true });
    await fs.writeFile(
      path.join(checkpointDir, `${step.agent}_${step.task}.json`),
      JSON.stringify({ correlationId, timestamp: new Date().toISOString(), ...output }, null, 2)
    );

    return output;
  });

  const agentOutputs = await Promise.all(executionPromises);

  // 6. Synthesize final output
  const finalOutput = await synthesize({
    outputs: agentOutputs,
    metadata: { jobId, interpretation, pipeline, correlationId },
    json: interpretation.taskType === "extraction"
  });

  return {
    jobId,
    correlationId,
    output: finalOutput,
    metadata: {
      interpretation,
      pipeline,
      plan,
      executedInParallel: true,
      checkpointed: true,
      masEnabled: true
    }
  };
}
