// metadataExtractor.js - v1.0.0

import { buildPrompt } from "../pmsClient.js";
import { geminiClient } from "../models/geminiClient.js";

export async function extractMetadata({ rawText, filePath, mimeType, baseMetadata }) {
  const pack = "analysis_v1";
  const payload = await buildPrompt({
    pack,
    model: "gemini",
    context: {
      mode: "metadata_extraction",
      rawText,
      filePath,
      mimeType,
      baseMetadata,
    },
  });

  const result = await geminiClient.run(payload, { pack });
  return JSON.parse(result.output);
}
