/**
 * CIC Ingestion v1.0.0 — Queue Types
 */

/**
 * @typedef {Object} IngestionJob
 * @property {string} id
 * @property {string} sourceType
 * @property {string} payloadType
 * @property {Object} payload
 * @property {Object} [metadata]
 */

/**
 * @typedef {Object} QueueConfig
 * @property {number} maxRetries
 * @property {number} visibilityTimeoutMs
 * @property {number} retentionMs
 */
