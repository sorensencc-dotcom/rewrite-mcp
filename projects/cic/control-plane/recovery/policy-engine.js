/**
 * recovery/policy-engine.js
 * @version 1.0.0
 * @date 2026-05-20
 *
 * Antigravity Recovery Policies Engine (C2).
 * Evaluates SLO metrics against declarative policy sets.
 */

'use strict';

/**
 * Resolves a dotted path (e.g., 'reliability.safeModeRate') against a metrics object.
 */
function resolveMetric(metrics, path) {
  return path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, metrics);
}

/**
 * Basic operator evaluation.
 */
function compare(actual, op, target) {
  if (actual === undefined) return false;
  
  switch (op) {
    case '>':  return actual > target;
    case '<':  return actual < target;
    case '>=': return actual >= target;
    case '<=': return actual <= target;
    case '==': return actual === target;
    case '!=': return actual !== target;
    default:   return false;
  }
}

/**
 * Evaluates a set of policies against the provided SLO metrics.
 * 
 * @param {Object} sloMetrics - Metrics from the SLO Metrics Plane.
 * @param {Object} policySet - The declarative policy set.
 * @returns {Object} - Actions to be taken and policies that matched.
 */
function evaluatePolicies(sloMetrics, policySet) {
  const actions = [];
  const matchedPolicies = [];

  if (!policySet || !Array.isArray(policySet.policies)) {
    return { actions, matchedPolicies };
  }

  for (const policy of policySet.policies) {
    const { when, action, id } = policy;
    
    if (!when || !action) continue;

    const actualValue = resolveMetric(sloMetrics, when.metric);
    
    if (compare(actualValue, when.op, when.value)) {
      matchedPolicies.push(id);
      actions.push({
        ...action,
        policyId: id,
        triggeredBy: when.metric,
        actualValue
      });
    }
  }

  return {
    actions,
    matchedPolicies,
    evaluatedAt: new Date().toISOString(),
    policyVersion: policySet.version
  };
}

module.exports = {
  evaluatePolicies
};
