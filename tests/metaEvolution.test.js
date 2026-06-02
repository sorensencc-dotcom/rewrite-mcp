// File: tests/metaEvolution.test.js | Date: 2026-06-01 | v11.0.0-alpha
/**
 * tests/metaEvolution.test.js
 * CIC OS v11.0.0
 * Reflexive Meta-Evolution Layer Test Suite
 *
 * Validates the M1 → M5 meta-evolution loop and all Phase 11 subsystems.
 */

import assert from 'node:assert';

// Phase 11 modules
import { runMetaEvolutionCycle, META_ENGINE_VERSION } from '../packages/orchestrator/src/expansion/meta/metaEngine.js';
import { ingestMetaState, detectMetaPatterns, META_ANALYTICS_VERSION } from '../packages/orchestrator/src/expansion/meta/metaAnalytics.js';
import { generateNewHeuristics, HEURISTIC_GENERATOR_VERSION } from '../packages/orchestrator/src/expansion/meta/heuristicGenerator.js';
import { buildMetaStrategy, scoreMetaStrategy, listMetaStrategyTypes, META_STRATEGY_VERSION } from '../packages/orchestrator/src/expansion/meta/metaStrategy.js';
import { applyMetaStrategy, META_EXECUTOR_VERSION } from '../packages/orchestrator/src/expansion/meta/metaExecutor.js';
import { verifyMetaOutcome, rollbackMetaStrategy, META_ROLLBACK_VERSION } from '../packages/orchestrator/src/expansion/meta/metaRollback.js';
import { strategyWeights, scoreStrategy, retiredStrategies } from '../packages/orchestrator/src/expansion/optimization/strategy.js';
import { thresholds } from '../packages/orchestrator/src/expansion/optimization/stabilizer.js';
import { topologyMode, setTopologyMode, reshapeTopology } from '../packages/orchestrator/src/expansion/optimization/topologyShaper.js';
import { generateStrategies } from '../packages/orchestrator/src/expansion/optimization/engine.js';

console.log('Running Phase 11 Reflexive Meta-Evolution Layer test suite...');

//
// M1 — Meta-State Ingestion
//
console.log(' - Running M1: Meta-State Ingestion Test...');
{
  const history = [];
  const metaState = ingestMetaState(history);

  assert.ok(metaState);
  assert.ok('coherenceTrend' in metaState);
  assert.ok('rollbackRate' in metaState);
  assert.ok('strategyPerformance' in metaState);

  console.log('   M1 Ingestion: PASSED');
}

//
// M2 — Meta-Pattern Detection
//
console.log(' - Running M2: Meta-Pattern Detection Test...');
{
  const patterns = detectMetaPatterns({
    coherenceTrend: 0,
    rollbackRate: 0,
    strategyPerformance: {}
  });

  assert.ok(patterns);
  assert.ok(Array.isArray(patterns.weakStrategies));
  assert.ok(Array.isArray(patterns.outdatedHeuristics));

  console.log('   M2 Pattern Detection: PASSED');
}

//
// M3 — Meta-Strategy Synthesis & Scoring
//
console.log(' - Running M3: Meta-Strategy Synthesis Test...');
{
  const types = listMetaStrategyTypes();
  assert.ok(types.length > 0);

  const strategy = buildMetaStrategy(types[0], { test: true });
  assert.equal(strategy.type, types[0]);

  const score = scoreMetaStrategy(strategy, {});
  assert.ok(score === undefined || typeof score === 'number');

  console.log('   M3 Synthesis: PASSED');
}

//
// M4 — Meta-Execution
//
console.log(' - Running M4: Meta-Execution Test...');
{
  const strategy = buildMetaStrategy('adjust-scoring-functions', {});
  const optimizationModules = {};

  // Should not throw
  applyMetaStrategy(strategy, optimizationModules);

  console.log('   M4 Execution: PASSED');
}

//
// M5 — Meta-Stabilization & Rollback
//
console.log(' - Running M5: Meta-Stabilization Test...');
{
  const before = {};
  const after = {};

  const outcome = verifyMetaOutcome(before, after);
  assert.ok(outcome);
  assert.ok('coherenceImproved' in outcome);

  // Should not throw
  rollbackMetaStrategy({ type: 'test' }, {});

  console.log('   M5 Stabilization: PASSED');
}

//
// Subsystem Version Integrity
//
console.log(' - Running Subsystem Version Integrity Test...');
{
  assert.ok(META_ENGINE_VERSION);
  assert.ok(META_ANALYTICS_VERSION);
  assert.ok(HEURISTIC_GENERATOR_VERSION);
  assert.ok(META_STRATEGY_VERSION);
  assert.ok(META_EXECUTOR_VERSION);
  assert.ok(META_ROLLBACK_VERSION);

  console.log('   Version Integrity: PASSED');
}

//
// Integration Loop Test
//
console.log(' - Running Meta-Evolution Integration Loop Test...');
{
  const history = [];
  const optimizationModules = {};

  // Should not throw
  runMetaEvolutionCycle(history, optimizationModules);

  console.log('   Integration Loop: PASSED');
}

function resetState() {
  setTopologyMode('aggressive');
  thresholds.minCoherenceDelta = 0.1;
  thresholds.maxLatencyDelta = 50;
  retiredStrategies.clear();
  for (const key of Object.keys(strategyWeights)) {
    delete strategyWeights[key];
  }
}

