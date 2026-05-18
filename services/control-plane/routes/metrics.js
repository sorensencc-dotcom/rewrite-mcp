/**
 * Control Plane — Metrics Route + In-Memory Metrics Store
 * File: services/control-plane/routes/metrics.js | Version: 1.0.0 | Date: 2026-05-15
 *
 * Derives metrics from the run store. Exposes:
 *   metricsStore — collects run events, computes latency/throughput/error-rate series
 *   handler()    — route handler for GET /metrics
 */

'use strict';

import { createLogger } from '../../../castironforge/src/cic/cic/core/logger.js';
import { runStore } from './runs.js';

const log = createLogger('control-plane/metrics');

// ---------------------------------------------------------------------------
// Window helpers
// ---------------------------------------------------------------------------

const WINDOW_MS = {
  '1h':  3_600_000,
  '6h':  21_600_000,
  '24h': 86_400_000,
  '7d':  604_800_000,
};

function windowMs(w) { return WINDOW_MS[w] ?? WINDOW_MS['1h']; }

// Bucket count per window (fixed)
const BUCKETS = 12;

// ---------------------------------------------------------------------------
// Compute helpers
// ---------------------------------------------------------------------------

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function bucketRuns(runs, bucketCount, windowStart) {
  const now = Date.now();
  const bucketSizeMs = (now - windowStart) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    start: windowStart + i * bucketSizeMs,
    end:   windowStart + (i + 1) * bucketSizeMs,
    runs:  [],
  }));

  runs.forEach(r => {
    const t = new Date(r.startedAt).getTime();
    const idx = Math.min(bucketCount - 1, Math.floor((t - windowStart) / bucketSizeMs));
    if (idx >= 0) buckets[idx].runs.push(r);
  });

  return buckets;
}

function isoLabel(ts) {
  return new Date(ts).toISOString().slice(11, 16); // HH:MM
}

// ---------------------------------------------------------------------------
// Metrics computation
// ---------------------------------------------------------------------------

function computeMetrics({ pipelineId, agentId, window: win } = {}) {
  const wMs = windowMs(win ?? '1h');
  const now  = Date.now();
  const windowStart = now - wMs;

  let runs = runStore.list({ window: win ?? '1h' });
  if (pipelineId) runs = runs.filter(r => r.pipelineId === pipelineId);
  // agentId filter not currently applicable at run level — noted for future
  if (agentId) {
    log.warn('metrics.agentId.filter.unsupported', { agentId });
  }

  const completedRuns = runs.filter(r => r.status === 'completed' && r.durationMs != null);
  const failedRuns    = runs.filter(r => r.status === 'failed');
  const buckets       = bucketRuns(runs, BUCKETS, windowStart);

  // Latency series
  const latencyLabels = buckets.map(b => isoLabel(b.start));
  const latencyP50 = buckets.map(b => {
    const vals = b.runs.filter(r => r.durationMs != null).map(r => r.durationMs).sort((a,b)=>a-b);
    return vals.length ? +(percentile(vals, 50) / 1000).toFixed(3) : 0;
  });
  const latencyP95 = buckets.map(b => {
    const vals = b.runs.filter(r => r.durationMs != null).map(r => r.durationMs).sort((a,b)=>a-b);
    return vals.length ? +(percentile(vals, 95) / 1000).toFixed(3) : 0;
  });

  // Throughput (runs/min per bucket)
  const bucketMinutes = (wMs / BUCKETS) / 60_000;
  const throughputLabels = latencyLabels;
  const throughputValues = buckets.map(b => +(b.runs.length / bucketMinutes).toFixed(2));

  // Error rate (%)
  const errorRateLabels = latencyLabels;
  const errorRateValues = buckets.map(b => {
    const total = b.runs.length;
    if (!total) return 0;
    const failed = b.runs.filter(r => r.status === 'failed').length;
    return +((failed / total) * 100).toFixed(1);
  });

  // Run counts by pipeline
  const pipelineIds = [...new Set(runs.map(r => r.pipelineId))];
  const runCountsLabels = buckets.map(b => isoLabel(b.start));
  const runCountsPipelines = pipelineIds.map(pid => ({
    id: pid,
    counts: buckets.map(b => b.runs.filter(r => r.pipelineId === pid).length),
  }));

  // Summary scalars
  const p50Overall = completedRuns.length
    ? +(percentile([...completedRuns.map(r=>r.durationMs)].sort((a,b)=>a-b), 50) / 1000).toFixed(3)
    : 0;
  const errorRateOverall = runs.length
    ? +((failedRuns.length / runs.length) * 100).toFixed(1)
    : 0;

  return [
    {
      name: 'latency',
      unit: 's',
      labels: latencyLabels,
      p50: latencyP50,
      p95: latencyP95,
      summary: { p50Overall },
    },
    {
      name: 'throughput',
      unit: 'runs/min',
      labels: throughputLabels,
      values: throughputValues,
    },
    {
      name: 'errorRate',
      unit: '%',
      labels: errorRateLabels,
      values: errorRateValues,
      summary: { overallPct: errorRateOverall },
    },
    {
      name: 'runCounts',
      unit: 'runs',
      labels: runCountsLabels,
      pipelines: runCountsPipelines,
      summary: { totalRuns: runs.length },
    },
  ];
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * @param {{ pipelineId?: string, agentId?: string, window?: string }} query
 * @returns {{ status: number, body: Object }}
 */
export function handler(query = {}) {
  try {
    const series = computeMetrics(query);
    return { status: 200, body: series };
  } catch (err) {
    log.error('metrics.compute.failed', { error: err.message });
    return { status: 500, body: null, error: `METRICS_COMPUTE_ERROR: ${err.message}` };
  }
}
