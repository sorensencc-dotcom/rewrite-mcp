/**
 * CIC Ingestion v1.0.0 — Dead Letter Queue
 */

const _dlq = [];

/**
 * @param {Object} job
 * @param {Error} error
 */
export function sendToDlq(job, error) {
  _dlq.push({
    job,
    errorMessage: error?.message || "Unknown error",
    failedAt: Date.now()
  });
}

export function listDlq() {
  return [..._dlq];
}
