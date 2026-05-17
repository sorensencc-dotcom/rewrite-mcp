/**
 * CIC v3.0 — Pipeline: ingestToOrchestrate
 * File: cic/pipelines/ingestToOrchestrate.js | Version: 1.0.0 | Date: 2026-05-15
 */

import { ingest } from '../ingestion/v1.0.0/ingest/ingest.js';
import { createDag, runDag } from '../orchestrator/v3.0.0/dag/index.js';
import { createRegistry } from '../orchestrator/v3.0.0/registry/registry.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('pipeline.ingestToOrchestrate');

/**
 * @param {Object} options
 * @param {string} options.sourceType
 * @param {Object} options.sourceConfig
 * @param {import('../core/types.js').DagNode[]} options.dagNodes
 * @param {import('../core/types.js').DagEdge[]} options.dagEdges
 * @param {Object} options.modules
 * @returns {Promise<{ jobId: string, dagId: string, results: Object }>}
 */
export async function ingestToOrchestrate(options) {
  const { sourceType, sourceConfig, dagNodes = [], dagEdges = [], modules = {} } = options;

  log.info('start', { sourceType });

  const { jobId } = await ingest({ sourceType, sourceConfig });
  log.info('ingested', { jobId });

  const dag = createDag(dagNodes, dagEdges);
  const registry = createRegistry(modules);
  const results = await runDag(dag, { registry, jobId });

  log.info('complete', { dagId: dag.id });
  return { jobId, dagId: dag.id, results };
}
