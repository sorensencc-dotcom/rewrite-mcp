/**
 * EscalationManager.js | v1.0.0 | 2026-05-30
 * Determine and track escalation decisions
 */

class EscalationManager {
  constructor(options = {}) {
    this.rules = options.rules || this.defaultRules();
    this.escalations = [];
    this.escalationThreshold = options.escalationThreshold || 3;
  }

  defaultRules() {
    return {
      lowScore: { threshold: 50, severity: 'medium' },
      lowConsistency: { threshold: 60, severity: 'medium' },
      repeatedFailures: { count: 3, severity: 'high' },
      drift: { severity: 'high' },
      resourceExhausted: { severity: 'critical' },
    };
  }

  evaluate(assessment, scoringResult, baselineComparison) {
    const escalationReasons = [];
    let maxSeverity = 'low';

    // Check score
    if (scoringResult && scoringResult.aggregate < this.rules.lowScore.threshold) {
      escalationReasons.push({
        rule: 'lowScore',
        message: `Score ${scoringResult.aggregate} below threshold ${this.rules.lowScore.threshold}`,
        severity: this.rules.lowScore.severity,
      });
      maxSeverity = this.severityMax(maxSeverity, this.rules.lowScore.severity);
    }

    // Check consistency
    if (assessment && assessment.scores && assessment.scores.consistency < this.rules.lowConsistency.threshold) {
      escalationReasons.push({
        rule: 'lowConsistency',
        message: `Consistency ${assessment.scores.consistency} below threshold`,
        severity: this.rules.lowConsistency.severity,
      });
      maxSeverity = this.severityMax(maxSeverity, this.rules.lowConsistency.severity);
    }

    // Check drift
    if (baselineComparison && baselineComparison.hasDrift) {
      escalationReasons.push({
        rule: 'drift',
        message: 'Metric drift detected against baseline',
        severity: this.rules.drift.severity,
      });
      maxSeverity = this.severityMax(maxSeverity, this.rules.drift.severity);
    }

    const shouldEscalate = escalationReasons.length > 0;

    if (shouldEscalate) {
      const escalation = {
        timestamp: new Date().toISOString(),
        skillId: assessment?.skillId || 'unknown',
        reasons: escalationReasons,
        severity: maxSeverity,
        shouldEscalate: true,
      };
      this.escalations.push(escalation);
      return escalation;
    }

    return {
      timestamp: new Date().toISOString(),
      skillId: assessment?.skillId || 'unknown',
      reasons: [],
      severity: 'low',
      shouldEscalate: false,
    };
  }

  severityMax(s1, s2) {
    const order = { low: 0, medium: 1, high: 2, critical: 3 };
    return order[s1] > order[s2] ? s1 : s2;
  }

  getEscalations(skillId = null) {
    if (!skillId) return this.escalations;
    return this.escalations.filter((e) => e.skillId === skillId);
  }

  getEscalationStats() {
    const stats = {
      totalEscalations: this.escalations.length,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byRule: {},
    };

    this.escalations.forEach((e) => {
      if (e.severity in stats.bySeverity) {
        stats.bySeverity[e.severity] += 1;
      }
      e.reasons.forEach((r) => {
        stats.byRule[r.rule] = (stats.byRule[r.rule] || 0) + 1;
      });
    });

    return stats;
  }

  reset() {
    this.escalations = [];
  }
}

export { EscalationManager };
export const createManager = (options) => new EscalationManager(options);
export default { EscalationManager, createManager };
