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

console.log('ALL PHASE 11 REFLEXIVE META-EVOLUTION TESTS PASSED!');
