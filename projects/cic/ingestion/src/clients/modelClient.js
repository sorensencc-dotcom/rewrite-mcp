/**
 * modelClient.js
 * @version 1.0.0
 * @date 2026-05-17
 *
 * Anthropic SDK adapter that satisfies tokenMeter's modelClient contract:
 *   .complete({ model, prompt, max_tokens }) → { text, tokens_prompt, tokens_completion }
 *
 * Prompt format: controller.js emits a plain-text prompt with ### SYSTEM / ### CONTEXT / ### USER
 * sections. This adapter splits on those markers to feed Anthropic's system + messages fields.
 *
 * Required env: ANTHROPIC_API_KEY
 */

import Anthropic from '@anthropic-ai/sdk';

const MODULE = 'modelClient';

const SECTION_RE = /^### (SYSTEM|CONTEXT|USER)\s*$/m;

/**
 * Factory — call once at startup, reuse the returned client object.
 *
 * @param {{ apiKey?: string }} [opts]
 * @returns {{ complete: Function }}
 */
export function createModelClient(opts = {}) {
  const apiKey = opts.apiKey ?? process.env.ORCH_ANTHROPIC_API_KEY ?? process.env.HARV_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error(`[${MODULE}] ANTHROPIC_API_KEY is not set`);

  const sdk = new Anthropic({ apiKey });

  return {
    /**
     * @param {{ model: string, prompt: string, max_tokens: number }} params
     * @returns {Promise<{ text: string, tokens_prompt: number, tokens_completion: number }>}
     */
    async complete({ model, prompt, max_tokens }) {
      const { system, userContent } = _splitPrompt(prompt);

      let response;
      try {
        response = await sdk.messages.create({
          model,
          max_tokens,
          system: system || undefined,
          messages: [{ role: 'user', content: userContent }],
        });
      } catch (err) {
        err.message = `[${MODULE}] Anthropic messages.create failed: ${err.message}`;
        err.context = { model, max_tokens, promptLength: prompt.length };
        throw err;
      }

      const text = _extractText(response);
      return {
        text,
        tokens_prompt:     response.usage?.input_tokens  ?? 0,
        tokens_completion: response.usage?.output_tokens ?? 0,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Split the plain-text prompt produced by promptCompiler into Anthropic fields.
 * Sections not present default to empty string.
 *
 * @param {string} prompt
 * @returns {{ system: string, userContent: string }}
 */
function _splitPrompt(prompt) {
  // Collect all section header positions
  const sections = {};
  const lines = prompt.split('\n');
  let current = null;
  const buffers = {};

  for (const line of lines) {
    const match = line.match(/^### (SYSTEM|CONTEXT|USER)$/);
    if (match) {
      current = match[1];
      buffers[current] = buffers[current] ?? [];
    } else if (current) {
      buffers[current].push(line);
    }
  }

  const systemParts = [
    (buffers.SYSTEM  ?? []).join('\n').trim(),
    (buffers.CONTEXT ?? []).join('\n').trim(),
  ].filter(Boolean);

  return {
    system:      systemParts.join('\n\n---\n\n'),
    userContent: (buffers.USER ?? []).join('\n').trim() || prompt.trim(),
  };
}

function _extractText(response) {
  if (Array.isArray(response.content)) {
    const block = response.content.find(b => b.type === 'text');
    if (block?.text) return block.text;
  }
  throw new Error(`[${MODULE}] Could not extract text from Anthropic response`);
}
