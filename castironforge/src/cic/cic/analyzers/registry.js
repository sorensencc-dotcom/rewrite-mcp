/**
 * CIC Analyzer Registry
 * File: cic/analyzers/registry.js | Version: 1.0.0 | Date: 2026-05-16
 *
 * Maps analyzer keys → IExtractor-compatible module namespaces.
 * Both "image" and "image:v2" resolve to ImageAnalyzerV2 (canonical).
 *
 * To add a future analyzer:
 *   1. Import the module namespace: import * as MyAnalyzer from './MyAnalyzer.js'
 *   2. Add its key(s) to ANALYZERS below.
 *   3. Export it from index.js.
 */

import * as ImageAnalyzerV2 from './ImageAnalyzerV2.js';

/**
 * Frozen analyzer registry. Keys are the string identifiers used by the
 * orchestrator DAG node type field.
 * @type {Readonly<Record<string, object>>}
 */
export const ANALYZERS = Object.freeze({
  'image':    ImageAnalyzerV2,
  'image:v2': ImageAnalyzerV2,
});

/**
 * Resolves an analyzer by key.
 * @param {string} name - e.g. "image" or "image:v2"
 * @returns {object|null} - IExtractor-compatible module, or null if not found
 */
export function getAnalyzer(name) {
  return ANALYZERS[name] ?? null;
}
