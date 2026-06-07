// geminiClient.js - v2.0.0
// Antigravity Upgrade: Integrated Fallback & Retry semantics for Orchestrator

import { runWithFallback, MODEL_CHAIN } from "../../../../../apps/cic-pms/src/modelFallback.js";
import { modelClient } from "../../../../../apps/cic-pms/src/unifiedModelClient.js";
import { normalizeModelOutput } from "../../../../../apps/cic-pms/src/jsonNormalize.js";

/**
 * Enhanced client that transparently handles fallbacks and retries.
 * Maintains the .run(payload, options) interface for backward compatibility.
 */
export const geminiClient = {
  async run(payload, options = {}) {
    const result = await runWithFallback(MODEL_CHAIN, async (modelName) => {
      const client = modelClient(modelName);
      
      const res = await client.run(payload, {
        subsystem: options.subsystem || "orchestrator",
        pack: options.pack,
        correlationId: options.correlationId
      });

      return res;
    });

    return normalizeModelOutput(result);
  }
};
