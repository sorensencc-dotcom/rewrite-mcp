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
import { 
  emitPipeline, 
  emitMASRerunAttempt, 
  emitMASRerunBackoff, 
  emitMASRerunFinalState 
} from "../../../../apps/cic-pms/src/telemetryClient.js";
import { 
  processTelemetry as masProcessTelemetry,
  getMitigationState as masGetMitigationState
} from "./mas/mas.js";

const MAS_AGENT_MAP = {
  extractor:   "INGEST",
  enrich:      "ENRICH",
  orchestrate: "ORCHESTRATE",
  synthesizer: "SYNTHESIZE",
  audit:       "AUDIT"
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runAgentWithMAS(step, context) {
  const start = performance.now();
  let errors = 0;
  let output;
  let retryCount = 0;
  
  const mitigation = masGetMitigationState();
  const maxRetries = config.masMaxRetries + (mitigation.policyOverrides.maxRetriesDelta || 0);
  const backoffMultiplier = mitigation.policyOverrides.backoffMultiplier || 1.0;
  
  const agent = step.agent;
  const correlationId = context.correlationId;

  const execute = async () => {
    // Check for agent-specific model fallback
    const masAgent = MAS_AGENT_MAP[agent] ?? "ORCHESTRATE";
    const agentOverride = mitigation.agentOverrides[masAgent] || {};
    
    return await executeAgent({
      agent: step.agent,
      task: step.task || "process",
      inputs: { 
        ...step.inputs, 
        jobText: context.jobText,
        _masOverride: agentOverride // Pass down to executor if it supports it
      },
      correlationId
    });
  };

  try {
    output = await execute();
  } catch (err) {
    errors = 1;
    throw err;
  } finally {
    let currentDirective;
    
    // Initial MAS processing
    const masAgent = MAS_AGENT_MAP[agent] ?? "ORCHESTRATE";
    currentDirective = masProcessTelemetry({
      agent:      masAgent,
      latencyMs:  performance.now() - start,
      confidence: output?.confidence ?? (output?._meta?.confidence ?? 1.0),
      drift:      output?.drift      ?? (output?._meta?.drift      ?? 0.0),
      errors,
      queueDepth: context.queueDepth ?? 0,
      timestamp:  Date.now()
    });

    // Handle rerunAgent with retries and adaptive backoff
    while (currentDirective.action === "rerunAgent" && retryCount < maxRetries) {
      retryCount++;
      const baseBackoff = config.masBackoffMs * backoffMultiplier;
      const backoff = baseBackoff * Math.pow(2, retryCount - 1);
      
      await emitMASRerunAttempt({
        correlationId,
        agent: masAgent,
        attempt: retryCount,
        maxAttempts: maxRetries,
        backoffMs: backoff,
        reason: currentDirective.reason
      });

      console.log(`[MAS] Rerunning agent ${agent} (attempt ${retryCount}/${maxRetries}) in ${backoff}ms due to: ${currentDirective.reason}`);
      
      await emitMASRerunBackoff({
        correlationId,
        agent: masAgent,
        attempt: retryCount,
        backoffMs: backoff
      });

      await sleep(backoff);
      
      const retryStart = performance.now();
      try {
        output = await execute();
        errors = 0;
      } catch (err) {
        errors = 1;
      }

      // Re-process telemetry after rerun to see if we need another one
      currentDirective = masProcessTelemetry({
        agent:      masAgent,
        latencyMs:  performance.now() - retryStart,
        confidence: output?.confidence ?? (output?._meta?.confidence ?? 1.0),
        drift:      output?.drift      ?? (output?._meta?.drift      ?? 0.0),
        errors,
        queueDepth: context.queueDepth ?? 0,
        timestamp:  Date.now(),
        isRerun:    true,
        retryCount
      });
    }

    if (retryCount > 0) {
      await emitMASRerunFinalState({
        correlationId,
        agent: masAgent,
        finalState: (currentDirective.action !== "rerunAgent") ? "success" : "failed",
        attempts: retryCount,
        maxAttempts: maxRetries
      });
    }

    if (currentDirective.action === "fallbackAgent") {
      console.log(`[MAS] Fallback requested for agent ${agent} due to directive: ${currentDirective.reason}`);
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
