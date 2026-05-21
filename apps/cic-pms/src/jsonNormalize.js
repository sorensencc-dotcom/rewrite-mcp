/**
 * apps/cic-pms/src/jsonNormalize.js
 * @version 1.0.0
 * @date 2026-05-20
 *
 * Centralized utility for normalizing model outputs into a consistent object structure.
 * Guarantees that downstream agents receive a valid object, even in safe-mode.
 */

'use strict';

/**
 * Normalizes raw output from a model or fallback chain into a structured object.
 * 
 * @param {any} raw - The raw output (string, object, or null).
 * @returns {Object} - A guaranteed object with safe_mode status.
 */
export function normalizeModelOutput(raw) {
  // 1. If already in safe-mode shape, pass through
  if (raw && typeof raw === 'object' && raw.safe_mode === true && raw.output) {
    return raw;
  }

  // 2. If it's a string, try to parse it
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      // If parsed successfully, ensure it's not null/primitive
      if (parsed && typeof parsed === 'object') {
        return {
          ...parsed,
          safe_mode: false
        };
      }
    } catch (err) {
      return {
        safe_mode: true,
        reason: "json_parse_failure",
        error: err.message,
        output: { raw }
      };
    }
  }

  // 3. If it's an object from a successful run (but missing safe_mode flag)
  if (raw && typeof raw === 'object' && !raw.safe_mode) {
    // If it has 'output' property (e.g. from geminiClient), it might be a raw result
    if (raw.output && typeof raw.output === 'string') {
      return normalizeModelOutput(raw.output);
    }
    return {
      ...raw,
      safe_mode: false
    };
  }

  // 4. Fallback for unexpected types or nulls
  return {
    safe_mode: true,
    reason: raw === null ? "null_output" : "unexpected_output_type",
    output: { raw }
  };
}
