/**
 * CIC v3.0 — Unified Entry Point
 * File: cic/index.js | Version: 3.1.0 | Date: 2026-05-16
 *
 * Subsystems:
 *  - core: shared types, errors, logger
 *  - harvester v2.0.0
 *  - ingestion v1.0.0
 *  - orchestrator v3.0.0
 *  - agents
 *  - pipelines
 *  - analyzers (ImageAnalyzerV2 + registry)
 */

export const version = '3.1.0';

export * as core from './core/index.js';
export * as harvester from './harvester/v2.0.0/index.js';
export * as ingestion from './ingestion/v1.0.0/index.js';
export * as orchestrator from './orchestrator/v3.0.0/index.js';
export * as agents from './agents/index.js';
export * as pipelines from './pipelines/index.js';
export * as analyzers from './analyzers/index.js';
