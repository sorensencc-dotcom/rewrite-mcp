// Skill Runtime — Telemetry Module
// Records skill invocations, errors, and performance metrics

const telemetryData = {
  invocations: [],
  errors: [],
  metrics: {}
};

export class TelemetryCollector {
  constructor() {
    this.reset();
  }

  recordInvocation(skillName, payload, result, duration) {
    const entry = {
      timestamp: new Date().toISOString(),
      skillName,
      status: "success",
      duration,
      payloadSize: JSON.stringify(payload).length,
      resultSize: JSON.stringify(result).length
    };
    telemetryData.invocations.push(entry);
    this.updateMetrics(skillName, duration, "success");
    return entry;
  }

  recordError(skillName, error, payload, duration) {
    const entry = {
      timestamp: new Date().toISOString(),
      skillName,
      status: "error",
      duration,
      errorMessage: error?.message || String(error),
      errorType: error?.name || "Unknown",
      payloadSize: JSON.stringify(payload).length
    };
    telemetryData.errors.push(entry);
    this.updateMetrics(skillName, duration, "error");
    return entry;
  }

  updateMetrics(skillName, duration, status) {
    if (!telemetryData.metrics[skillName]) {
      telemetryData.metrics[skillName] = {
        totalInvocations: 0,
        successfulInvocations: 0,
        failedInvocations: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0
      };
    }

    const m = telemetryData.metrics[skillName];
    m.totalInvocations++;
    if (status === "success") {
      m.successfulInvocations++;
    } else {
      m.failedInvocations++;
    }
    m.totalDuration += duration;
    m.averageDuration = m.totalDuration / m.totalInvocations;
    m.minDuration = Math.min(m.minDuration, duration);
    m.maxDuration = Math.max(m.maxDuration, duration);
  }

  getMetrics(skillName) {
    if (skillName) {
      return telemetryData.metrics[skillName] || null;
    }
    return telemetryData.metrics;
  }

  getErrors(skillName) {
    if (skillName) {
      return telemetryData.errors.filter(e => e.skillName === skillName);
    }
    return telemetryData.errors;
  }

  getInvocations(skillName, limit = 100) {
    let invocations = telemetryData.invocations;
    if (skillName) {
      invocations = invocations.filter(i => i.skillName === skillName);
    }
    return invocations.slice(-limit);
  }

  reset() {
    telemetryData.invocations = [];
    telemetryData.errors = [];
    telemetryData.metrics = {};
  }

  export() {
    return {
      summary: {
        totalInvocations: telemetryData.invocations.length,
        totalErrors: telemetryData.errors.length,
        successRate:
          telemetryData.invocations.length > 0
            ? (
                ((telemetryData.invocations.length - telemetryData.errors.length) /
                  telemetryData.invocations.length) *
                100
              ).toFixed(2) + "%"
            : "N/A"
      },
      invocations: telemetryData.invocations,
      errors: telemetryData.errors,
      metrics: telemetryData.metrics
    };
  }
}

export const telemetry = new TelemetryCollector();
