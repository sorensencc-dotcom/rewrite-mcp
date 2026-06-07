// summaryBuilder.js - v1.0.0

import { buildPrompt } from "../pmsClient.js";
import { geminiClient } from "../models/geminiClient.js";

export async function buildSummary({ rawText, filePath, metadata }) {
  const pack = "rewrite_v1";
  const payload = await buildPrompt({
    pack,
    model: "gemini",
    context: {
      mode: "summary",
      rawText,
      filePath,
      metadata,
    },
  });

  const result = await geminiClient.run(payload, { pack });
  return result.output; // likely freeform text summary
}
