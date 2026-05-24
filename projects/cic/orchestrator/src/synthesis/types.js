/**
 * projects/cic/orchestrator/src/synthesis/types.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Core types for the Synthesis Engine.
 */

/**
 * @typedef {Object} LensResult
 * @property {string} analysis - Prose analysis
 * @property {string[]} tags - Thematic tags
 * @property {number} confidence - 0.0 to 1.0
 */

/**
 * @typedef {Object} SynthesisResult
 * @property {string} assetId
 * @property {string} version - "1.0.0"
 * @property {string} executiveSummary
 * @property {Object} analysis
 * @property {string} analysis.technical
 * @property {string} analysis.historical
 * @property {string} analysis.narrative
 * @property {string[]} thematicTags
 * @property {string[]} suggestedChapters
 * @property {number} synthesisConfidence
 */
