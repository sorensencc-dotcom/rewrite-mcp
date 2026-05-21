// apps/cic-pms/src/telemetryCache.js
// v1.0.0

const modelCalls = [];

/**
 * Records a model call event for real-time scoring.
 * @param {Object} event - The model call event.
 */
export function recordModelCall(event) {
  modelCalls.push({
    ...event,
    timestamp: Date.now()
  });
  // Keep the last 500 calls for analysis
  if (modelCalls.length > 500) {
    modelCalls.shift();
  }
}

/**
 * Retrieves the last N model calls.
 * @param {number} n - Number of calls to retrieve.
 * @returns {Array} - Array of model call events.
 */
export function getRecentModelCalls(n) {
  return modelCalls.slice(-n);
}
