/**
 * tokenMeter.js
 * @version 1.1.0
 * @date 2026-05-17
 *
 * Wraps a model client call and normalises token accounting.
 * Contract: caller supplies a modelClient that exposes .complete(params).
 * Returns: { completion: string, tokens_prompt: number, tokens_completion: number }
 *
 * Zero silent failures — every exception propagates with structured context.
 */

import { emitModelCall } from "../../../../../apps/cic-pms/src/telemetryClient.js";

const MODULE = 'tokenMeter';

/**
 * @typedef {Object} CallModelParams
 * @property {string}  model        — model identifier string
 * @property {string}  prompt       — fully compiled prompt text
 * @property {number}  max_tokens   — maximum completion tokens
 * @property {Object}  modelClient  — client with .complete(params) → Promise<ModelResponse>
 * @property {string}  [correlation_id]
 */

/**
 * @typedef {Object} TokenMeterResult
 * @property {string} completion
 * @property {number} tokens_prompt
 * @property {number} tokens_completion
 */

/**
 * Calls the model via modelClient and returns normalised token counts.
 *
 * Expected modelClient.complete response shape (one of):
 *   { text, usage: { prompt_tokens, completion_tokens } }      ← OpenAI-style
 *   { content, usage: { input_tokens, output_tokens } }        ← Anthropic-style
 *   { text, tokens_prompt, tokens_completion }                 ← native BOB shape
 *
 * @param {CallModelParams} params
 * @returns {Promise<TokenMeterResult>}
 */
export async function callModel({ model, prompt, max_tokens, modelClient, correlation_id }) {
  if (!model) throw new Error(`[${MODULE}] callModel: missing required param 'model'`);
  if (typeof prompt !== 'string' || !prompt.length) throw new Error(`[${MODULE}] callModel: 'prompt' must be a non-empty string`);
  if (!Number.isFinite(max_tokens) || max_tokens < 1) throw new Error(`[${MODULE}] callModel: 'max_tokens' must be a positive integer`);
  if (!modelClient || typeof modelClient.complete !== 'function') {
    throw new Error(`[${MODULE}] callModel: 'modelClient' must expose a .complete(params) method`);
  }

  const t0 = Date.now();
  let raw;
  let success = false;
  let tokens_prompt = 0;
  let tokens_completion = 0;

  try {
    raw = await modelClient.complete({ model, prompt, max_tokens });
    if (!raw || typeof raw !== 'object') {
      throw new Error(`[${MODULE}] modelClient.complete returned non-object response`, { cause: raw });
    }
    const completion = _extractText(raw, model);
    const usage = _extractTokens(raw, model);
    tokens_prompt = usage.tokens_prompt;
    tokens_completion = usage.tokens_completion;
    success = true;

    return { completion, tokens_prompt, tokens_completion };
  } catch (err) {
    err.message = `[${MODULE}] modelClient.complete failed: ${err.message}`;
    err.context = { model, max_tokens, promptLength: prompt.length };
    throw err;
  } finally {
    // Emit telemetry
    emitModelCall({
      model,
      subsystem: 'synergy-controller',
      latencyMs: Date.now() - t0,
      success,
      tokens_prompt,
      tokens_completion,
      correlationId: correlation_id,
      error: success ? null : 'model_call_failed'
    });
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _extractText(raw, model) {
  // BOB native
  if (typeof raw.text === 'string') return raw.text;
  // Anthropic
  if (typeof raw.content === 'string') return raw.content;
  // Anthropic blocks array
  if (Array.isArray(raw.content)) {
    const block = raw.content.find(b => b.type === 'text');
    if (block?.text) return block.text;
  }
  // OpenAI chat completions
  if (Array.isArray(raw.choices) && raw.choices[0]?.message?.content) {
    return raw.choices[0].message.content;
  }
  throw new Error(`[${MODULE}] Cannot extract completion text from model response (model=${model})`);
}

function _extractTokens(raw, model) {
  // BOB native
  if (Number.isFinite(raw.tokens_prompt) && Number.isFinite(raw.tokens_completion)) {
    return { tokens_prompt: raw.tokens_prompt, tokens_completion: raw.tokens_completion };
  }
  // OpenAI-style
  if (raw.usage?.prompt_tokens !== undefined) {
    return {
      tokens_prompt: raw.usage.prompt_tokens ?? 0,
      tokens_completion: raw.usage.completion_tokens ?? 0,
    };
  }
  // Anthropic-style
  if (raw.usage?.input_tokens !== undefined) {
    return {
      tokens_prompt: raw.usage.input_tokens ?? 0,
      tokens_completion: raw.usage.output_tokens ?? 0,
    };
  }
  // Fallback — log warning but do not throw; usage is non-critical path
  console.warn(`[${MODULE}] token counts unavailable from response (model=${model}); defaulting to 0`);
  return { tokens_prompt: 0, tokens_completion: 0 };
}
