/**
 * AssessmentEngine.js | v1.0.0 | 2026-05-30
 * Assess skill outputs against quality criteria
 */

class AssessmentEngine {
  constructor(options = {}) {
    this.criteria = options.criteria || this.defaultCriteria();
    this.assessments = [];
  }

  defaultCriteria() {
    return {
      accuracy: { weight: 0.3, threshold: 0.7 },
      consistency: { weight: 0.25, threshold: 0.75 },
      completeness: { weight: 0.25, threshold: 0.7 },
      efficiency: { weight: 0.2, threshold: 0.65 },
    };
  }

  assess(skillId, input, output) {
    const assessment = {
      skillId,
      timestamp: new Date().toISOString(),
      input: input ? { type: typeof input, size: JSON.stringify(input).length } : null,
      output: output ? { type: typeof output, size: JSON.stringify(output).length } : null,
      scores: {},
      passed: false,
      issues: [],
    };

    // Score accuracy: does output match expected structure?
    assessment.scores.accuracy = this.scoreAccuracy(output) * 100;
    if (assessment.scores.accuracy < this.criteria.accuracy.threshold * 100) {
      assessment.issues.push('Low accuracy: output structure mismatch');
    }

    // Score consistency: is output consistent with previous results?
    assessment.scores.consistency = this.scoreConsistency(skillId, output) * 100;
    if (assessment.scores.consistency < this.criteria.consistency.threshold * 100) {
      assessment.issues.push('Low consistency: output varies from baseline');
    }

    // Score completeness: is output complete?
    assessment.scores.completeness = this.scoreCompleteness(output) * 100;
    if (assessment.scores.completeness < this.criteria.completeness.threshold * 100) {
      assessment.issues.push('Low completeness: missing fields');
    }

    // Score efficiency: is output reasonable in size/complexity?
    assessment.scores.efficiency = this.scoreEfficiency(output) * 100;
    if (assessment.scores.efficiency < this.criteria.efficiency.threshold * 100) {
      assessment.issues.push('Low efficiency: excessive output size');
    }

    // Aggregate score
    const weights = this.criteria;
    assessment.aggregateScore =
      (assessment.scores.accuracy * weights.accuracy.weight +
        assessment.scores.consistency * weights.consistency.weight +
        assessment.scores.completeness * weights.completeness.weight +
        assessment.scores.efficiency * weights.efficiency.weight) /
      (weights.accuracy.weight + weights.consistency.weight + weights.completeness.weight + weights.efficiency.weight);

    assessment.passed = assessment.issues.length === 0;
    this.assessments.push(assessment);

    return assessment;
  }

  scoreAccuracy(output) {
    if (!output) return 0;
    if (typeof output !== 'object') return 0.5;
    if (Array.isArray(output) && output.length > 0) return 0.9;
    if (Object.keys(output).length > 0) return 0.8;
    return 0.3;
  }

  scoreConsistency(skillId, output) {
    // Compare against previous assessments for this skill
    const previous = this.assessments.filter((a) => a.skillId === skillId);
    if (previous.length === 0) return 0.85;

    const lastOutput = previous[previous.length - 1].output;
    if (!lastOutput || !output) return 0.7;
    if (typeof output !== typeof lastOutput.type) return 0.4;
    if (JSON.stringify(output).length > lastOutput.size * 1.5) return 0.6;

    return 0.85;
  }

  scoreCompleteness(output) {
    if (!output) return 0;
    if (typeof output !== 'object') return 0.5;
    if (Array.isArray(output)) {
      const itemCompleteness = output.map((item) => {
        if (typeof item !== 'object') return 0.5;
        return Math.min(1, Object.keys(item).length / 5);
      });
      return itemCompleteness.length > 0 ? itemCompleteness.reduce((a, b) => a + b) / itemCompleteness.length : 0.5;
    }
    return Math.min(1, Object.keys(output).length / 5);
  }

  scoreEfficiency(output) {
    if (!output) return 0.7;
    const size = JSON.stringify(output).length;
    if (size < 100) return 0.95;
    if (size < 10000) return 0.9;
    if (size < 100000) return 0.7;
    if (size < 1000000) return 0.3;
    return 0.1;
  }

  getAssessments(skillId = null) {
    if (!skillId) return this.assessments;
    return this.assessments.filter((a) => a.skillId === skillId);
  }

  reset() {
    this.assessments = [];
  }
}

export { AssessmentEngine };
export const createEngine = (options) => new AssessmentEngine(options);
export default { AssessmentEngine, createEngine };
