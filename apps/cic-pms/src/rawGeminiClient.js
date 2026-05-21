// rawGeminiClient.js - v1.0.0
// Basic Gemini client using Google's Generative AI SDK (Raw)

import { GoogleGenerativeAI } from "@google/generative-ai";
import { emitModelCall } from "./telemetryClient.js";

const apiKey = process.env.ORCH_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

export const rawGeminiClient = {
  async run(payload, { subsystem = "orchestrator", pack, correlationId } = {}) {
    const start = Date.now();
    let success = false;
    let errorCode = null;
    try {
      const { model, prompt, context } = payload;
      let modelName = model || "gemini-3.5-flash";
      if (modelName === "gemini") modelName = "gemini-3.5-flash";
      const modelInstance = genAI.getGenerativeModel({ model: modelName });

      let parts = [prompt];
      if (context?.imageBase64) {
        parts.push({
          inlineData: {
            data: context.imageBase64,
            mimeType: context.mimeType || "image/jpeg"
          }
        });
      }

      const result = await modelInstance.generateContent(parts);
      const response = await result.response;
      const text = response.text();
      success = true;

      return {
        output: text,
        usage: response.usageMetadata
      };
    } catch (err) {
      errorCode = err.status || err.errorCode || (err.message?.includes("429") ? 429 : 500);
      throw err;
    } finally {
      const latencyMs = Date.now() - start;
      emitModelCall({
        model: payload.model || "gemini",
        subsystem,
        pack,
        latencyMs,
        success,
        errorCode,
        correlationId
      });
    }
  }
};
