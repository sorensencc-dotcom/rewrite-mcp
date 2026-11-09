/**
 * TRM TDD Test Contract: act-03-enterprise-ai-transformation-metrics
 * Intent: Enterprise Ai Transformation Metrics
 * Target: rewrite-mcp
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateOutcomeMetricsPayload,
  computeOutcomeTransformationScore
} from '../tools/outcome-transformation-metrics.mjs';

test('act-03: rejects vanity hours_saved metrics lacking verified outcome telemetry', () => {
  const vanityOnly = validateOutcomeMetricsPayload({
    hours_saved: 120,
    estimated_hours_saved: 45
  });
  assert.equal(vanityOnly.valid, false);
  assert.match(vanityOnly.reason, /VANITY_METRIC_REJECTED/);
  assert.deepEqual(vanityOnly.flaggedVanityKeys, ['hours_saved', 'estimated_hours_saved']);

  const validOutcome = validateOutcomeMetricsPayload({
    completedWorkflows: 420,
    totalInitiatedWorkflows: 500,
    baselineConversions: 100,
    postRedesignConversions: 135
  });
  assert.equal(validOutcome.valid, true);
  assert.equal(validOutcome.flaggedVanityKeys.length, 0);
});

test('act-03: computes conversion delta, workflow completion rate, and transformation tier', () => {
  const transformational = computeOutcomeTransformationScore({
    baselineConversions: 200,
    postRedesignConversions: 270,
    completedWorkflows: 880,
    totalInitiatedWorkflows: 1000,
    revenueDeltaUsd: 48500,
    workflowsRedesignedRatio: 0.65
  });

  assert.equal(transformational.conversionDelta, 0.35);
  assert.equal(transformational.workflowCompletionRate, 0.88);
  assert.equal(transformational.revenueDeltaUsd, 48500);
  assert.equal(transformational.tier, 'TRANSFORMATIONAL');

  const stagnant = computeOutcomeTransformationScore({
    baselineConversions: 200,
    postRedesignConversions: 190,
    completedWorkflows: 400,
    totalInitiatedWorkflows: 1000,
    revenueDeltaUsd: 0,
    workflowsRedesignedRatio: 0.1
  });
  assert.equal(stagnant.conversionDelta, -0.05);
  assert.equal(stagnant.tier, 'STAGNANT');
});
