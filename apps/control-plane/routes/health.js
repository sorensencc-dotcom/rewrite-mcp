/**
 * routes/health.js
 * 
 * Health routes for the CIC Control Plane.
 * Provides the authoritative baseline health-check loader.
 * @version 1.0.0
 * @date 2026-05-21
 */

'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const { HealthCheckEngine } = require('../src/health-engine');

// Path to the baseline manifest relative to this file
const MANIFEST_PATH = path.join(__dirname, '../../../projects/cic/health/baseline.healthcheck.json');

/**
 * GET /health/baseline
 * Executes the authoritative system-level health probes defined in the manifest.
 */
router.get('/baseline', async (req, res) => {
  try {
    const engine = new HealthCheckEngine(MANIFEST_PATH);
    const results = await engine.run();
    
    // Log the result to the process stdout for observability
    process.stdout.write(JSON.stringify({
      ts: new Date().toISOString(),
      level: results.all_passed ? 'info' : 'warn',
      msg: 'health_baseline_completed',
      all_passed: results.all_passed,
      correlation_id: req.correlationId,
      failed_checks: results.checks.filter(c => !c.passed).map(c => c.id)
    }) + '\n');

    res.json(results);
  } catch (err) {
    process.stderr.write(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      msg: 'health_baseline_error',
      error: err.message,
      correlation_id: req.correlationId
    }) + '\n');
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
