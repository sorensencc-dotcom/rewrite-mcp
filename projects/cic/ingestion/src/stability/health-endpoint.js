// CIC Stability Soak — Health Check Endpoint
// Exposed at GET /health/stability — returns current soak state & metrics

import express from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

const router = express.Router();

// Shared metrics store (in production, use a metrics registry like prom-client)
let globalStabilityState = {
  startTime: null,
  processId: process.pid,
  phase: '7.15-7.20',
  status: 'starting', // starting, running, paused, completed, failed
  duration: null,
  metricsLastUpdated: null,
  currentMetrics: {
    driftAvg: 0,
    contradictionAvg: 0,
    adversarialRate: 0,
    stabilityScore: 0,
    threshold: 0.75,
  },
  errors: [],
  warnings: [],
};

/**
 * POST /health/stability/heartbeat
 * Called by the soak runner every 30s to report health
 */
router.post('/heartbeat', (req, res) => {
  const { status, metrics, error } = req.body;

  globalStabilityState.status = status || 'running';
  globalStabilityState.metricsLastUpdated = new Date();

  if (metrics) {
    globalStabilityState.currentMetrics = {
      ...globalStabilityState.currentMetrics,
      ...metrics,
    };
  }

  if (error) {
    globalStabilityState.errors.push({
      timestamp: new Date(),
      message: error,
    });
    // Keep only last 20 errors
    if (globalStabilityState.errors.length > 20) {
      globalStabilityState.errors = globalStabilityState.errors.slice(-20);
    }
  }

  // Check for metric stalls
  const now = new Date();
  if (globalStabilityState.metricsLastUpdated) {
    const msSinceUpdate = now - globalStabilityState.metricsLastUpdated;
    if (msSinceUpdate > 5 * 60 * 1000) {
      globalStabilityState.warnings.push({
        timestamp: now,
        message: `Metrics stalled for ${Math.round(msSinceUpdate / 1000)}s`,
      });
    }
  }

  res.json({
    ok: true,
    received: new Date(),
    state: globalStabilityState,
  });
});

/**
 * GET /health/stability
 * Returns current soak state and whether it's healthy
 */
router.get('/', (req, res) => {
  const now = new Date();
  const msSinceUpdate = globalStabilityState.metricsLastUpdated
    ? now - globalStabilityState.metricsLastUpdated
    : null;

  const isHealthy =
    globalStabilityState.status === 'running' &&
    msSinceUpdate &&
    msSinceUpdate < 5 * 60 * 1000; // Must have updated in last 5 min

  res.status(isHealthy ? 200 : 503).json({
    healthy: isHealthy,
    process: {
      pid: globalStabilityState.processId,
      uptime: process.uptime(),
    },
    soak: {
      phase: globalStabilityState.phase,
      status: globalStabilityState.status,
      startTime: globalStabilityState.startTime,
      duration: globalStabilityState.duration,
      metricsLastUpdated: globalStabilityState.metricsLastUpdated,
      secondsSinceLastUpdate: msSinceUpdate
        ? Math.round(msSinceUpdate / 1000)
        : null,
    },
    metrics: {
      driftAvg: globalStabilityState.currentMetrics.driftAvg,
      contradictionAvg: globalStabilityState.currentMetrics.contradictionAvg,
      adversarialRate: globalStabilityState.currentMetrics.adversarialRate,
      stabilityScore: globalStabilityState.currentMetrics.stabilityScore,
      threshold: globalStabilityState.currentMetrics.threshold,
    },
    diagnostics: {
      errorCount: globalStabilityState.errors.length,
      warningCount: globalStabilityState.warnings.length,
      recentErrors: globalStabilityState.errors.slice(-5),
      recentWarnings: globalStabilityState.warnings.slice(-5),
    },
  });
});

/**
 * POST /health/stability/start
 * Called by stability runner on startup
 */
router.post('/start', (req, res) => {
  const { duration } = req.body;

  globalStabilityState = {
    ...globalStabilityState,
    startTime: new Date(),
    status: 'running',
    duration,
    metricsLastUpdated: new Date(),
    errors: [],
    warnings: [],
  };

  res.json({
    ok: true,
    soak: globalStabilityState,
  });
});

/**
 * POST /health/stability/end
 * Called by stability runner on completion
 */
router.post('/end', (req, res) => {
  const { status, reason } = req.body;

  globalStabilityState.status = status || 'completed';
  if (reason) {
    globalStabilityState.warnings.push({
      timestamp: new Date(),
      message: `Soak ended: ${reason}`,
    });
  }

  res.json({
    ok: true,
    soak: globalStabilityState,
  });
});

// Export state getter for programmatic access
export function getStabilityState() {
  return globalStabilityState;
}

export function setStabilityState(newState) {
  Object.assign(globalStabilityState, newState);
}

export default router;
