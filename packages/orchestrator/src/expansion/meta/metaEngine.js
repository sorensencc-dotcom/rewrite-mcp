// File: packages/orchestrator/src/expansion/meta/metaEngine.js | Date: 2026-06-01 | v11.0.0-alpha
/**
 * CIC OS v11.0.0
 * Meta-Evolution Engine (MEE)
 * Controls the M1 → M5 reflexive evolution loop.
 */

export const META_ENGINE_VERSION = '11.0.0-alpha';

import { ingestMetaState, detectMetaPatterns } from './metaAnalytics.js';
import { buildMetaStrategy, scoreMetaStrategy, listMetaStrategyTypes } from './metaStrategy.js';
import { applyMetaStrategy } from './metaExecutor.js';
import { verifyMetaOutcome, rollbackMetaStrategy } from './metaRollback.js';

export function runMetaEvolutionCycle(history, optimizationModules) {
  if (!history || history.length === 0) return;

  const metaState = ingestMetaState(history);
  const patterns = detectMetaPatterns(metaState);

  // Generate candidate meta-strategies
  const candidates = listMetaStrategyTypes().map(type => 
    buildMetaStrategy(type, { patterns })
  );

  // Filter and execute positive meta-strategies
  for (const strategy of candidates) {
    const score = scoreMetaStrategy(strategy, metaState);
    if (score && score > 0) {
      const before = snapshotOptimizationModules(optimizationModules);
      applyMetaStrategy(strategy, optimizationModules);
      const after = snapshotOptimizationModules(optimizationModules);

      const outcome = verifyMetaOutcome(before, after);
      if (!outcome.coherenceImproved && !outcome.stabilityImproved) {
        rollbackMetaStrategy(strategy, optimizationModules);
      }
    }
  }
}

function snapshotOptimizationModules(mods) {
  return {
    strategyWeights: { ...(mods.strategyWeights || {}) },
    thresholds: { ...(mods.thresholds || {}) },
    retiredStrategies: new Set(mods.retiredStrategies || []),
    topologyMode: mods.topologyMode
  };
}
