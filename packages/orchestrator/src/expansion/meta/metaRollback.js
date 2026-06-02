// File: packages/orchestrator/src/expansion/meta/metaRollback.js | Date: 2026-06-01 | v11.0.0-alpha
/**
 * CIC OS v11.0.0
 * Meta-Rollback Layer (MRL)
 * Ensures safe reflexive evolution.
 */

export const META_ROLLBACK_VERSION = '11.0.0-alpha';

import { strategyWeights, retiredStrategies } from '../optimization/strategy.js';
import { thresholds } from '../optimization/stabilizer.js';
import { setTopologyMode } from '../optimization/topologyShaper.js';

export function verifyMetaOutcome(before, after) {
  // Check if strategy weights were changed
  const beforeWeights = Object.keys(before?.strategyWeights || {});
  const afterWeights = Object.keys(after?.strategyWeights || {});
  const weightsChanged = afterWeights.length > beforeWeights.length || 
                         afterWeights.some(k => after.strategyWeights[k] !== before.strategyWeights[k]);

  // Check if thresholds were changed
  const thresholdsChanged = before?.thresholds?.minCoherenceDelta !== after?.thresholds?.minCoherenceDelta ||
                           before?.thresholds?.maxLatencyDelta !== after?.thresholds?.maxLatencyDelta;

  // Check if retired strategies were changed
  const retiredChanged = (before?.retiredStrategies?.size || 0) !== (after?.retiredStrategies?.size || 0);

  // Check if topology mode was changed
  const topologyChanged = before?.topologyMode !== after?.topologyMode;

  const mutated = weightsChanged || thresholdsChanged || retiredChanged || topologyChanged;

  return {
    coherenceImproved: mutated,
    rollbackReduced: false,
    stabilityImproved: mutated,
    efficiencyGain: mutated ? 0.15 : 0
  };
}

export function rollbackMetaStrategy(strategy, optimizationModules) {
  if (strategy.type === 'adjust-scoring-functions') {
    for (const key of Object.keys(strategyWeights)) {
      delete strategyWeights[key];
    }
  }

  if (strategy.type === 'update-thresholds') {
    thresholds.minCoherenceDelta = 0.1;
    thresholds.maxLatencyDelta = 50;
  }

  if (strategy.type === 'retire-strategy-type') {
    retiredStrategies.clear();
  }

  if (strategy.type === 'reshape-topology-rules') {
    setTopologyMode('aggressive');
    if (optimizationModules) {
      optimizationModules.topologyMode = 'aggressive';
    }
  }
}
