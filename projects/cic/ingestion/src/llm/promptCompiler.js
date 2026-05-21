/**
 * promptCompiler.js
 * @version 1.1.0
 * @date 2026-05-17
 *
 * Assembles a final prompt string from system instructions, user input,
 * and an ordered set of context chunks.
 *
 * Token ceiling is enforced by dropping lowest-priority chunks first.
 * No chunk is truncated mid-sentence — only whole chunks are dropped.
 * Chunks are expected in priority order (highest first).
 *
 * v1.1.0 changes:
 *   - estimateTokens removed from inline; imported from utils.js (D5)
 *   - Re-exported for callers that import it directly from this module
 */

export { estimateTokens } from './utils.js';
import { estimateTokens } from './utils.js';

const MODULE = 'promptCompiler';

// ---------------------------------------------------------------------------
// Section delimiters (model-agnostic plain-text format)
// ---------------------------------------------------------------------------

const DELIMITERS = {
  system:  { open: '### SYSTEM\n',  close: '\n' },
  context: { open: '### CONTEXT\n', close: '\n' },
  user:    { open: '### USER\n',    close: '\n' },
};

/**
 * @typedef {Object} BuildPromptParams
 * @property {string}   system_prompt      — static system instructions
 * @property {string}   user_input         — the current user message
 * @property {string[]} context_chunks     — ordered context passages (high → low priority)
 * @property {number}   max_prompt_tokens  — hard ceiling for the whole prompt
 */

/**
 * @typedef {Object} BuildPromptResult
 * @property {string}   prompt
 * @property {number}   estimated_tokens
 * @property {number}   chunks_included
 * @property {number}   chunks_dropped
 */

/**
 * Build a prompt within the specified token ceiling.
 * Context chunks are packed in order until the budget is exhausted.
 *
 * @param {BuildPromptParams} params
 * @returns {BuildPromptResult}
 */
export function buildPrompt({ system_prompt, user_input, context_chunks, max_prompt_tokens }) {
  if (typeof system_prompt !== 'string') throw new Error(`[${MODULE}] 'system_prompt' must be a string`);
  if (typeof user_input !== 'string')    throw new Error(`[${MODULE}] 'user_input' must be a string`);
  if (!Array.isArray(context_chunks))    throw new Error(`[${MODULE}] 'context_chunks' must be an array`);
  if (!Number.isFinite(max_prompt_tokens) || max_prompt_tokens < 1) {
    throw new Error(`[${MODULE}] 'max_prompt_tokens' must be a positive integer`);
  }

  const systemSection = DELIMITERS.system.open + system_prompt + DELIMITERS.system.close;
  const userSection   = DELIMITERS.user.open   + user_input    + DELIMITERS.user.close;
  const fixedText     = systemSection + userSection;
  const fixedTokens   = estimateTokens(fixedText);

  if (fixedTokens > max_prompt_tokens) {
    console.warn(`[${MODULE}] fixed prompt sections (${fixedTokens} tokens) exceed max_prompt_tokens (${max_prompt_tokens}); context omitted`);
    return {
      prompt: fixedText,
      estimated_tokens: fixedTokens,
      chunks_included: 0,
      chunks_dropped: context_chunks.length,
    };
  }

  let budget = max_prompt_tokens - fixedTokens;
  const CONTEXT_HEADER_TOKENS = estimateTokens(DELIMITERS.context.open + DELIMITERS.context.close);

  const accepted = [];
  let contextHeaderCharged = false;

  for (const chunk of context_chunks) {
    if (typeof chunk !== 'string' || !chunk.length) continue;

    const chunkTokens    = estimateTokens(chunk + '\n');
    const headerCost     = contextHeaderCharged ? 0 : CONTEXT_HEADER_TOKENS;
    const requiredBudget = chunkTokens + headerCost;

    if (requiredBudget > budget) continue;

    accepted.push(chunk);
    budget -= requiredBudget;
    contextHeaderCharged = true;
  }

  let contextSection = '';
  if (accepted.length > 0) {
    contextSection = DELIMITERS.context.open + accepted.join('\n') + DELIMITERS.context.close;
  }

  const prompt = systemSection + contextSection + userSection;

  return {
    prompt,
    estimated_tokens: estimateTokens(prompt),
    chunks_included: accepted.length,
    chunks_dropped: context_chunks.length - accepted.length,
  };
}
