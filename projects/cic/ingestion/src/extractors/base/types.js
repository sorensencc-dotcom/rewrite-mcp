/**
 * projects/cic/ingestion/src/extractors/base/types.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Base types and contracts for CIC Extractors.
 */

/**
 * @typedef {"text"|"image"|"audio"|"video"|"signal"} ExtractorKind
 */

/**
 * @typedef {Object} ExtractorId
 * @property {string} name
 * @property {string} version
 * @property {ExtractorKind} kind
 */

/**
 * @typedef {"annotation"|"document"|"signal"|"link"} ArtifactType
 */

/**
 * @typedef {Object} ExtractorArtifact
 * @property {ArtifactType} type
 * @property {any} payload
 * @property {Object} [meta]
 * @property {ExtractorId} meta.extractor
 * @property {string} meta.createdAt (ISO8601)
 * @property {string} meta.region
 */

/**
 * @typedef {Object} ExtractorResult
 * @property {ExtractorId} extractor
 * @property {string} assetId
 * @property {string} region
 * @property {ExtractorArtifact[]} artifacts
 * @property {string[]} [warnings]
 */

/**
 * @typedef {Object} ExtractorInput
 * @property {Object} envelope - The full Canonical Asset Envelope
 * @property {string|null} text
 * @property {Array<Object>} media
 * @property {Object} metadata
 */

/**
 * @typedef {Object} ExtractorContext
 * @property {Function} logDebug
 * @property {Function} logWarn
 * @property {Function} logError
 * @property {Date} [deadline]
 * @property {AbortSignal} [abortSignal]
 * @property {Object} [deps] - Injected dependencies (llmClient, etc.)
 */
