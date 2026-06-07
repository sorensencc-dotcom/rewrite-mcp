// agentExecutor.js - v2.1.0
// Antigravity Upgrade: Multi-agent execution support with Fallback & Retries

import { buildPrompt } from "./pmsClient.js";
import { runWithFallback, MODEL_CHAIN } from "../../../../apps/cic-pms/src/modelFallback.js";
import { modelClient } from "../../../../apps/cic-pms/src/unifiedModelClient.js";
import { normalizeModelOutput } from "../../../../apps/cic-pms/src/jsonNormalize.js";

/**
 * Executes an agent task.
 * @param {Object} params
 * @param {string} params.agent - The agent name.
 * @param {string} params.task - The task description.
 * @param {Object} params.inputs - Inputs for the task.
 * @param {string} [params.correlationId] - Correlation ID for tracing.
 * @param {boolean} [params.background] - Whether to run in the background.
 */
export async function executeAgent({ agent, task, inputs, correlationId, background = false }) {
  const execution = async () => {
    const t0 = Date.now();
    const { payload, drift } = await buildPrompt({
      pack: "orchestrator_agent_v1",
      model: "gemini",
      context: {
        mode: "agent_instruction",
        agent,
        task,
        inputs,
        correlationId
      }
    });

    const result = await runWithFallback(MODEL_CHAIN, async (modelName) => {
      return await modelClient(modelName).run(payload, { 
        subsystem: "orchestrator_agent",
        pack: "orchestrator_agent_v1",
        correlationId
      });
    });
    
    const latencyMs = Date.now() - t0;
    const normalized = normalizeModelOutput(result);

    return {
      ...normalized,
      _meta: {
        latencyMs,
        drift,
        agent,
        timestamp: Date.now()
      }
    };
  };

  if (background) {
    // Background execution: return a promise but don't wait for it if called without await
    // In a real system, this would register with a task queue/scheduler.
    console.log(`[Antigravity] Scheduling background task for agent: ${agent}`);
    return execution();
  }

  return execution();
}
