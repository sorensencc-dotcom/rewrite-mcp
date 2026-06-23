"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const server_1 = __importDefault(require("../../src/server"));
const arlStore_1 = require("../../src/services/arlStore");
(0, globals_1.describe)('Cognition ARL Routes', () => {
    (0, globals_1.beforeEach)(() => {
        // Populate cache with test data
        const testTrace = [
            { subsystem: 'coherence', summary: 'Test coherence', score: 0.95 },
            { subsystem: 'semantic', summary: 'Test semantic', score: 0.88 },
        ];
        const testComposite = {
            coherence: 0.95,
            semantic: 0.88,
            temporal: 0.92,
            causal: 0.85,
            narrative: 0.90,
            overall: 0.90,
        };
        const testDrift = {
            semanticDrift: 0.05,
            temporalDrift: 0.08,
            narrativeDrift: 0.03,
            causalDrift: 0.12,
            compositeDrift: 0.07,
            overall: 0.07,
        };
        (0, arlStore_1.storeArlTrace)('test-run-1', testTrace);
        (0, arlStore_1.storeArlComposite)('test-run-1', testComposite);
        (0, arlStore_1.storeArlDrift)('test-run-1', testDrift);
    });
    (0, globals_1.it)('GET /arl/trace/:id should return reasoning trace', async () => {
        const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/cognition/arl/trace/test-run-1');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.trace).toBeDefined();
        (0, globals_1.expect)(res.body.trace.length).toBe(2);
        (0, globals_1.expect)(res.body.trace[0].subsystem).toBe('coherence');
    });
    (0, globals_1.it)('GET /arl/composite/:id should return composite scores', async () => {
        const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/cognition/arl/composite/test-run-1');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.composite).toBeDefined();
        (0, globals_1.expect)(res.body.composite.coherence).toBe(0.95);
        (0, globals_1.expect)(res.body.composite.overall).toBe(0.90);
    });
    (0, globals_1.it)('GET /arl/drift/:id should return drift vector', async () => {
        const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/cognition/arl/drift/test-run-1');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.drift).toBeDefined();
        (0, globals_1.expect)(res.body.drift.semanticDrift).toBe(0.05);
        (0, globals_1.expect)(res.body.drift.overall).toBe(0.07);
    });
    (0, globals_1.it)('GET /arl/trace/:id should return empty array for missing id', async () => {
        const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/cognition/arl/trace/nonexistent');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.trace).toEqual([]);
    });
});
//# sourceMappingURL=cognitionArlRoutes.test.js.map