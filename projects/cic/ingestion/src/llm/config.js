/**
 * config.js
 * @version 1.1.0
 * @date 2026-05-17
 *
 * Builds a validated ControllerConfig from environment variables.
 * All keys have explicit defaults. Missing required secrets throw at startup.
 *
 * v1.1.0 changes:
 *   - Added validation: prompt.maxTokens must be >= context.maxTokens (D8)
 *
 * Environment variables (prefix: LLM_):
 *   LLM_MODEL                   default: claude-sonnet-4-6
 *   LLM_SYSTEM_PROMPT           default: (generic research assistant prompt)
 *   LLM_CACHE_THRESHOLD         default: 0.92
 *   LLM_CONTEXT_MAX_TOKENS      default: 4096
 *   LLM_PROMPT_MAX_TOKENS       default: 8192
 *   LLM_COMPLETION_MAX_TOKENS   default: 2048
 *   LLM_COMPLETION_MIN_TOKENS   default: 256
 *   LLM_HARD_TOKEN_LIMIT        default: 16384
 */

const MODULE = 'config';

const DEFAULTS = {
  model:                  'claude-sonnet-4-6',
  systemPrompt:           'You are a precise research assistant. Answer using only the provided context. If the context is insufficient, say so explicitly.',
  cacheSimilarity:        0.92,
  contextMaxTokens:       4096,
  promptMaxTokens:        8192,
  completionMaxTokens:    2048,
  completionMinTokens:    256,
  hardTokenLimit:         16384,
};

/**
 * Parse and validate config from process.env.
 * Throws on type errors or invariant violations. Never returns partial config.
 *
 * @returns {import('./controller.js').ControllerConfig}
 */
export function buildConfig() {
  const model        = _str('LLM_MODEL',         DEFAULTS.model);
  const systemPrompt = _str('LLM_SYSTEM_PROMPT',  DEFAULTS.systemPrompt);

  const cacheSimilarity     = _float('LLM_CACHE_THRESHOLD',       DEFAULTS.cacheSimilarity,     0, 1);
  const contextMaxTokens    = _int('LLM_CONTEXT_MAX_TOKENS',      DEFAULTS.contextMaxTokens,    1);
  const promptMaxTokens     = _int('LLM_PROMPT_MAX_TOKENS',       DEFAULTS.promptMaxTokens,     1);
  const completionMaxTokens = _int('LLM_COMPLETION_MAX_TOKENS',   DEFAULTS.completionMaxTokens, 1);
  const completionMinTokens = _int('LLM_COMPLETION_MIN_TOKENS',   DEFAULTS.completionMinTokens, 1);
  const hardTokenLimit      = _int('LLM_HARD_TOKEN_LIMIT',        DEFAULTS.hardTokenLimit,      1);

  // Invariant: completion budget
  if (completionMinTokens > completionMaxTokens) {
    throw new Error(
      `[${MODULE}] LLM_COMPLETION_MIN_TOKENS (${completionMinTokens}) must be ≤ LLM_COMPLETION_MAX_TOKENS (${completionMaxTokens})`
    );
  }

  // Invariant: prompt window must cover context window (D8)
  if (promptMaxTokens < contextMaxTokens) {
    throw new Error(
      `[${MODULE}] LLM_PROMPT_MAX_TOKENS (${promptMaxTokens}) must be ≥ LLM_CONTEXT_MAX_TOKENS (${contextMaxTokens}); ` +
      `a prompt that cannot fit its own context budget will always drop chunks`
    );
  }

  if (promptMaxTokens + completionMaxTokens > hardTokenLimit) {
    console.warn(
      `[${MODULE}] promptMaxTokens (${promptMaxTokens}) + completionMaxTokens (${completionMaxTokens}) ` +
      `exceeds hardTokenLimit (${hardTokenLimit}); controller will trim at runtime`
    );
  }

  return {
    model,
    systemPrompt,
    cache:      { similarityThreshold: cacheSimilarity },
    context:    { maxTokens: contextMaxTokens },
    prompt:     { maxTokens: promptMaxTokens },
    completion: { maxTokens: completionMaxTokens, minTokens: completionMinTokens },
    limits:     { hardTokenLimit },
  };
}

// ---------------------------------------------------------------------------
// Env helpers — all throw with explicit variable name on type error
// ---------------------------------------------------------------------------

function _str(key, fallback) {
  const v = process.env[key];
  return (v !== undefined && v.length > 0) ? v : fallback;
}

function _float(key, fallback, min, max) {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) throw new Error(`[${MODULE}] ${key} must be a finite float, got: "${raw}"`);
  if (n < min || n > max) throw new Error(`[${MODULE}] ${key} must be in [${min}, ${max}], got: ${n}`);
  return n;
}

function _int(key, fallback, min = 0) {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isInteger(n)) throw new Error(`[${MODULE}] ${key} must be an integer, got: "${raw}"`);
  if (n < min) throw new Error(`[${MODULE}] ${key} must be ≥ ${min}, got: ${n}`);
  return n;
}
