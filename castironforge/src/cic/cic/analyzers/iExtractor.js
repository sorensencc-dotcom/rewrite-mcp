// filename: iExtractor.js
// date: 2026-05-16
// version: 1.0.0

/**
 * IExtractor — shared interface contract for all CIC analyzers.
 *
 * Sourced from: cast-iron-charlie/cic-ingestion/src/extractor/iExtractor.js
 * Promoted to: cic/cic/analyzers/iExtractor.js (canonical location)
 */

/**
 * @typedef {Object} ExtractorJob
 * @property {string} jobId - UUID
 * @property {string} assetId - UUID
 * @property {string} mimeType
 * @property {Buffer} payload - raw asset bytes
 * @property {Object} meta - arbitrary k/v from ingestion stage
 */

/**
 * @typedef {Object} ExtractorResult
 * @property {string} jobId
 * @property {string} assetId
 * @property {string} extractorId
 * @property {string} version
 * @property {('ok'|'error'|'unsupported')} status
 * @property {number} durationMs
 * @property {Object|null} data - structured output, null on error/unsupported
 * @property {string|null} error - error message, null on ok
 */

/**
 * @typedef {Object} IExtractor
 * @property {Object} meta
 * @property {string} meta.id
 * @property {string} meta.version
 * @property {string[]} meta.accepts
 * @property {function(ExtractorJob): Promise<ExtractorResult>} extract
 * @property {function(): Promise<{ok: boolean, detail: string}>} healthCheck
 */

/**
 * Validates that a module satisfies the IExtractor interface.
 * @param {any} module
 * @throws {Error} if any required member is missing or wrong type
 */
export function validateExtractor(module) {
  if (!module || typeof module !== 'object') throw new Error('IExtractor: module must be an object');
  if (!module.meta) throw new Error('IExtractor: missing "meta" export');
  if (typeof module.meta.id !== 'string') throw new Error('IExtractor: meta.id must be a string');
  if (typeof module.meta.version !== 'string') throw new Error('IExtractor: meta.version must be a string');
  if (!Array.isArray(module.meta.accepts)) throw new Error('IExtractor: meta.accepts must be an array');
  if (typeof module.extract !== 'function') throw new Error('IExtractor: missing "extract" function');
  if (typeof module.healthCheck !== 'function') throw new Error('IExtractor: missing "healthCheck" function');
}
