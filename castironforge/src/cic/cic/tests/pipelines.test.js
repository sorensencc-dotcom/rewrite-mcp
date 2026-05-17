/**
 * CIC v3.0 — Pipeline Tests
 * File: cic/tests/pipelines.test.js | Version: 1.0.0 | Date: 2026-05-15
 */

import { harvestToIngest } from '../pipelines/harvestToIngest.js';
import { ingestToOrchestrate } from '../pipelines/ingestToOrchestrate.js';

export async function testPipelines() {
  // harvestToIngest
  const r1 = await harvestToIngest({
    harvesterType: 'file',
    harvesterConfig: { path: '/mock', mockContent: 'test' },
    sourceType: 'file',
  });
  if (!r1.jobId)          throw new Error('harvestToIngest: missing jobId');
  if (!r1.harvested?.id)  throw new Error('harvestToIngest: missing harvested.id');

  // ingestToOrchestrate with no nodes (valid empty DAG run)
  const r2 = await ingestToOrchestrate({
    sourceType: 'file',
    sourceConfig: { payload: {} },
    dagNodes: [],
    dagEdges: [],
    modules: {},
  });
  if (!r2.jobId)  throw new Error('ingestToOrchestrate: missing jobId');
  if (!r2.dagId)  throw new Error('ingestToOrchestrate: missing dagId');
}
