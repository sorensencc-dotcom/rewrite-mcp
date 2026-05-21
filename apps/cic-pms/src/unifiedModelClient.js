/**
 * apps/cic-pms/src/unifiedModelClient.js
 * @version 1.0.0
 * @date 2026-05-20
 *
 * Unified model client factory for the CIC ecosystem.
 * Normalizes different model providers into a consistent .run(payload) interface.
 */

import { rawGeminiClient } from './rawGeminiClient.js';
import { createModelClient as createClaudeClient } from '../../../projects/cic/ingestion/src/clients/modelClient.js';
import { createLlamaClient } from '../../../projects/cic/ingestion/src/clients/llamaClient.js';
import { runWithFallback } from './modelFallback.js';
import { getDynamicModelChain } from './modelRouter.js';
import { emitModelCall } from './telemetryClient.js';

let _claude = null;
let _llama = null;

function getClaude() {
  if (!_claude) _claude = createClaudeClient();
  return _claude;
}

function getLlama() {
  if (!_llama) _llama = createLlamaClient();
  return _llama;
}

export function modelClient(modelName) {
  switch (modelName.toLowerCase()) {
    case 'gemini': return rawGeminiClient;
    case 'claude': return {
      async run(payload, options = {}) {
        const start = Date.now();
        let success = false;
        let errorCode = null;
        try {
          const client = getClaude();
          const result = await client.complete({
            model: payload.model || 'claude-3-sonnet-20240229',
            prompt: payload.prompt,
            max_tokens: payload.max_tokens || 4096
          });
          success = true;
          return {
            output: result.text,
            usage: { prompt_tokens: result.tokens_prompt, completion_tokens: result.tokens_completion }
          };
        } catch (err) {
          errorCode = err.status || err.errorCode || (err.message?.includes("429") ? 429 : 500);
          throw err;
        } finally {
          const latencyMs = Date.now() - start;
          emitModelCall({
            model: 'claude',
            subsystem: options.subsystem || 'orchestrator',
            pack: options.pack,
            latencyMs,
            success,
            errorCode,
            correlationId: options.correlationId
          });
        }
      }
    };
    case 'llama': return {
      async run(payload, options = {}) {
        const start = Date.now();
        let success = false;
        let errorCode = null;
        try {
          const client = getLlama();
          const result = await client.complete({
            prompt: payload.prompt,
            max_tokens: payload.max_tokens || 4096
          });
          success = true;
          return {
            output: result.text,
            usage: { prompt_tokens: result.tokens_prompt, completion_tokens: result.tokens_completion }
          };
        } catch (err) {
          errorCode = err.status || err.errorCode || (err.message?.includes("429") ? 429 : 500);
          throw err;
        } finally {
          const latencyMs = Date.now() - start;
          emitModelCall({
            model: 'llama',
            subsystem: options.subsystem || 'orchestrator',
            pack: options.pack,
            latencyMs,
            success,
            errorCode,
            correlationId: options.correlationId
          });
        }
      }
    };
    default: throw new Error(`Unsupported model: ${modelName}`);
  }
}

/**
 * Unified fallback-aware client.
 */
export const fallbackClient = {
  async run(payload, options = {}) {
    const chain = getDynamicModelChain();
    const result = await runWithFallback(chain, async (modelName) => {
      const client = modelClient(modelName);
      return await client.run(payload, options);
    });
    return result;
  }
};