//
// Functional Meta-Evolution Integration & Scorer Mutation Test
//
console.log(' - Running Functional Scorer Mutation Test...');
{
  resetState();
  // 1. Setup mock history where 'workload-rebalance' behaves poorly
  const history = [
    { strategyType: 'workload-rebalance', coherenceDelta: -5.0, rolledBack: false },
    { strategyType: 'workload-rebalance', coherenceDelta: -3.0, rolledBack: false },
    { strategyType: 'capability-migration', coherenceDelta: 2.0, rolledBack: false }
  ];

  // 2. Before applying, check that strategyWeights is empty for workload-rebalance
  assert.strictEqual(strategyWeights['workload-rebalance'], undefined);

  // 3. Run meta-evolution cycle
  runMetaEvolutionCycle(history, { strategyWeights });

  // 4. Verify that workload-rebalance has been penalized
  assert.strictEqual(strategyWeights['workload-rebalance'], 0.5);
  // Verify that a strategy with positive delta was not penalized
  assert.strictEqual(strategyWeights['capability-migration'], undefined);

  // 5. Test scoring impact
  const testStrategy = { type: 'workload-rebalance' };
  const baseScore = scoreStrategy(testStrategy, {});
  assert.strictEqual(baseScore, 5); // 10 * 0.5 = 5

  // 6. Rollback meta-strategy to reset state for subsequent tests
  rollbackMetaStrategy({ type: 'adjust-scoring-functions' }, { strategyWeights });
  assert.strictEqual(strategyWeights['workload-rebalance'], undefined);

  console.log('   Functional Scorer Mutation: PASSED');
}

//
// Functional Threshold Tuning Test
//
console.log(' - Running Functional Threshold Tuning Test...');
{
  resetState();
  // 1. Setup mock history with stability risks (high rollback rate)
  const history = [
    { strategyType: 'workload-rebalance', coherenceDelta: 0.1, rolledBack: true },
    { strategyType: 'workload-rebalance', coherenceDelta: 0.2, rolledBack: true },
    { strategyType: 'capability-migration', coherenceDelta: 0.5, rolledBack: false }
  ];

  // 2. Before applying, thresholds are at default
  assert.strictEqual(thresholds.minCoherenceDelta, 0.1);

  // 3. Run meta cycle to trigger update-thresholds meta-strategy
  runMetaEvolutionCycle(history, { thresholds });

  // 4. Verify that threshold has been raised to 0.5 for stability
  assert.strictEqual(thresholds.minCoherenceDelta, 0.5);
  assert.strictEqual(thresholds.maxLatencyDelta, 30);

  // 5. Reset/Rollback thresholds back to default
  rollbackMetaStrategy({ type: 'update-thresholds' }, { thresholds });
  assert.strictEqual(thresholds.minCoherenceDelta, 0.1);
  assert.strictEqual(thresholds.maxLatencyDelta, 50);

  console.log('   Functional Threshold Tuning: PASSED');
}

//
// Functional Strategy Retirement Test
//
console.log(' - Running Functional Strategy Retirement Test...');
{
  resetState();
  // 1. Setup history where workload-rebalance consistently averages highly negative floor < -2.0
  const history = [
    { strategyType: 'workload-rebalance', coherenceDelta: -3.5, rolledBack: false },
    { strategyType: 'workload-rebalance', coherenceDelta: -2.5, rolledBack: false }
  ];

  // 2. Before applying, workload-rebalance is not retired
  assert.strictEqual(retiredStrategies.has('workload-rebalance'), false);

  // 3. Run meta cycle
  runMetaEvolutionCycle(history, { retiredStrategies });

  // 4. Verify that it has been retired
  assert.strictEqual(retiredStrategies.has('workload-rebalance'), true);

  // 5. Verify that generateStrategies skips retired types
  const generated = generateStrategies({});
  const hasWorkloadRebalance = generated.some(s => s.type === 'workload-rebalance');
  assert.strictEqual(hasWorkloadRebalance, false);

  // 6. Reset/Rollback retired strategies
  rollbackMetaStrategy({ type: 'retire-strategy-type' }, { retiredStrategies });
  assert.strictEqual(retiredStrategies.has('workload-rebalance'), false);

  console.log('   Functional Strategy Retirement: PASSED');
}

//
// Functional Topology Mode Test
//
console.log(' - Running Functional Topology Mode Test...');
{
  resetState();
  // 1. Setup history with high rollback rate to trigger stability mode
  const history = [
    { strategyType: 'workload-rebalance', coherenceDelta: 0.1, rolledBack: true },
    { strategyType: 'workload-rebalance', coherenceDelta: 0.2, rolledBack: true }
  ];

  // 2. Before applying, mode is aggressive
  assert.strictEqual(topologyMode, 'aggressive');
  const actionAggressive = reshapeTopology({}, {});
  assert.strictEqual(actionAggressive.action, 'reshape');

  // 3. Run meta cycle
  runMetaEvolutionCycle(history, { topologyMode });

  // 4. Verify that topologyMode has been flipped to conservative
  assert.strictEqual(topologyMode, 'conservative');
  const actionConservative = reshapeTopology({}, {});
  assert.strictEqual(actionConservative.action, 'hold');

  // 5. Reset/Rollback topology mode
  rollbackMetaStrategy({ type: 'reshape-topology-rules' }, { topologyMode });
  assert.strictEqual(topologyMode, 'aggressive');

  console.log('   Functional Topology Mode: PASSED');
}

console.log('ALL PHASE 11 REFLEXIVE META-EVOLUTION TESTS PASSED!');
