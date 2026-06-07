/**
 * apps/cic-pms/src/modelFallback.js
 * @version 1.0.0
 * @date 2026-05-20
 *
 * Flash-Grade Fallback & Retry semantics for the CIC ecosystem.
 */

'use strict';

import { markModelCooldown } from "./modelRouter.js";

/**
 * Executes a function with a prioritized model chain and retry logic.
 * 
 * @param {Array} models - Array of model configuration objects.
 * @param {Function} fn - The function to execute, receives the model name as argument.
 * @returns {Promise<Object>} - The result of the first successful execution or a safe-mode fallback.
 */
export async function runWithFallback(models, fn) {
  let lastError = null;

  for (const model of models) {
    for (let attempt = 0; attempt < (model.retries || 1); attempt++) {
      try {
        return await fn(model.name);
      } catch (err) {
        lastError = err;

        // If it's a 429 (Quota Exhausted), mark model for cooldown
        if (err.errorCode === 429 || err.status === 429 || err.message?.includes("429")) {
          const retryAfter = err.retryAfter || 60000;
          markModelCooldown(model.name, retryAfter);
          break; // Move to next model immediately on 429
        }

        const delay = model.backoff ? model.backoff(attempt) : 0;
        
        // Apply jitter (±30%)
        const jitter = delay * 0.3 * (Math.random() * 2 - 1);
        const finalDelay = Math.max(0, delay + jitter);
        
        if (attempt < (model.retries || 1) - 1 || model !== models[models.length - 1]) {
          console.warn(`[Fallback] Attempt ${attempt + 1} for ${model.name} failed: ${err.message}. Retrying in ${Math.round(finalDelay)}ms...`);
          if (finalDelay > 0) {
            await new Promise(r => setTimeout(r, finalDelay));
          }
        }
      }
    }
  }

  console.error(`[Fallback] All models and retries exhausted. Last error: ${lastError?.message}`);
  return { 
    safe_mode: true, 
    reason: "model_fallback_exhausted",
    output: {
      summary: null,
      notes: [
        "Safe-mode engaged. Upstream model chain failed.",
        `Last error: ${lastError?.message}`
      ]
    }
  };
}

/**
 * Standard CIC model chain.
 */
export const MODEL_CHAIN = [
  { 
    name: "gemini", 
    retries: 3, 
    backoff: (i) => 250 * Math.pow(2, i) 
  },
  { 
    name: "claude", 
    retries: 2, 
    backoff: (i) => 400 * Math.pow(2, i) 
  },
  { 
    name: "llama",  
    retries: 1, 
    backoff: () => 500 
  }
];
