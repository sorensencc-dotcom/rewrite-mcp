"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.synthesizeVerdict = synthesizeVerdict;
function synthesizeVerdict(packet, scores, contradictions, coherence, semantic, temporal, causal, narrative, composite, confidence, drift) {
    if (scores.length === 0) {
        return {
            verdict: 'reject',
            confidence: 0,
            reasoningTrace: [],
            coherenceScore: coherence.overall,
            driftImpact: temporal.driftTemporalImpact,
            narrativeImpact: 'No hypotheses to evaluate',
            recommendedAction: 'reject'
        };
    }
    // Use coherence score from CoherenceEngine
    const coherenceScore = coherence.overall;
    // Use temporal drift impact from TemporalConsistencyEngine
    const driftImpact = temporal.driftTemporalImpact;
    // Determine verdict based on coherence and contradictions
    const verdict = determineVerdict(coherenceScore, contradictions.hasCritical);
    const calculatedConfidence = calculateConfidence(coherenceScore, contradictions.contradictions.length);
    // Build reasoning trace
    const reasoningTrace = buildReasoningTrace(scores, contradictions, coherenceScore, causal, narrative);
    // Determine narrative impact
    const narrativeImpact = determineNarrativeImpact(scores, driftImpact, packet);
    return {
        verdict,
        confidence: calculatedConfidence,
        reasoningTrace,
        coherenceScore,
        driftImpact,
        narrativeImpact,
        recommendedAction: verdict
    };
}
function determineVerdict(coherenceScore, hasCritical) {
    if (hasCritical) {
        return 'reject';
    }
    if (coherenceScore > 0.7) {
        return 'accept';
    }
    if (coherenceScore > 0.4) {
        return 'revise';
    }
    return 'reject';
}
function calculateConfidence(coherenceScore, contradictionCount) {
    // Confidence decreases with contradictions
    const contradictionPenalty = Math.min(0.5, contradictionCount * 0.1);
    return Math.max(0, coherenceScore - contradictionPenalty);
}
function buildReasoningTrace(scores, contradictions, coherenceScore, causal, narrative) {
    const trace = [];
    // Add top-scoring hypothesis
    if (scores.length > 0) {
        const bestScore = scores.reduce((best, current) => current.stabilityAlignment > best.stabilityAlignment ? current : best);
        trace.push({
            step: 'Hypothesis Evaluation',
            evidence: `Best hypothesis: "${bestScore.hypothesis.description.substring(0, 50)}..."`,
            score: bestScore.stabilityAlignment
        });
    }
    // Add contradiction findings
    contradictions.contradictions.slice(0, 3).forEach(c => {
        trace.push({
            step: 'Contradiction Detection',
            evidence: c.description,
            score: -c.severity
        });
    });
    // Add overall coherence
    trace.push({
        step: 'Coherence Analysis',
        evidence: `Overall coherence: ${(coherenceScore * 100).toFixed(1)}%`,
        score: coherenceScore
    });
    // Add causal reasoning findings
    if (causal.conflictCount > 0 || causal.missingPrerequisites.length > 0) {
        trace.push({
            step: 'Causal Analysis',
            evidence: `Causal strength: ${(causal.causalStrength * 100).toFixed(1)}%. Conflicts: ${causal.conflictCount}, Missing prerequisites: ${causal.missingPrerequisites.length}`,
            score: causal.overall
        });
    }
    // Add narrative impact findings
    if (narrative.reinforcementScore > 0 || narrative.contradictionScore > 0 || narrative.dilutionScore > 0) {
        trace.push({
            step: 'Narrative Impact Analysis',
            evidence: `Reinforcement: ${(narrative.reinforcementScore * 100).toFixed(1)}%. Contradiction: ${(narrative.contradictionScore * 100).toFixed(1)}%, Dilution: ${(narrative.dilutionScore * 100).toFixed(1)}%`,
            score: narrative.overall
        });
    }
    return trace;
}
function determineNarrativeImpact(scores, driftImpact, packet) {
    if (scores.length === 0)
        return 'No narrative impact (no evaluation)';
    const avgContinuity = scores.reduce((sum, s) => sum + s.narrativeContinuity, 0) / scores.length;
    if (driftImpact > 0.4) {
        return `High drift risk (${(driftImpact * 100).toFixed(1)}%). Narrative coherence: ${(avgContinuity * 100).toFixed(1)}%`;
    }
    if (avgContinuity < 0.3) {
        return `Poor narrative alignment. Consider revising candidate against narrative spine.`;
    }
    return `Acceptable narrative impact. Drift: ${(driftImpact * 100).toFixed(1)}%, Continuity: ${(avgContinuity * 100).toFixed(1)}%`;
}
//# sourceMappingURL=VerdictSynthesizer.js.map