"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfDiagnosticsEngine = void 0;
class SelfDiagnosticsEngine {
    constructor() {
        this.lastState = null;
        this.stateHistory = [];
    }
    runDiagnostics(currentState) {
        this.stateHistory.push(currentState);
        this.lastState = currentState;
        const checks = [];
        // Check 1: Subsystem health
        checks.push(this.checkSubsystemHealth(currentState));
        // Check 2: Drift-of-drift (now has full history)
        const driftOfDriftScore = this.calculateDriftOfDrift();
        checks.push({
            name: 'Drift-of-Drift Detection',
            status: driftOfDriftScore < 0.2 ? 'healthy' : driftOfDriftScore < 0.5 ? 'degraded' : 'failed',
            message: `Drift of drift score: ${driftOfDriftScore.toFixed(3)}`,
            lastRun: new Date(),
        });
        // Check 3: Weighting sanity
        const weightingSanityScore = this.validateWeightingSanity(currentState);
        checks.push({
            name: 'Weighting Model Sanity',
            status: weightingSanityScore > 0.8 ? 'healthy' : weightingSanityScore > 0.6 ? 'degraded' : 'failed',
            message: `Weighting sanity score: ${weightingSanityScore.toFixed(3)}`,
            lastRun: new Date(),
        });
        // Check 4: Contradiction detection
        const contradictions = this.detectInternalContradictions(currentState);
        checks.push({
            name: 'Self-Contradiction Detection',
            status: contradictions.hasSelfContradictions ? 'failed' : 'healthy',
            message: contradictions.hasSelfContradictions
                ? `Found ${contradictions.contradictions.length} contradictions`
                : 'No contradictions detected',
            lastRun: new Date(),
        });
        // Compute integrity score
        const reasoningIntegrityScore = this.computeIntegrityScore(driftOfDriftScore, weightingSanityScore, contradictions);
        const overallStatus = checks.every((c) => c.status === 'healthy') ? 'healthy' : checks.some((c) => c.status === 'failed') ? 'failed' : 'degraded';
        return {
            timestamp: new Date(),
            overallStatus,
            checks,
            driftOfDriftScore,
            weightingSanityScore,
            reasoningIntegrityScore,
            subsystemScores: {
                compositeReasoning: currentState.compositeReasoning.score,
                confidenceModel: currentState.confidenceModel.score,
                driftCalculator: currentState.driftCalculator.score,
                verdictSynthesizer: currentState.verdictSynthesizer.score,
            },
            recommendations: this.generateRecommendations(checks, reasoningIntegrityScore),
        };
    }
    checkSubsystemHealth(state) {
        const scores = [
            state.compositeReasoning.score,
            state.confidenceModel.score,
            state.driftCalculator.score,
            state.verdictSynthesizer.score,
        ];
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const allHealthy = scores.every((s) => s > 0.7);
        return {
            name: 'Subsystem Health',
            status: allHealthy ? 'healthy' : avgScore > 0.5 ? 'degraded' : 'failed',
            message: `Average subsystem score: ${avgScore.toFixed(3)}`,
            lastRun: new Date(),
        };
    }
    calculateDriftOfDrift() {
        if (this.stateHistory.length < 2)
            return 0;
        const last = this.stateHistory[this.stateHistory.length - 1];
        const secondLast = this.stateHistory[this.stateHistory.length - 2];
        const varianceChange = Math.abs(last.driftCalculator.variance - secondLast.driftCalculator.variance);
        const avgVariance = (last.driftCalculator.variance + secondLast.driftCalculator.variance) / 2;
        const driftChange = avgVariance > 0.001 ? varianceChange / avgVariance : 0;
        return Math.min(driftChange, 1.0);
    }
    validateWeightingSanity(state) {
        const weights = [
            state.compositeReasoning.score,
            state.confidenceModel.score,
            state.driftCalculator.score,
            state.verdictSynthesizer.score,
        ];
        const sum = weights.reduce((a, b) => a + b, 0);
        const normalized = weights.map((w) => w / (sum || 1));
        // Check if any weight is unreasonably dominant (>0.8)
        const hasExtremeWeight = normalized.some((w) => w > 0.8);
        if (hasExtremeWeight)
            return 0.4;
        // Check if distribution is reasonable
        const avgWeight = 0.25;
        const variance = normalized.reduce((acc, w) => acc + (w - avgWeight) ** 2, 0) / normalized.length;
        return Math.max(0, 1 - variance * 2);
    }
    detectInternalContradictions(state) {
        const contradictions = [];
        // Check if high confidence but low composite reasoning (contradiction)
        if (state.confidenceModel.score > 0.8 && state.compositeReasoning.score < 0.5) {
            contradictions.push({
                subsystemA: 'ConfidenceModel',
                subsystemB: 'CompositeReasoning',
                nature: 'High confidence with low reasoning quality',
                severity: 0.7,
            });
        }
        // Check if low drift but high variance in drift calculation
        if (state.driftCalculator.score < 0.3 && state.driftCalculator.variance > 0.4) {
            contradictions.push({
                subsystemA: 'DriftCalculator',
                subsystemB: 'DriftVariance',
                nature: 'Unstable drift calculation',
                severity: 0.5,
            });
        }
        return {
            hasSelfContradictions: contradictions.length > 0,
            contradictions,
        };
    }
    computeIntegrityScore(driftOfDrift, weightingSanity, contradictions) {
        // Base score from subsystem health
        const scores = [
            this.lastState?.compositeReasoning.score ?? 0.5,
            this.lastState?.confidenceModel.score ?? 0.5,
            this.lastState?.driftCalculator.score ?? 0.5,
            this.lastState?.verdictSynthesizer.score ?? 0.5,
        ];
        const subsystemScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        let integrityScore = subsystemScore * 0.6;
        integrityScore += weightingSanity * 0.3;
        integrityScore -= driftOfDrift * 0.1;
        if (contradictions.hasSelfContradictions) {
            integrityScore *= 0.7; // Penalty for contradictions
        }
        return Math.max(0, Math.min(1, integrityScore));
    }
    generateRecommendations(checks, integrityScore) {
        const recommendations = [];
        const failedChecks = checks.filter((c) => c.status === 'failed');
        if (failedChecks.length > 0) {
            recommendations.push(`Address ${failedChecks.length} failed health check(s)`);
        }
        if (integrityScore < 0.5) {
            recommendations.push('Run operator feedback loop to recalibrate weights');
        }
        if (checks.some((c) => c.name === 'Drift-of-Drift Detection' && c.status !== 'healthy')) {
            recommendations.push('Investigate drift stability; consider running memory consistency validator');
        }
        return recommendations;
    }
    getStateHistory() {
        return [...this.stateHistory];
    }
}
exports.SelfDiagnosticsEngine = SelfDiagnosticsEngine;
//# sourceMappingURL=SelfDiagnosticsEngine.js.map