"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatReasoningTrace = formatReasoningTrace;
function formatReasoningTrace(coherence, semantic, temporal, causal, narrative, composite, confidence, drift) {
    return [
        {
            subsystem: 'coherence',
            summary: coherence.details,
            score: coherence.score,
        },
        {
            subsystem: 'semantic',
            summary: semantic.details,
            score: semantic.score,
        },
        {
            subsystem: 'temporal',
            summary: temporal.details,
            score: temporal.score,
        },
        {
            subsystem: 'causal',
            summary: causal.details,
            score: causal.score,
        },
        {
            subsystem: 'narrative',
            summary: narrative.details,
            score: narrative.score,
        },
        {
            subsystem: 'composite',
            summary: composite.details,
            score: composite.score,
        },
        {
            subsystem: 'confidence',
            summary: confidence.details,
            score: confidence.score,
        },
        {
            subsystem: 'drift',
            summary: drift.details,
            score: drift.score,
        },
    ];
}
//# sourceMappingURL=ReasoningTraceFormatter.js.map