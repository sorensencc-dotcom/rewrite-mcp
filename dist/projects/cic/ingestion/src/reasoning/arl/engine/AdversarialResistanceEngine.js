"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdversarialResistanceEngine = void 0;
class AdversarialResistanceEngine {
    analyze(expansion) {
        const signals = [];
        signals.push(...this.detectPromptInjection(expansion));
        signals.push(...this.detectCausalInversion(expansion));
        signals.push(...this.detectNarrativeHijack(expansion));
        signals.push(...this.detectPoisoning(expansion));
        const isAdversarial = signals.length > 0;
        const averageSeverity = signals.length > 0
            ? signals.reduce((sum, s) => sum + s.severity, 0) / signals.length
            : 0;
        let recommendedVerdictOverride;
        if (averageSeverity > 0.8) {
            recommendedVerdictOverride = 'REJECT';
        }
        else if (averageSeverity > 0.5) {
            recommendedVerdictOverride = 'QUARANTINE';
        }
        return {
            isAdversarial,
            signals,
            averageSeverity,
            recommendedVerdictOverride,
        };
    }
    detectPromptInjection(expansion) {
        const signals = [];
        const injectionKeywords = [
            'ignore previous',
            'override',
            'bypass',
            'execute command',
            'run system',
            'system prompt',
            'internal instruction',
        ];
        const contentLower = expansion.content.toLowerCase();
        const matchCount = injectionKeywords.filter((kw) => contentLower.includes(kw)).length;
        if (matchCount > 0) {
            const severity = Math.min(1, matchCount * 0.3);
            signals.push({
                type: 'PATTERN',
                severity,
                details: `Detected ${matchCount} prompt injection keywords`,
            });
        }
        return signals;
    }
    detectCausalInversion(expansion) {
        const signals = [];
        if (expansion.causalSignals.loopDetection > 0.7) {
            signals.push({
                type: 'CAUSAL_INVERSION',
                severity: expansion.causalSignals.loopDetection,
                details: 'Circular causal dependency detected',
            });
        }
        if (expansion.causalSignals.depthScore > 0.9) {
            signals.push({
                type: 'CAUSAL_INVERSION',
                severity: 0.6,
                details: 'Suspiciously deep causal chain',
            });
        }
        return signals;
    }
    detectNarrativeHijack(expansion) {
        const signals = [];
        const narrativeContradiction = expansion.narrativeSignals.contradiction;
        const semanticNovelty = expansion.semanticSignals.novelty;
        if (narrativeContradiction > 0.7 && semanticNovelty > 0.8) {
            signals.push({
                type: 'NARRATIVE_HIJACK',
                severity: (narrativeContradiction + semanticNovelty) / 2,
                details: 'High contradiction combined with high novelty suggests narrative manipulation',
            });
        }
        return signals;
    }
    detectPoisoning(expansion) {
        const signals = [];
        const coherenceScore = expansion.narrativeSignals.coherence;
        const semanticSimilarity = expansion.semanticSignals.similarity;
        if (coherenceScore < 0.3 && semanticSimilarity > 0.9) {
            signals.push({
                type: 'POISONING',
                severity: (1 - coherenceScore + semanticSimilarity) / 3,
                details: 'Low coherence with high semantic similarity indicates potential data poisoning',
            });
        }
        return signals;
    }
}
exports.AdversarialResistanceEngine = AdversarialResistanceEngine;
//# sourceMappingURL=AdversarialResistanceEngine.js.map