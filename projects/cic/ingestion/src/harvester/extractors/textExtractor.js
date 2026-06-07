// textExtractor.js - v1.0.0

import { buildPrompt } from "../pmsClient.js";
import { geminiClient } from "../models/geminiClient.js";

export async function extractText({ rawText, filePath, mimeType, metadata }) {
  const pack = "analysis_v1";
  const payload = await buildPrompt({
    pack,
    model: "gemini",
    context: {
      mode: "text_extraction",
      rawText,
      filePath,
      mimeType,
      metadata,
    },
  });

  const result = await geminiClient.run(payload, { pack });
  return JSON.parse(result.output);
}
