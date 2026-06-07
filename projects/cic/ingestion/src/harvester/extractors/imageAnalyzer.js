// imageAnalyzer.js - v1.0.0

import { buildPrompt } from "../pmsClient.js";
import { geminiClient } from "../models/geminiClient.js";

export async function analyzeImage({ imageBase64, filePath, metadata }) {
  const pack = "analysis_v1";
  const payload = await buildPrompt({
    pack,
    model: "gemini",
    context: {
      mode: "image_analysis",
      imageBase64,
      filePath,
      metadata,
    },
  });

  const result = await geminiClient.run(payload, { pack });

  // Expect strict JSON back
  return JSON.parse(result.output);
}
