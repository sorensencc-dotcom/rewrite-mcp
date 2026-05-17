// castironforge/scripts/manifests/orchestrator-v2.mjs
// Version: 1.1.0 | Date: 2026-05-16
// Fixed: was importing from non-existent ../../cic-ingestion/orchestrator-v2/index.js
// Added: analyzerBindings — pre-wired image analyzer bindings for DAG modules

import { createDag, runDag } from '../../src/cic/cic/orchestrator/v3.0.0/dag/index.js';
import { createRegistry } from '../../src/cic/cic/orchestrator/v3.0.0/registry/registry.js';
import { createScheduler } from '../../src/cic/cic/orchestrator/v3.0.0/scheduler/scheduler.js';
import * as ImageAnalyzerV2 from '../../src/cic/cic/analyzers/ImageAnalyzerV2.js';

/**
 * Pre-built analyzer bindings for use as DAG node type → module resolution.
 * Spread into `modules` when calling orchestrate() for image analysis DAGs.
 *
 * @example
 * import { orchestrate, analyzerBindings } from './orchestrator-v2.mjs';
 * await orchestrate({ nodes, edges, modules: { ...analyzerBindings, ...myModules } });
 *
 * @type {Readonly<Record<string, object>>}
 */
export const analyzerBindings = Object.freeze({
  'image':    ImageAnalyzerV2,
  'image:v2': ImageAnalyzerV2,
});

/**
 * @param {Object} options
 * @param {import('../../src/cic/cic/core/types.js').DagNode[]} options.nodes
 * @param {import('../../src/cic/cic/core/types.js').DagEdge[]} options.edges
 * @param {Object} options.modules
 * @param {Object} options.context
 * @returns {Promise<Object>}
 */
export async function orchestrate({ nodes = [], edges = [], modules = {}, context = {} } = {}) {
  const dag = createDag(nodes, edges);
  const registry = createRegistry(modules);
  return runDag(dag, { ...context, registry });
}

export { createScheduler };
