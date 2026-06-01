/**
 * TelemetryEmitter.js | v1.0.0 | 2026-05-30
 * Telemetry collection and event emission
 */

class TelemetryCollector {
  constructor() {
    this.events = [];
    this.metrics = {
      totalItems: 0,
      successCount: 0,
      failureCount: 0,
      escalationCount: 0,
    };
    this.startTime = Date.now();
  }

  recordAssessment(skillId, output, assessment) {
    this.metrics.totalItems += 1;
    if (assessment.passed) {
      this.metrics.successCount += 1;
    } else {
      this.metrics.failureCount += 1;
    }
    this.events.push({
      type: 'assessment',
      timestamp: new Date().toISOString(),
      skillId,
      score: assessment.score || 0,
      passed: assessment.passed || false,
    });
  }

  recordEscalation(reason, severity) {
    this.metrics.escalationCount += 1;
    this.events.push({
      type: 'escalation',
      timestamp: new Date().toISOString(),
      reason,
      severity,
    });
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      eventCount: this.events.length,
    };
  }

  getEvents(limit = 50) {
    return this.events.slice(-limit);
  }

  reset() {
    this.events = [];
    this.metrics = { totalItems: 0, successCount: 0, failureCount: 0, escalationCount: 0 };
    this.startTime = Date.now();
  }
}

export { TelemetryCollector };
export const createCollector = () => new TelemetryCollector();
export default { TelemetryCollector, createCollector };
