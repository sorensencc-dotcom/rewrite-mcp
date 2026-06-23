"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ReasoningTraceFormatter_1 = require("../../src/reasoning/arl/engine/ReasoningTraceFormatter");
(0, globals_1.describe)('ReasoningTraceFormatter', () => {
    (0, globals_1.it)('should return exactly 8 trace steps in deterministic order', () => {
        const coherence = {
            score: 0.95,
            details: 'Coherence analysis passed',
        };
        const semantic = {
            score: 0.88,
            details: 'Semantic alignment verified',
        };
        const temporal = {
            score: 0.92,
            details: 'Temporal consistency confirmed',
        };
        const causal = {
            score: 0.85,
            details: 'Causal chain established',
        };
        const narrative = {
            score: 0.90,
            details: 'Narrative impact evaluated',
        };
        const composite = {
            score: 0.89,
            details: 'Composite reasoning synthesized',
        };
        const confidence = {
            score: 0.91,
            details: 'Confidence threshold met',
        };
        const drift = {
            score: 0.12,
            details: 'Minimal drift detected',
        };
        const trace = (0, ReasoningTraceFormatter_1.formatReasoningTrace)(coherence, semantic, temporal, causal, narrative, composite, confidence, drift);
        (0, globals_1.expect)(trace).toHaveLength(8);
        (0, globals_1.expect)(trace[0].subsystem).toBe('coherence');
        (0, globals_1.expect)(trace[1].subsystem).toBe('semantic');
        (0, globals_1.expect)(trace[2].subsystem).toBe('temporal');
        (0, globals_1.expect)(trace[3].subsystem).toBe('causal');
        (0, globals_1.expect)(trace[4].subsystem).toBe('narrative');
        (0, globals_1.expect)(trace[5].subsystem).toBe('composite');
        (0, globals_1.expect)(trace[6].subsystem).toBe('confidence');
        (0, globals_1.expect)(trace[7].subsystem).toBe('drift');
    });
    (0, globals_1.it)('should correctly populate score and summary for each trace step', () => {
        const coherence = {
            score: 0.95,
            details: 'Coherence analysis passed',
        };
        const semantic = {
            score: 0.88,
            details: 'Semantic alignment verified',
        };
        const temporal = {
            score: 0.92,
            details: 'Temporal consistency confirmed',
        };
        const causal = {
            score: 0.85,
            details: 'Causal chain established',
        };
        const narrative = {
            score: 0.90,
            details: 'Narrative impact evaluated',
        };
        const composite = {
            score: 0.89,
            details: 'Composite reasoning synthesized',
        };
        const confidence = {
            score: 0.91,
            details: 'Confidence threshold met',
        };
        const drift = {
            score: 0.12,
            details: 'Minimal drift detected',
        };
        const trace = (0, ReasoningTraceFormatter_1.formatReasoningTrace)(coherence, semantic, temporal, causal, narrative, composite, confidence, drift);
        (0, globals_1.expect)(trace[0]).toEqual({
            subsystem: 'coherence',
            summary: 'Coherence analysis passed',
            score: 0.95,
        });
        (0, globals_1.expect)(trace[1]).toEqual({
            subsystem: 'semantic',
            summary: 'Semantic alignment verified',
            score: 0.88,
        });
        (0, globals_1.expect)(trace[2]).toEqual({
            subsystem: 'temporal',
            summary: 'Temporal consistency confirmed',
            score: 0.92,
        });
        (0, globals_1.expect)(trace[3]).toEqual({
            subsystem: 'causal',
            summary: 'Causal chain established',
            score: 0.85,
        });
        (0, globals_1.expect)(trace[4]).toEqual({
            subsystem: 'narrative',
            summary: 'Narrative impact evaluated',
            score: 0.90,
        });
        (0, globals_1.expect)(trace[5]).toEqual({
            subsystem: 'composite',
            summary: 'Composite reasoning synthesized',
            score: 0.89,
        });
        (0, globals_1.expect)(trace[6]).toEqual({
            subsystem: 'confidence',
            summary: 'Confidence threshold met',
            score: 0.91,
        });
        (0, globals_1.expect)(trace[7]).toEqual({
            subsystem: 'drift',
            summary: 'Minimal drift detected',
            score: 0.12,
        });
    });
    (0, globals_1.it)('should handle edge case scores (0 and 1)', () => {
        const zeroScores = {
            score: 0,
            details: 'Zero detail',
        };
        const maxScores = {
            score: 1,
            details: 'Max detail',
        };
        const trace = (0, ReasoningTraceFormatter_1.formatReasoningTrace)(maxScores, zeroScores, maxScores, zeroScores, maxScores, zeroScores, maxScores, zeroScores);
        (0, globals_1.expect)(trace[0].score).toBe(1);
        (0, globals_1.expect)(trace[1].score).toBe(0);
        (0, globals_1.expect)(trace[2].score).toBe(1);
        (0, globals_1.expect)(trace[3].score).toBe(0);
    });
});
//# sourceMappingURL=ReasoningTraceFormatter.test.js.map