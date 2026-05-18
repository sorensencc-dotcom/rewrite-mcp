/**
 * CIC v3.0 — Pipelines Index
 * File: cic/pipelines/index.js | Version: 1.1.0 | Date: 2026-05-16
 */

export { harvestToIngest } from './harvestToIngest.js';
export { ingestToOrchestrate } from './ingestToOrchestrate.js';
export { runSidecar } from './sidecar.js';
export { createCorpus, mergeIntoCorpus, buildCorpus } from './corpusBuilder.js';
