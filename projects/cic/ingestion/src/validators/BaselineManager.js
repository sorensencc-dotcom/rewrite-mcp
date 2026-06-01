/**
 * BaselineManager.js | v1.0.0 | 2026-05-30
 * Manage baseline metrics for skill performance
 */

class BaselineManager {
  constructor(options = {}) {
    this.baselines = new Map();
    this.history = [];
    this.updateThreshold = options.updateThreshold || 0.05;
  }

  setBaseline(skillId, metrics) {
    this.baselines.set(skillId, {
      metrics,
      timestamp: new Date().toISOString(),
      version: (this.baselines.get(skillId)?.version || 0) + 1,
    });

    this.history.push({
      skillId,
      action: 'set_baseline',
      metrics,
      timestamp: new Date().toISOString(),
    });
  }

  getBaseline(skillId) {
    return this.baselines.get(skillId) || null;
  }

  compareToBaseline(skillId, currentMetrics) {
    const baseline = this.getBaseline(skillId);
    if (!baseline) {
      return {
        hasDrift: false,
        variance: null,
        message: 'No baseline established',
      };
    }

    const variance = {};
    const driftDetected = {};

    for (const [key, baselineValue] of Object.entries(baseline.metrics)) {
      if (typeof baselineValue === 'number' && typeof currentMetrics[key] === 'number') {
        const pctChange = Math.abs((currentMetrics[key] - baselineValue) / baselineValue);
        variance[key] = {
          baseline: baselineValue,
          current: currentMetrics[key],
          pctChange: Math.round(pctChange * 10000) / 100,
        };
        driftDetected[key] = pctChange > this.updateThreshold;
      }
    }

    const hasDrift = Object.values(driftDetected).some((v) => v);

    return {
      hasDrift,
      variance,
      driftDetected,
      message: hasDrift ? 'Drift detected' : 'Within threshold',
    };
  }

  updateBaseline(skillId, currentMetrics) {
    const comparison = this.compareToBaseline(skillId, currentMetrics);
    if (comparison.hasDrift) {
      this.setBaseline(skillId, currentMetrics);
      return {
        updated: true,
        reason: 'Drift threshold exceeded',
        ...comparison,
      };
    }
    return {
      updated: false,
      reason: 'No significant drift',
      ...comparison,
    };
  }

  getBaselines() {
    const result = {};
    for (const [key, value] of this.baselines) {
      result[key] = value;
    }
    return result;
  }

  getHistory(skillId = null) {
    if (!skillId) return this.history;
    return this.history.filter((h) => h.skillId === skillId);
  }

  reset() {
    this.baselines.clear();
    this.history = [];
  }
}

export { BaselineManager };
export const createManager = (options) => new BaselineManager(options);
export default { BaselineManager, createManager };
