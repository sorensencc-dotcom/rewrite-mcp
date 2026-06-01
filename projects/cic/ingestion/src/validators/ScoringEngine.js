/**
 * ScoringEngine.js | v1.0.0 | 2026-05-30
 * Calculate and aggregate quality scores
 */

class ScoringEngine {
  constructor(options = {}) {
    this.weights = options.weights || {
      accuracy: 0.3,
      consistency: 0.25,
      completeness: 0.25,
      efficiency: 0.2,
    };
    this.scores = [];
    this.baseline = options.baseline || null;
  }

  score(assessment) {
    if (!assessment || !assessment.scores) {
      return { error: 'Invalid assessment', score: 0 };
    }

    const aggregate =
      (assessment.scores.accuracy * this.weights.accuracy +
        assessment.scores.consistency * this.weights.consistency +
        assessment.scores.completeness * this.weights.completeness +
        assessment.scores.efficiency * this.weights.efficiency) /
      Object.values(this.weights).reduce((a, b) => a + b, 0);

    const scoreRecord = {
      timestamp: new Date().toISOString(),
      skillId: assessment.skillId,
      individual: assessment.scores,
      aggregate: Math.round(aggregate * 100) / 100,
      passed: aggregate >= 70,
      variance: this.baseline ? Math.abs(aggregate - this.baseline) : null,
    };

    this.scores.push(scoreRecord);
    return scoreRecord;
  }

  getAggregateScore() {
    if (this.scores.length === 0) return null;
    const sum = this.scores.reduce((acc, s) => acc + s.aggregate, 0);
    return Math.round((sum / this.scores.length) * 100) / 100;
  }

  setBaseline(baseline) {
    this.baseline = baseline;
  }

  getBaseline() {
    return this.baseline;
  }

  getScores(skillId = null) {
    if (!skillId) return this.scores;
    return this.scores.filter((s) => s.skillId === skillId);
  }

  reset() {
    this.scores = [];
  }
}

export { ScoringEngine };
export const createScorer = (options) => new ScoringEngine(options);
export default { ScoringEngine, createScorer };
