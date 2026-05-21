// pipelineSelector.js - v1.0.0

import { buildPrompt } from "./pmsClient.js";
import { geminiClient } from "./models/geminiClient.js";
import { safeInterpreterOutput } from "../../../../apps/cic-pms/src/safeModeTemplates/interpreter.js";

export async function selectPipeline({ job, agents }) {
  const { payload } = await buildPrompt({
    pack: "orchestrator_planning_v1",
    model: "gemini",
    context: {
      mode: "pipeline_selection",
      job,
      agents
    }
  });

  const result = await geminiClient.run(payload, { pack: "orchestrator_planning_v1" });
  
  if (result.safe_mode) {
    return { ...safeInterpreterOutput(result.reason), pipeline: [] };
  }

  return result;
}
