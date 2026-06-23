"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ARLv2SpecEngine_1 = require("../engine/ARLv2SpecEngine");
(0, vitest_1.describe)('Batch 3, Phase 7.22: ARL v2 Spec Engine', () => {
    let engine;
    (0, vitest_1.beforeEach)(() => {
        engine = new ARLv2SpecEngine_1.ARLv2SpecEngine();
    });
    (0, vitest_1.describe)('ARL v2 spec generation', () => {
        (0, vitest_1.it)('should generate complete ARL v2 specification', () => {
            const spec = engine.generateSpec();
            (0, vitest_1.expect)(spec).toBeDefined();
            (0, vitest_1.expect)(spec.subsystemProposals).toBeDefined();
            (0, vitest_1.expect)(spec.weightingModelV2).toBeDefined();
            (0, vitest_1.expect)(spec.driftModelV2).toBeDefined();
            (0, vitest_1.expect)(spec.governanceModelV2).toBeDefined();
            (0, vitest_1.expect)(spec.operatorUXV2).toBeDefined();
            (0, vitest_1.expect)(spec.status).toBe('draft');
        });
    });
    (0, vitest_1.describe)('Subsystem proposals', () => {
        (0, vitest_1.it)('should propose multiple new subsystems', () => {
            const spec = engine.generateSpec();
            (0, vitest_1.expect)(spec.subsystemProposals.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should structure proposals with required fields', () => {
            const spec = engine.generateSpec();
            spec.subsystemProposals.forEach((proposal) => {
                (0, vitest_1.expect)(proposal.name).toBeDefined();
                (0, vitest_1.expect)(proposal.purpose).toBeDefined();
                (0, vitest_1.expect)(proposal.inputs).toBeDefined();
                (0, vitest_1.expect)(proposal.outputs).toBeDefined();
            });
        });
        (0, vitest_1.it)('should reference preceding phases', () => {
            const spec = engine.generateSpec();
            const hasReference = spec.subsystemProposals.some((p) => p.precedingPhase);
            (0, vitest_1.expect)(hasReference).toBe(true);
        });
        (0, vitest_1.it)('should include diverse subsystem types', () => {
            const spec = engine.generateSpec();
            const names = spec.subsystemProposals.map((p) => p.name);
            (0, vitest_1.expect)(names.some((n) => n.includes('Predictive'))).toBe(true);
            (0, vitest_1.expect)(names.some((n) => n.includes('Adaptive'))).toBe(true);
        });
    });
    (0, vitest_1.describe)('Weighting model v2', () => {
        (0, vitest_1.it)('should define version 2.0', () => {
            const spec = engine.generateSpec();
            (0, vitest_1.expect)(spec.weightingModelV2.version).toBe('2.0');
        });
        (0, vitest_1.it)('should include all subsystem weights', () => {
            const spec = engine.generateSpec();
            const expectedSubsystems = ['coherence', 'semantic', 'temporal', 'causal', 'narrative'];
            expectedSubsystems.forEach((sub) => {
                (0, vitest_1.expect)(spec.weightingModelV2.subsystemWeights[sub]).toBeDefined();
                (0, vitest_1.expect)(spec.weightingModelV2.subsystemWeights[sub]).toBeGreaterThan(0);
            });
        });
        (0, vitest_1.it)('should sum weights appropriately', () => {
            const spec = engine.generateSpec();
            const total = Object.values(spec.weightingModelV2.subsystemWeights).reduce((a, b) => a + b, 0);
            (0, vitest_1.expect)(total).toBeCloseTo(1.0, 1);
        });
        (0, vitest_1.it)('should enable adaptive weighting', () => {
            const spec = engine.generateSpec();
            (0, vitest_1.expect)(spec.weightingModelV2.adaptiveWeighting).toBe(true);
            (0, vitest_1.expect)(spec.weightingModelV2.learningRate).toBeGreaterThan(0);
            (0, vitest_1.expect)(spec.weightingModelV2.learningRate).toBeLessThan(1);
        });
    });
    (0, vitest_1.describe)('Drift model v2', () => {
        (0, vitest_1.it)('should define version 2.0', () => {
            const spec = engine.generateSpec();
            (0, vitest_1.expect)(spec.driftModelV2.version).toBe('2.0');
        });
        (0, vitest_1.it)('should include multi-dimensional tracking', () => {
            const spec = engine.generateSpec();
            (0, vitest_1.expect)(spec.driftModelV2.vectorDimensions).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should apply decay factor', () => {
            const spec = engine.generateSpec();
            (0, vitest_1.expect)(spec.driftModelV2.decayFactor).toBeGreaterThan(0);
            (0, vitest_1.expect)(spec.driftModelV2.decayFactor).toBeLessThan(1);
        });
        (0, vitest_1.it)('should define anomaly detection threshold', () => {
            const spec = engine.generateSpec();
            (0, vitest_1.expect)(spec.driftModelV2.anomalyThreshold).toBeGreaterThan(0);
            (0, vitest_1.expect)(spec.driftModelV2.anomalyThreshold).toBeLessThan(1);
        });
    });
    (0, vitest_1.describe)('Governance model v2', () => {
        (0, vitest_1.it)('should define version 2.0', () => {
            const spec = engine.generateSpec();
            (0, vitest_1.expect)(spec.governanceModelV2.version).toBe('2.0');
        });
        (0, vitest_1.it)('should set autonomous thresholds', () => {
            const spec = engine.generateSpec();
            (0, vitest_1.expect)(spec.governanceModelV2.autonomousThresholds.composite_reasoning).toBeDefined();
            (0, vitest_1.expect)(spec.governanceModelV2.autonomousThresholds.confidence).toBeDefined();
            (0, vitest_1.expect)(spec.governanceModelV2.autonomousThresholds.drift_magnitude).toBeDefined();
            (0, vitest_1.expect)(spec.governanceModelV2.autonomousThresholds.contradiction_severity).toBeDefined();
        });
        (0, vitest_1.it)('should define escalation rules', () => {
            const spec = engine.generateSpec();
            (0, vitest_1.expect)(spec.governanceModelV2.escalationRules.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should allow operator override', () => {
            const spec = engine.generateSpec();
            (0, vitest_1.expect)(spec.governanceModelV2.operatorOverrideAllowed).toBe(true);
        });
    });
    (0, vitest_1.describe)('Operator UX v2', () => {
        (0, vitest_1.it)('should define version 2.0', () => {
            const spec = engine.generateSpec();
            (0, vitest_1.expect)(spec.operatorUXV2.version).toBe('2.0');
        });
        (0, vitest_1.it)('should specify dashboard layout', () => {
            const spec = engine.generateSpec();
            (0, vitest_1.expect)(spec.operatorUXV2.dashboardLayout.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should include multiple feedback channels', () => {
            const spec = engine.generateSpec();
            (0, vitest_1.expect)(spec.operatorUXV2.feedbackChannels.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should define alerting strategy', () => {
            const spec = engine.generateSpec();
            (0, vitest_1.expect)(spec.operatorUXV2.alertingStrategy).toBeDefined();
        });
    });
    (0, vitest_1.describe)('Spec metadata', () => {
        (0, vitest_1.it)('should include timestamp', () => {
            const spec = engine.generateSpec();
            (0, vitest_1.expect)(spec.timestamp).toBeDefined();
            const date = new Date(spec.timestamp);
            (0, vitest_1.expect)(date.getTime()).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should have unique IDs', () => {
            const spec1 = engine.generateSpec();
            const spec2 = engine.generateSpec();
            (0, vitest_1.expect)(spec1.id).not.toBe(spec2.id);
        });
    });
});
//# sourceMappingURL=ARLv2SpecEngine.test.js.map