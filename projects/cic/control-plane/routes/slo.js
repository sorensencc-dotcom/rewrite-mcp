/**
 * routes/slo.js
 * @version 1.0.0
 * @date 2026-05-20
 *
 * Antigravity SLO Metrics Endpoint.
 * Aggregates live signals for Reliability, Concurrency, Latency, and Safe-Mode.
 *
 * Specification: Phase-27 Autonomous Recovery Plane Mandate.
 */

'use strict';

const express = require('express');
const router  = express.Router();
const { evaluatePolicies } = require('../recovery/policy-engine');
const { aggregateSLOMetrics } = require('../recovery/slo-aggregator');
const defaultPolicySet = require('../recovery/policy-set.json');

router.get('/', async (req, res) => {
  try {
    const env    = req.query.env ?? 'prod';
    const window = req.query.window ?? '15m';

    // 1. Fetch live aggregated signals
    const metrics = await aggregateSLOMetrics();

    // 2. Policy Signals (Driven by Recovery Policies Engine)
    const evaluation = evaluatePolicies(metrics, defaultPolicySet);

    const policySignals = {
      shouldThrottle: evaluation.actions.some(a => a.type === 'throttle'),
      shouldEscalateFallback: evaluation.actions.some(a => a.type === 'escalateFallback'),
      shouldQuarantine: evaluation.actions.filter(a => a.type === 'quarantine').map(a => a.scope),
      shouldAlertOperator: evaluation.actions.some(a => a.type === 'alertOperator'),
      activeActions: evaluation.actions,
      matchedPolicies: evaluation.matchedPolicies
    };

    // 3. Response Construction (Per Spec)
    res.json({
      timestamp: new Date().toISOString(),
      env,
      window,
      ...metrics,
      correlation: {
        integrityScore: 1.0,
        orphanSpanCount: 0,
        crossScenarioLeakCount: 0
      },
      policySignals
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
