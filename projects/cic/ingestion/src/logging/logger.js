/**
 * logger.js
 * @version 1.0.0
 * @date 2026-05-17
 *
 * Structured JSON logger. All output goes to stdout as newline-delimited JSON.
 * Consumers (Cloudflare, log exporters) parse by line.
 *
 * Usage:
 *   import { log } from './src/logging/logger.js';
 *   log.info('llm_call', { user_id, intent, tokens_prompt, tokens_completion, strategy, cache_hit });
 *   log.error('qdrant_upsert_failed', { user_id, intent, err: err.message });
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

const ACTIVE_LEVEL = LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LEVELS.info;

function emit(level, msg, fields = {}) {
  if (LEVELS[level] < ACTIVE_LEVEL) return;
  const entry = {
    ts:    new Date().toISOString(),
    level,
    msg,
    ...fields,
  };
  // Remove undefined values
  const clean = JSON.parse(JSON.stringify(entry));
  process.stdout.write(JSON.stringify(clean) + '\n');
}

export const log = {
  debug: (msg, fields) => emit('debug', msg, fields),
  info:  (msg, fields) => emit('info',  msg, fields),
  warn:  (msg, fields) => emit('warn',  msg, fields),
  error: (msg, fields) => emit('error', msg, fields),

  /** Convenience: log an llm_call result from controller output */
  llmCall(params) {
    const { user_id, intent, tokens_prompt, tokens_completion, strategy, cache_hit, correlation_id } = params;
    emit('info', 'llm_call', { user_id, intent, tokens_prompt, tokens_completion, strategy, cache_hit, correlation_id });
  },

  /** Convenience: log a Qdrant upsert */
  qdrantUpsert(params) {
    const { user_id, intent, vector_size, collection, correlation_id } = params;
    emit('info', 'qdrant_upsert', { user_id, intent, vector_size: vector_size ?? 1536, collection, correlation_id });
  },

  /** Convenience: log an integration event (Postiz, Drive, Auth, Cloudflare) */
  integration(name, status, params = {}) {
    const level = status === 'ok' ? 'info' : 'error';
    emit(level, `integration_${status}`, { integration: name, ...params });
  },
};
