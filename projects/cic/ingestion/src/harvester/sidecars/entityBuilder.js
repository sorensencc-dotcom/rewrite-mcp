// entityBuilder.js - v1.0.0

import { buildPrompt } from "../pmsClient.js";
import { geminiClient } from "../models/geminiClient.js";

export async function buildEntities({ rawText, filePath, metadata }) {
  const pack = "rewrite_v1";
  const payload = await buildPrompt({
    pack,
    model: "gemini",
    context: {
      mode: "entity_extraction",
      rawText,
      filePath,
      metadata,
    },
  });

  const result = await geminiClient.run(payload, { pack });
  return JSON.parse(result.output);
}
