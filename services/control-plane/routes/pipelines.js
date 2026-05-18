/**
 * Control Plane — Pipelines Route
 * File: services/control-plane/routes/pipelines.js | Version: 1.0.0 | Date: 2026-05-15
 *
 * Manages the pipeline catalog and run triggering.
 * Reads pipelines from the CIC pipeline registry (static).
 * Triggers runs via the pipeline functions and records them in runStore.
 *
 * Exports handler(action, params) — called by index.js router.
 */

'use strict';

import { randomUUID } from 'node:crypto';
import { harvestToIngest }    from '../../../castironforge/src/cic/cic/pipelines/harvestToIngest.js';
import { ingestToOrchestrate } from '../../../castironforge/src/cic/cic/pipelines/ingestToOrchestrate.js';
import { createLogger }        from '../../../castironforge/src/cic/cic/core/logger.js';
import { runStore }            from './runs.js';

const log = createLogger('control-plane/pipelines');

// ---------------------------------------------------------------------------
// Pipeline catalog (static — derived from CIC pipeline exports)
// ---------------------------------------------------------------------------

const PIPELINE_CATALOG = [
  {
    id:      'harvestToIngest',
    name:    'harvestToIngest',
    version: '1.0.0',
    nodes:   ['HarvesterAgent', 'IngestorAgent'],
    nodeCount: 2,
    description: 'Harvest a source (web/file/sidecar) then ingest the payload into the queue.',
    inputSchema: {
      harvesterType:   { type: 'string', enum: ['web', 'file', 'sidecar'] },
      harvesterConfig: { type: 'object' },
      sourceType:      { type: 'string', enum: ['file', 'url', 'drive'] },
    },
    fn: harvestToIngest,
  },
  {
    id:      'ingestToOrchestrate',
    name:    'ingestToOrchestrate',
    version: '1.0.0',
    nodes:   ['IngestorAgent', 'Orchestrator-DAG'],
    nodeCount: 3,
    description: 'Ingest a source then run a DAG over the result via the orchestrator.',
    inputSchema: {
      sourceType:   { type: 'string', enum: ['file', 'url', 'drive'] },
      sourceConfig: { type: 'object' },
      dagNodes:     { type: 'array' },
      dagEdges:     { type: 'array' },
      modules:      { type: 'object' },
    },
    fn: ingestToOrchestrate,
  },
];

// ---------------------------------------------------------------------------
// Catalog helpers
// ---------------------------------------------------------------------------

function publicRecord(p) {
  // Strip the internal fn reference — never expose it in API responses
  const { fn: _fn, ...pub } = p;
  return pub;
}

function withLastRun(p) {
  const runs = runStore.list({ pipelineId: p.id, window: '24h' }).slice(0, 5);
  const last  = runs[0];
  return {
    ...publicRecord(p),
    lastRunAt:     last?.startedAt ?? null,
    lastRunStatus: last?.status    ?? null,
    lastRuns:      runs,
  };
}

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

async function triggerPipeline(pipelineId, payload) {
  const pipeline = PIPELINE_CATALOG.find(p => p.id === pipelineId);
  if (!pipeline) {
    return { status: 404, body: null, error: `PIPELINE_NOT_FOUND: ${pipelineId}` };
  }

  const runId = randomUUID();
  runStore.create({ id: runId, pipelineId, inputs: payload });

  // Execute asynchronously — do not await (fire-and-forget, audited via runStore)
  setImmediate(async () => {
    try {
      runStore.appendLog(runId, { level: 'info', module: 'control-plane', msg: 'pipeline.start' });
      const outputs = await pipeline.fn(payload ?? {});
      runStore.complete(runId, { status: 'completed', outputs });
    } catch (err) {
      log.error('pipeline.execute.failed', { pipelineId, runId, error: err.message });
      runStore.complete(runId, { status: 'failed', error: err.message });
    }
  });

  return {
    status: 202,
    body: {
      runId,
      pipelineId,
      status: 'running',
      startedAt: runStore.get(runId).startedAt,
    },
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * @param {'list'|'get'|'trigger'} action
 * @param {{ id?: string, payload?: Object }} params
 * @returns {Promise<{ status: number, body: Object|Object[]|null, error?: string }>}
 */
export async function handler(action, params = {}) {
  if (action === 'list') {
    const list = PIPELINE_CATALOG.map(withLastRun);
    log.info('pipelines.list', { count: list.length });
    return { status: 200, body: list };
  }

  if (action === 'get') {
    const p = PIPELINE_CATALOG.find(x => x.id === params.id);
    if (!p) {
      return { status: 404, body: null, error: `PIPELINE_NOT_FOUND: ${params.id}` };
    }
    log.info('pipelines.get', { id: params.id });
    return { status: 200, body: withLastRun(p) };
  }

  if (action === 'trigger') {
    log.info('pipelines.trigger', { id: params.id });
    return triggerPipeline(params.id, params.payload);
  }

  return { status: 400, body: null, error: `PIPELINES_UNKNOWN_ACTION: ${action}` };
}
