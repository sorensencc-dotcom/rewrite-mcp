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
import { logger } from './logger.js';

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
          const model = payload.model || 'claude-3-sonnet-20240229';
          logger.debug(`Claude Raw Input [${options.correlationId}]`, { model, prompt: payload.prompt, subsystem: options.subsystem, pack: options.pack });
          
          const result = await client.complete({
            model,
            prompt: payload.prompt,
            max_tokens: payload.max_tokens || 4096
          });
          success = true;
          logger.debug(`Claude Raw Output [${options.correlationId}]`, { output: result.text });
          
          return {
            output: result.text,
            usage: { prompt_tokens: result.tokens_prompt, completion_tokens: result.tokens_completion }
          };
        } catch (err) {
          errorCode = err.status || err.errorCode || (err.message?.includes("429") ? 429 : 500);
          logger.error(`Claude Error [${options.correlationId}]`, { errorCode, message: err.message });
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
          logger.debug(`Llama Raw Input [${options.correlationId}]`, { prompt: payload.prompt, subsystem: options.subsystem, pack: options.pack });
          
          const result = await client.complete({
            prompt: payload.prompt,
            max_tokens: payload.max_tokens || 4096
          });
          success = true;
          logger.debug(`Llama Raw Output [${options.correlationId}]`, { output: result.text });
          
          return {
            output: result.text,
            usage: { prompt_tokens: result.tokens_prompt, completion_tokens: result.tokens_completion }
          };
        } catch (err) {
          errorCode = err.status || err.errorCode || (err.message?.includes("429") ? 429 : 500);
          logger.error(`Llama Error [${options.correlationId}]`, { errorCode, message: err.message });
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
