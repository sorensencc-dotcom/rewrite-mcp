/**
 * CIC Ingestion v1.0.0 — Drift Tracking
 */

const _driftEvents = [];

/**
 * @param {Object} job
 * @param {string} reason
 */
export function recordDrift(job, reason) {
  _driftEvents.push({
    jobId: job?.id || null,
    reason,
    recordedAt: Date.now()
  });
}

export function listDrift() {
  return [..._driftEvents];
}
