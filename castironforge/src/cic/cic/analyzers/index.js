/**
 * CIC Analyzers — Index
 * File: cic/analyzers/index.js | Version: 1.0.0 | Date: 2026-05-16
 *
 * Exposes:
 *  - IExtractor interface + validateExtractor()
 *  - ImageAnalyzerV2 named exports (meta, extract, healthCheck, sub-extractors)
 *  - getAnalyzer() registry resolver
 */

export { validateExtractor } from './iExtractor.js';

export {
  meta,
  extract,
  healthCheck,
  extractSceneGraph,
  extractFaceClusters,
  extractPlaceRecognition,
  extractCrossReferences
} from './ImageAnalyzerV2.js';

export { getAnalyzer, ANALYZERS } from './registry.js';
