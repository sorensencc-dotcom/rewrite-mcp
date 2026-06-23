"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeIntrospectable = makeIntrospectable;
exports.makeIncoherentExpansion = makeIncoherentExpansion;
function makeIntrospectable() {
    return {
        id: 'introspect-1',
        timestamp: new Date().toISOString(),
        content: 'A well-structured, coherent expansion suitable for introspection.',
        semanticSignals: { similarity: 0.75, novelty: 0.25 },
        temporalSignals: { recency: 0.85, sequenceDrift: 0.1 },
        narrativeSignals: { coherence: 0.8, contradiction: 0.1 },
        causalSignals: { depthScore: 0.6, loopDetection: 0.05 },
    };
}
function makeIncoherentExpansion() {
    return {
        id: 'incoherent-1',
        timestamp: new Date().toISOString(),
        content: 'Fragmented, contradictory expansion with poor narrative flow.',
        semanticSignals: { similarity: 0.3, novelty: 0.7 },
        temporalSignals: { recency: 0.4, sequenceDrift: 0.6 },
        narrativeSignals: { coherence: 0.2, contradiction: 0.85 },
        causalSignals: { depthScore: 0.85, loopDetection: 0.4 },
    };
}
//# sourceMappingURL=IntrospectionFixtures.js.map