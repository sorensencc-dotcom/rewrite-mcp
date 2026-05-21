// agentPlanner.js - v1.0.0

import { buildPrompt } from "./pmsClient.js";
import { geminiClient } from "./models/geminiClient.js";
import { safePlannerOutput } from "../../../../apps/cic-pms/src/safeModeTemplates/planner.js";

export async function generatePlan({ job, agents }) {
  const { payload } = await buildPrompt({
    pack: "orchestrator_planning_v1",
    model: "gemini",
    context: {
      mode: "agent_planning",
      job,
      agents
    }
  });

  const result = await geminiClient.run(payload, { pack: "orchestrator_planning_v1" });
  
  if (result.safe_mode) {
    return safePlannerOutput(result.reason || "model_fallback_exhausted");
  }

  return result;
}
