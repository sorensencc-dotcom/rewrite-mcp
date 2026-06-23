"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelIntrospectionEngine = void 0;
class ModelIntrospectionEngine {
    introspect(expansion) {
        const subsystemTraces = this.generateSubsystemTraces(expansion);
        const entityAlignments = this.generateEntityAlignments(expansion);
        const causalChains = this.generateCausalChains(expansion);
        const temporalOrderings = this.generateTemporalOrderings(expansion);
        return {
            id: expansion.id,
            timestamp: expansion.timestamp,
            subsystemTraces,
            entityAlignments,
            causalChains,
            temporalOrderings,
        };
    }
    generateSubsystemTraces(expansion) {
        return [
            {
                subsystemId: 'coherence',
                score: this.scoreCoherence(expansion),
                details: 'Evaluates narrative flow and logical consistency',
                reasoning: `Based on narrative contradiction level: ${expansion.narrativeSignals.contradiction}`,
            },
            {
                subsystemId: 'semantic',
                score: this.scoreSemantic(expansion),
                details: 'Evaluates semantic novelty and similarity',
                reasoning: `Similarity: ${expansion.semanticSignals.similarity}, Novelty: ${expansion.semanticSignals.novelty}`,
            },
            {
                subsystemId: 'temporal',
                score: this.scoreTemporal(expansion),
                details: 'Evaluates temporal consistency and recency',
                reasoning: `Recency: ${expansion.temporalSignals.recency}, Drift: ${expansion.temporalSignals.sequenceDrift}`,
            },
            {
                subsystemId: 'causal',
                score: this.scoreCausal(expansion),
                details: 'Evaluates causal depth and loop detection',
                reasoning: `Depth: ${expansion.causalSignals.depthScore}, Loops: ${expansion.causalSignals.loopDetection}`,
            },
            {
                subsystemId: 'narrative',
                score: this.scoreNarrative(expansion),
                details: 'Evaluates narrative coherence and impact',
                reasoning: `Coherence: ${expansion.narrativeSignals.coherence}, Contradiction: ${expansion.narrativeSignals.contradiction}`,
            },
        ];
    }
    generateEntityAlignments(expansion) {
        return [
            {
                entityId: 'primary',
                alignmentScore: expansion.semanticSignals.similarity,
                semanticDetails: `Primary entity alignment: ${(expansion.semanticSignals.similarity * 100).toFixed(1)}% match`,
            },
        ];
    }
    generateCausalChains(expansion) {
        if (expansion.causalSignals.loopDetection > 0) {
            return [
                {
                    nodeId: 'node-1',
                    relationship: 'causally_depends_on',
                    target: 'node-2',
                    strength: expansion.causalSignals.depthScore,
                },
                {
                    nodeId: 'node-2',
                    relationship: 'causally_depends_on',
                    target: 'node-1',
                    strength: expansion.causalSignals.loopDetection,
                },
            ];
        }
        return [
            {
                nodeId: 'node-1',
                relationship: 'causally_depends_on',
                target: 'node-2',
                strength: expansion.causalSignals.depthScore,
            },
        ];
    }
    generateTemporalOrderings(expansion) {
        return [
            {
                eventId: 'expansion-event',
                timestamp: expansion.timestamp,
                sequencePosition: 1,
            },
        ];
    }
    scoreCoherence(expansion) {
        return 1 - expansion.narrativeSignals.contradiction;
    }
    scoreSemantic(expansion) {
        return (expansion.semanticSignals.similarity + (1 - expansion.semanticSignals.novelty)) / 2;
    }
    scoreTemporal(expansion) {
        return expansion.temporalSignals.recency * (1 - expansion.temporalSignals.sequenceDrift);
    }
    scoreCausal(expansion) {
        return expansion.causalSignals.depthScore * (1 - expansion.causalSignals.loopDetection);
    }
    scoreNarrative(expansion) {
        return expansion.narrativeSignals.coherence;
    }
}
exports.ModelIntrospectionEngine = ModelIntrospectionEngine;
//# sourceMappingURL=ModelIntrospectionEngine.js.map