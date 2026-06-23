"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const arlStore_1 = require("../../src/services/arlStore");
(0, globals_1.describe)('ARL Store', () => {
    (0, globals_1.it)('should store and retrieve trace data', async () => {
        const trace = [
            { subsystem: 'coherence', summary: 'Test', score: 0.95 },
        ];
        (0, arlStore_1.storeArlTrace)('test-1', trace);
        const retrieved = await (0, arlStore_1.getArlTrace)('test-1');
        (0, globals_1.expect)(retrieved).toEqual(trace);
    });
    (0, globals_1.it)('should store and retrieve composite scores', async () => {
        const composite = {
            coherence: 0.95,
            semantic: 0.88,
            temporal: 0.92,
            causal: 0.85,
            narrative: 0.90,
            overall: 0.90,
        };
        (0, arlStore_1.storeArlComposite)('test-2', composite);
        const retrieved = await (0, arlStore_1.getArlComposite)('test-2');
        (0, globals_1.expect)(retrieved).toEqual(composite);
    });
    (0, globals_1.it)('should store and retrieve drift vector', async () => {
        const drift = {
            semanticDrift: 0.05,
            temporalDrift: 0.08,
            narrativeDrift: 0.03,
            causalDrift: 0.12,
            compositeDrift: 0.07,
            overall: 0.07,
        };
        (0, arlStore_1.storeArlDrift)('test-3', drift);
        const retrieved = await (0, arlStore_1.getArlDrift)('test-3');
        (0, globals_1.expect)(retrieved).toEqual(drift);
    });
    (0, globals_1.it)('should return empty array for missing trace', async () => {
        const retrieved = await (0, arlStore_1.getArlTrace)('nonexistent');
        (0, globals_1.expect)(retrieved).toEqual([]);
    });
    (0, globals_1.it)('should return null for missing composite', async () => {
        const retrieved = await (0, arlStore_1.getArlComposite)('nonexistent');
        (0, globals_1.expect)(retrieved).toBeNull();
    });
    (0, globals_1.it)('should return null for missing drift', async () => {
        const retrieved = await (0, arlStore_1.getArlDrift)('nonexistent');
        (0, globals_1.expect)(retrieved).toBeNull();
    });
});
//# sourceMappingURL=arlStore.test.js.map