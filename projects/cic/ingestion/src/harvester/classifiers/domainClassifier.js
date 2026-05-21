// domainClassifier.js - v1.0.0

import { buildPrompt } from "../pmsClient.js";
import { geminiClient } from "../models/geminiClient.js";

export async function classifyDomain({ rawText, filePath, metadata }) {
  const pack = "research_v1";
  const payload = await buildPrompt({
    pack,
    model: "gemini",
    context: {
      mode: "domain_classification",
      rawText,
      filePath,
      metadata,
    },
  });

  const result = await geminiClient.run(payload, { pack });
  return JSON.parse(result.output);
}
