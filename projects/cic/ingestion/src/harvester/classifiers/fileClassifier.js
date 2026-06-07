// fileClassifier.js - v1.0.0

import { buildPrompt } from "../pmsClient.js";
import { geminiClient } from "../models/geminiClient.js";

export async function classifyFile({ rawText, filePath, mimeType, metadata }) {
  const pack = "research_v1";
  const payload = await buildPrompt({
    pack,
    model: "gemini",
    context: {
      mode: "file_classification",
      rawText,
      filePath,
      mimeType,
      metadata,
    },
  });

  const result = await geminiClient.run(payload, { pack });
  return JSON.parse(result.output);
}
