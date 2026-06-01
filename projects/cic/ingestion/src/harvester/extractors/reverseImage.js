// reverseImage.js - v1.0.0
// Hardened for token economy: output bounds, error handling, token tracking

import { buildPrompt } from "../pmsClient.js";
import { geminiClient } from "../models/geminiClient.js";

const MAX_OUTPUT_TOKENS = 256; // Gemini output hard limit

export async function reverseImageSearch({ imageBase64, filePath }) {
  const pack = "analysis_v1";

  // 1. Validate input size
  const imageSizeKB = Buffer.byteLength(imageBase64, 'base64') / 1024;
  if (imageSizeKB > 10240) { // 10MB hard limit
    return {
      error: 'IMAGE_TOO_LARGE',
      max_size_mb: 10,
      actual_size_mb: (imageSizeKB / 1024).toFixed(2),
      token_cost: 0
    };
  }

  // 2. Build prompt with token estimation
  let payload;
  try {
    payload = await buildPrompt({
      pack,
      model: "gemini",
      context: {
        mode: "reverse_image_search",
        imageBase64,
        filePath,
        output_token_limit: MAX_OUTPUT_TOKENS,
      },
    });
  } catch (err) {
    return {
      error: 'PROMPT_ASSEMBLY_FAILED',
      reason: err.message,
      token_cost: 0
    };
  }

  // 3. Call Gemini with strict output bounds and timeout
  let result;
  try {
    result = await geminiClient.run(payload, {
      pack,
      max_tokens: MAX_OUTPUT_TOKENS,
      timeout_ms: 10000 // 10s hard timeout
    });
  } catch (err) {
    return {
      error: 'GEMINI_CALL_FAILED',
      reason: err.message,
      token_cost: MAX_OUTPUT_TOKENS // Assume worst-case usage
    };
  }

  // 4. Validate result structure and size
  if (!result || typeof result !== 'object') {
    return {
      error: 'GEMINI_RESPONSE_INVALID',
      reason: 'response is not an object',
      token_cost: result?.tokens_used ?? MAX_OUTPUT_TOKENS
    };
  }

  const outputStr = result.output || '';
  if (Buffer.byteLength(outputStr, 'utf8') > 50000) { // 50KB hard limit
    return {
      error: 'RESPONSE_TOO_LARGE',
      max_bytes: 50000,
      actual_bytes: Buffer.byteLength(outputStr, 'utf8'),
      token_cost: MAX_OUTPUT_TOKENS
    };
  }

  // 5. Parse JSON with error handling
  let parsed;
  try {
    parsed = JSON.parse(outputStr);
  } catch (err) {
    return {
      error: 'JSON_PARSE_FAILED',
      reason: err.message,
      snippet: outputStr.substring(0, 100),
      token_cost: result.tokens_used ?? 0
    };
  }

  return {
    data: parsed,
    token_cost: result.tokens_used ?? 0,
    error: null
  };
}
