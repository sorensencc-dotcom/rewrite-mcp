/**
 * Control Plane — Runs Route + In-Memory Run Store
 * File: services/control-plane/routes/runs.js | Version: 1.0.0 | Date: 2026-05-15
 *
 * Exports:
 *   runStore  — singleton store used by pipelines.js to record new runs
 *   handler() — route handler for GET /runs and GET /runs/:id
 */

'use strict';

import { createLogger } from '../../../castironforge/src/cic/cic/core/logger.js';

const log = createLogger('control-plane/runs');

// ---------------------------------------------------------------------------
// Window helpers
// ---------------------------------------------------------------------------

const WINDOW_MS = {
  '1h':  3_600_000,
  '6h':  21_600_000,
  '24h': 86_400_000,
  '7d':  604_800_000,
};

function windowMs(w) {
  return WINDOW_MS[w] ?? WINDOW_MS['1h'];
}

// ---------------------------------------------------------------------------
// Run Store (singleton, in-memory)
// ---------------------------------------------------------------------------

export const runStore = {
  _runs: new Map(), // id → run object

  /**
   * Record a new run (called by pipelines route when a pipeline is triggered).
   * @param {{ id: string, pipelineId: string, inputs: Object }} run
   * @returns {Object} the stored run
   */
  create({ id, pipelineId, inputs }) {
    const run = {
      id,
      pipelineId,
      status: 'running',
      inputs: inputs ?? {},
      outputs: null,
      logs: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
      durationMs: null,
    };
    this._runs.set(id, run);
    log.info('run.created', { id, pipelineId });
    return run;
  },

  /**
   * Append a log entry to a run.
   * @param {string} id
   * @param {{ level: string, module: string, msg: string }} entry
   */
  appendLog(id, entry) {
    const run = this._runs.get(id);
    if (run) run.logs.push({ ...entry, ts: Date.now() });
  },

  /**
   * Complete (resolve or reject) a run.
   * @param {string} id
   * @param {{ status: 'completed'|'failed', outputs?: Object, error?: string }} result
   */
  complete(id, { status, outputs, error }) {
    const run = this._runs.get(id);
    if (!run) { log.warn('run.complete.notFound', { id }); return; }
    const now = Date.now();
    run.status      = status;
    run.outputs     = outputs ?? null;
    run.completedAt = new Date(now).toISOString();
    run.durationMs  = now - new Date(run.startedAt).getTime();
    if (error) run.error = error;
    log.info('run.completed', { id, status, durationMs: run.durationMs });
  },

  /**
   * List runs with optional filters.
   * @param {{ pipelineId?: string, status?: string, window?: string }} filters
   * @returns {Object[]}
   */
  list({ pipelineId, status, window: win } = {}) {
    const cutoff = Date.now() - windowMs(win ?? '1h');
    return [...this._runs.values()]
      .filter(r => new Date(r.startedAt).getTime() >= cutoff)
      .filter(r => !pipelineId || r.pipelineId === pipelineId)
      .filter(r => !status || r.status === status)
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  },

  /**
   * Get a single run by ID.
   * @param {string} id
   * @returns {Object|undefined}
   */
  get(id) {
    return this._runs.get(id);
  },
};

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * Dispatch runs requests.
 * @param {'list'|'get'} action
 * @param {{ id?: string, query?: Object }} params
 * @returns {{ status: number, body: Object }}
 */
export function handler(action, params = {}) {
  if (action === 'list') {
    const runs = runStore.list(params.query ?? {});
    return { status: 200, body: runs };
  }

  if (action === 'get') {
    const run = runStore.get(params.id);
    if (!run) {
      return { status: 404, body: null, error: `RUN_NOT_FOUND: ${params.id}` };
    }
    return { status: 200, body: run };
  }

  return { status: 400, body: null, error: `RUNS_UNKNOWN_ACTION: ${action}` };
}
