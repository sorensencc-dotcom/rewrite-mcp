// synthesizer.js - v1.0.0

import { buildPrompt } from "./pmsClient.js";
import { geminiClient } from "./models/geminiClient.js";
import { safeSynthesizerOutput } from "../../../../apps/cic-pms/src/safeModeTemplates/synthesizer.js";

export async function synthesize({ outputs, metadata, json = false }) {
  const { payload } = await buildPrompt({
    pack: "orchestrator_synthesis_v1",
    model: "gemini",
    context: {
      mode: json ? "synthesis_json" : "synthesis_text",
      outputs,
      metadata
    }
  });

  const result = await geminiClient.run(payload, { pack: "orchestrator_synthesis_v1" });

  if (json) {
    if (result.safe_mode) {
      return safeSynthesizerOutput(result.reason || "model_fallback_exhausted");
    }
    return result; // Already normalized to object
  }

  // For text mode, if it's safe-mode, return the object. 
  // If it's a successful run, return the raw output text if available.
  return result.safe_mode ? result : (result.output || result);
}
