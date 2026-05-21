/**
 * llamaClient.js
 * @version 1.0.0
 * @date 2026-05-17
 *
 * Local LLaMA model adapter — Phase 18 §9 (optional).
 * Satisfies the same modelClient contract as modelClient.js:
 *   .complete({ model, prompt, max_tokens }) → { text, tokens_prompt, tokens_completion }
 *
 * Targets the llama.cpp HTTP server (llama-server) running locally.
 * Default endpoint: http://localhost:8080/completion
 *
 * Required env (when using local LLaMA):
 *   LLAMA_URL    — llama-server URL (default: http://localhost:8080)
 *   LLM_MODEL    — set to "local-llama" to select this adapter in config
 *
 * To activate: set LLM_MODEL=local-llama in .env and pass llamaClient as model_client.
 */

const LLAMA_URL = process.env.LLAMA_URL ?? 'http://localhost:8080';
const MODULE = 'llamaClient';

/**
 * Factory — call once at startup.
 * @returns {{ complete: Function }}
 */
export function createLlamaClient() {
  return {
    /**
     * @param {{ model: string, prompt: string, max_tokens: number }} params
     * @returns {Promise<{ text: string, tokens_prompt: number, tokens_completion: number }>}
     */
    async complete({ prompt, max_tokens }) {
      let res;
      try {
        const { default: fetch } = await import('node-fetch');
        res = await fetch(`${LLAMA_URL}/completion`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            prompt,
            n_predict: max_tokens,
            stream: false,
            temperature: 0.3,
          }),
        });
      } catch (err) {
        err.message = `[${MODULE}] llama-server request failed: ${err.message}`;
        throw err;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`[${MODULE}] llama-server HTTP ${res.status}: ${body}`);
      }

      const json = await res.json();
      const text = json.content ?? json.text ?? '';
      const tokens_prompt     = json.tokens_evaluated ?? json.prompt_tokens ?? 0;
      const tokens_completion = json.tokens_predicted ?? json.completion_tokens ?? 0;

      return { text, tokens_prompt, tokens_completion };
    },
  };
}
