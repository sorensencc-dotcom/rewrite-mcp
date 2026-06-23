"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ModelIntrospectionEngine_1 = require("../engine/ModelIntrospectionEngine");
const IntrospectionFixtures_1 = require("./fixtures/IntrospectionFixtures");
(0, vitest_1.describe)('Batch 3, Phase 7.19: Model Introspection Engine', () => {
    let engine;
    (0, vitest_1.beforeEach)(() => {
        engine = new ModelIntrospectionEngine_1.ModelIntrospectionEngine();
    });
    (0, vitest_1.describe)('Introspection trace generation', () => {
        (0, vitest_1.it)('should generate subsystem traces for introspectable expansion', () => {
            const expansion = (0, IntrospectionFixtures_1.makeIntrospectable)();
            const trace = engine.introspect(expansion);
            (0, vitest_1.expect)(trace.subsystemTraces).toHaveLength(5);
            (0, vitest_1.expect)(trace.subsystemTraces.map((t) => t.subsystemId)).toContain('coherence');
            (0, vitest_1.expect)(trace.subsystemTraces.map((t) => t.subsystemId)).toContain('semantic');
            (0, vitest_1.expect)(trace.subsystemTraces.map((t) => t.subsystemId)).toContain('temporal');
            (0, vitest_1.expect)(trace.subsystemTraces.map((t) => t.subsystemId)).toContain('causal');
            (0, vitest_1.expect)(trace.subsystemTraces.map((t) => t.subsystemId)).toContain('narrative');
        });
        (0, vitest_1.it)('should score subsystems appropriately', () => {
            const expansion = (0, IntrospectionFixtures_1.makeIntrospectable)();
            const trace = engine.introspect(expansion);
            const coherenceTrace = trace.subsystemTraces.find((t) => t.subsystemId === 'coherence');
            (0, vitest_1.expect)(coherenceTrace?.score).toBeGreaterThan(0.8);
        });
        (0, vitest_1.it)('should include reasoning details in traces', () => {
            const expansion = (0, IntrospectionFixtures_1.makeIntrospectable)();
            const trace = engine.introspect(expansion);
            trace.subsystemTraces.forEach((t) => {
                (0, vitest_1.expect)(t.reasoning).toBeDefined();
                (0, vitest_1.expect)(t.reasoning.length).toBeGreaterThan(0);
            });
        });
    });
    (0, vitest_1.describe)('Entity alignment generation', () => {
        (0, vitest_1.it)('should generate entity alignments', () => {
            const expansion = (0, IntrospectionFixtures_1.makeIntrospectable)();
            const trace = engine.introspect(expansion);
            (0, vitest_1.expect)(trace.entityAlignments.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should compute alignment scores from semantic signals', () => {
            const expansion = (0, IntrospectionFixtures_1.makeIntrospectable)();
            const trace = engine.introspect(expansion);
            const primaryAlignment = trace.entityAlignments.find((e) => e.entityId === 'primary');
            (0, vitest_1.expect)(primaryAlignment?.alignmentScore).toBeCloseTo(expansion.semanticSignals.similarity, 1);
        });
    });
    (0, vitest_1.describe)('Causal chain generation', () => {
        (0, vitest_1.it)('should detect causal loops when present', () => {
            const expansion = {
                ...(0, IntrospectionFixtures_1.makeIntrospectable)(),
                causalSignals: { depthScore: 0.8, loopDetection: 0.7 },
            };
            const trace = engine.introspect(expansion);
            (0, vitest_1.expect)(trace.causalChains.length).toBeGreaterThan(1);
            const hasLoop = trace.causalChains.some((c) => c.target === 'node-1' && c.nodeId === 'node-2');
            (0, vitest_1.expect)(hasLoop).toBe(true);
        });
        (0, vitest_1.it)('should generate linear causal chains for loop-free expansions', () => {
            const expansion = (0, IntrospectionFixtures_1.makeIntrospectable)();
            const trace = engine.introspect(expansion);
            (0, vitest_1.expect)(trace.causalChains.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('Temporal ordering generation', () => {
        (0, vitest_1.it)('should generate temporal ordering for events', () => {
            const expansion = (0, IntrospectionFixtures_1.makeIntrospectable)();
            const trace = engine.introspect(expansion);
            (0, vitest_1.expect)(trace.temporalOrderings.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(trace.temporalOrderings[0].timestamp).toBe(expansion.timestamp);
        });
        (0, vitest_1.it)('should assign sequence positions', () => {
            const expansion = (0, IntrospectionFixtures_1.makeIntrospectable)();
            const trace = engine.introspect(expansion);
            trace.temporalOrderings.forEach((t) => {
                (0, vitest_1.expect)(t.sequencePosition).toBeGreaterThan(0);
            });
        });
    });
    (0, vitest_1.describe)('Edge cases', () => {
        (0, vitest_1.it)('should handle incoherent expansions', () => {
            const expansion = (0, IntrospectionFixtures_1.makeIncoherentExpansion)();
            const trace = engine.introspect(expansion);
            (0, vitest_1.expect)(trace.subsystemTraces.length).toBe(5);
            const coherenceTrace = trace.subsystemTraces.find((t) => t.subsystemId === 'coherence');
            (0, vitest_1.expect)(coherenceTrace?.score).toBeLessThan(0.5);
        });
        (0, vitest_1.it)('should maintain trace integrity across all components', () => {
            const expansion = (0, IntrospectionFixtures_1.makeIntrospectable)();
            const trace = engine.introspect(expansion);
            (0, vitest_1.expect)(trace.id).toBe(expansion.id);
            (0, vitest_1.expect)(trace.timestamp).toBe(expansion.timestamp);
            (0, vitest_1.expect)(trace.subsystemTraces).toBeDefined();
            (0, vitest_1.expect)(trace.entityAlignments).toBeDefined();
            (0, vitest_1.expect)(trace.causalChains).toBeDefined();
            (0, vitest_1.expect)(trace.temporalOrderings).toBeDefined();
        });
    });
});
//# sourceMappingURL=ModelIntrospectionEngine.test.js.map