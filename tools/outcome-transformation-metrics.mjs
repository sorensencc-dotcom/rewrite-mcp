/**
 * tools/outcome-transformation-metrics.mjs
 *
 * Outcome-Driven Enterprise AI Transformation Metrics Evaluator (act-03).
 * Replaces ambiguous "hours saved" vanity metrics with verified business
 * outcomes: completed end-to-end workflows, conversion deltas, and revenue
 * transaction volume (grounded in Deloitte State of AI 2026 audit findings).
 */

const VANITY_METRIC_KEYS = new Set([
  'hours_saved',
  'estimated_hours_saved',
  'minutes_saved',
  'self_reported_time_saved',
  'developer_hours_saved'
]);

/**
 * Audits a telemetry payload and flags ungrounded "hours saved" vanity metrics.
 * @param {Record<string, unknown>} payload
 * @returns {{ valid: boolean, flaggedVanityKeys: string[], reason?: string }}
 */
export function validateOutcomeMetricsPayload(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, flaggedVanityKeys: [], reason: 'INVALID_PAYLOAD' };
  }

  const flaggedVanityKeys = Object.keys(payload).filter(k =>
    VANITY_METRIC_KEYS.has(k.toLowerCase())
  );

  const hasOutcomeMetrics =
    typeof payload.completedWorkflows === 'number' &&
    typeof payload.totalInitiatedWorkflows === 'number' &&
    typeof payload.baselineConversions === 'number' &&
    typeof payload.postRedesignConversions === 'number';

  if (flaggedVanityKeys.length > 0 && !hasOutcomeMetrics) {
    return {
      valid: false,
      flaggedVanityKeys,
      reason: 'VANITY_METRIC_REJECTED: Replace hours_saved estimates with verified workflow completion and conversion delta metrics.'
    };
  }

  if (!hasOutcomeMetrics) {
    return {
      valid: false,
      flaggedVanityKeys,
      reason: 'MISSING_OUTCOME_METRICS: completedWorkflows, totalInitiatedWorkflows, baselineConversions, and postRedesignConversions are required.'
    };
  }

  return { valid: true, flaggedVanityKeys };
}

/**
 * Computes verified conversion delta, workflow completion rate, and transformation tier.
 * @param {object} metrics
 * @param {number} metrics.baselineConversions
 * @param {number} metrics.postRedesignConversions
 * @param {number} metrics.completedWorkflows
 * @param {number} metrics.totalInitiatedWorkflows
 * @param {number} [metrics.revenueDeltaUsd=0]
 * @param {number} [metrics.workflowsRedesignedRatio=0]
 */
export function computeOutcomeTransformationScore({
  baselineConversions,
  postRedesignConversions,
  completedWorkflows,
  totalInitiatedWorkflows,
  revenueDeltaUsd = 0,
  workflowsRedesignedRatio = 0
} = {}) {
  if (totalInitiatedWorkflows <= 0 || baselineConversions < 0 || postRedesignConversions < 0) {
    throw new Error('INVALID_OUTCOME_INPUTS: Workflow and conversion counts must be non-negative with totalInitiatedWorkflows > 0.');
  }

  const conversionDelta = baselineConversions === 0
    ? (postRedesignConversions > 0 ? 1 : 0)
    : Number(((postRedesignConversions - baselineConversions) / baselineConversions).toFixed(4));

  const workflowCompletionRate = Number((completedWorkflows / totalInitiatedWorkflows).toFixed(4));

  let tier = 'STAGNANT';
  if (workflowsRedesignedRatio >= 0.5 && conversionDelta > 0 && workflowCompletionRate >= 0.8) {
    tier = 'TRANSFORMATIONAL';
  } else if (conversionDelta > 0 || workflowCompletionRate >= 0.6) {
    tier = 'INCREMENTAL';
  }

  return {
    conversionDelta,
    workflowCompletionRate,
    revenueDeltaUsd: Number(revenueDeltaUsd),
    workflowsRedesignedRatio: Number(workflowsRedesignedRatio),
    tier
  };
}
