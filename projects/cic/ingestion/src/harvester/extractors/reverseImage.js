// reverseImage.js - v1.0.0

import { buildPrompt } from "../pmsClient.js";
import { geminiClient } from "../models/geminiClient.js";

export async function reverseImageSearch({ imageBase64, filePath }) {
  const pack = "analysis_v1";
  const payload = await buildPrompt({
    pack,
    model: "gemini",
    context: {
      mode: "reverse_image_search",
      imageBase64,
      filePath,
    },
  });

  const result = await geminiClient.run(payload, { pack });
  return JSON.parse(result.output);
}
