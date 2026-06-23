"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ArlGovernanceHooks_1 = require("../../../../src/reasoning/arl/governance/ArlGovernanceHooks");
const ThresholdConfig_1 = require("../../../../src/reasoning/arl/contracts/ThresholdConfig");
(0, vitest_1.describe)('ArlGovernanceHooks — Phase 7.13 BOB Integration', () => {
    let hooks;
    (0, vitest_1.beforeEach)(() => {
        hooks = new ArlGovernanceHooks_1.ArlGovernanceHooks();
    });
    (0, vitest_1.describe)('Governance Rule Initialization', () => {
        (0, vitest_1.it)('should initialize all five governance rules for reject codes', () => {
            // Rules should be initialized for each reject code
            const stats = hooks.getStats();
            (0, vitest_1.expect)(stats.totalDecisions).toBe(0); // Starts empty
        });
    });
    (0, vitest_1.describe)('ACCEPT Decision Handling', () => {
        (0, vitest_1.it)('should log audit entry for accepted expansion without escalation', async () => {
            const signal = {
                phaseId: '7.12',
                decision: 'ACCEPT',
                reasons: ['All thresholds passed'],
                narrativeRiskLevel: 'low',
                operatorOverrideAllowed: false,
                auditEntry: {
                    timestamp: new Date(),
                    phaseId: '7.12',
                    decision: 'ACCEPT',
                    reasonCount: 1,
                },
            };
            const result = await hooks.processSignal(signal);
            (0, vitest_1.expect)(result).toBeNull(); // No escalation for ACCEPT
            const logs = hooks.getAuditLog();
            (0, vitest_1.expect)(logs.length).toBe(1);
            (0, vitest_1.expect)(logs[0].decision).toBe('ACCEPT');
        });
    });
    (0, vitest_1.describe)('Escalation Routing', () => {
        (0, vitest_1.it)('should route COMPOSITE_TOO_LOW to operator review', async () => {
            const signal = {
                phaseId: '7.12',
                decision: 'QUARANTINE',
                reasons: ['Composite reasoning below threshold'],
                narrativeRiskLevel: 'medium',
                operatorOverrideAllowed: true,
                rejectCode: ThresholdConfig_1.REJECT_CODES.COMPOSITE_TOO_LOW,
                auditEntry: {
                    timestamp: new Date(),
                    phaseId: '7.12',
                    decision: 'QUARANTINE',
                    reasonCount: 1,
                },
            };
            const result = await hooks.processSignal(signal);
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result?.handler).toBe('operator_review');
            (0, vitest_1.expect)(result?.status).toBe('pending');
        });
        (0, vitest_1.it)('should route DRIFT_TOO_HIGH to memory integrity check', async () => {
            const signal = {
                phaseId: '7.12',
                decision: 'ESCALATE',
                reasons: ['Drift magnitude exceeds threshold'],
                narrativeRiskLevel: 'medium',
                operatorOverrideAllowed: true,
                rejectCode: ThresholdConfig_1.REJECT_CODES.DRIFT_TOO_HIGH,
                driftVector: {
                    semantic: 0.35,
                    temporal: 0.20,
                    narrative: 0.25,
                    causal: 0.32,
                    magnitude: 0.35,
                },
                auditEntry: {
                    timestamp: new Date(),
                    phaseId: '7.12',
                    decision: 'ESCALATE',
                    reasonCount: 1,
                },
            };
            const result = await hooks.processSignal(signal);
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result?.handler).toBe('memory_integrity_check');
        });
        (0, vitest_1.it)('should route CONTRADICTION_TOO_SEVERE to narrative coherence review', async () => {
            const signal = {
                phaseId: '7.12',
                decision: 'REJECT',
                reasons: ['Contradiction severity exceeds threshold'],
                narrativeRiskLevel: 'high',
                operatorOverrideAllowed: true,
                rejectCode: ThresholdConfig_1.REJECT_CODES.CONTRADICTION_TOO_SEVERE,
                escalationPath: 'narrative_coherence_review',
                auditEntry: {
                    timestamp: new Date(),
                    phaseId: '7.12',
                    decision: 'REJECT',
                    reasonCount: 1,
                },
            };
            const result = await hooks.processSignal(signal);
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result?.handler).toBe('narrative_coherence_review');
        });
        (0, vitest_1.it)('should route CONFIDENCE_TOO_LOW to operator review', async () => {
            const signal = {
                phaseId: '7.12',
                decision: 'ESCALATE',
                reasons: ['Confidence below threshold'],
                narrativeRiskLevel: 'medium',
                operatorOverrideAllowed: true,
                rejectCode: ThresholdConfig_1.REJECT_CODES.CONFIDENCE_TOO_LOW,
                auditEntry: {
                    timestamp: new Date(),
                    phaseId: '7.12',
                    decision: 'ESCALATE',
                    reasonCount: 1,
                },
            };
            const result = await hooks.processSignal(signal);
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result?.handler).toBe('operator_review');
        });
        (0, vitest_1.it)('should route MULTIPLE_FAILURES to operator review', async () => {
            const signal = {
                phaseId: '7.12',
                decision: 'REJECT',
                reasons: [
                    'Composite reasoning below threshold',
                    'Confidence below threshold',
                    'Drift magnitude exceeds threshold',
                ],
                narrativeRiskLevel: 'high',
                operatorOverrideAllowed: true,
                rejectCode: ThresholdConfig_1.REJECT_CODES.MULTIPLE_FAILURES,
                auditEntry: {
                    timestamp: new Date(),
                    phaseId: '7.12',
                    decision: 'REJECT',
                    reasonCount: 3,
                },
            };
            const result = await hooks.processSignal(signal);
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result?.handler).toBe('operator_review');
        });
    });
    (0, vitest_1.describe)('Audit Logging', () => {
        (0, vitest_1.it)('should track all governance decisions in audit log', async () => {
            const signal1 = {
                phaseId: '7.12',
                decision: 'ACCEPT',
                reasons: ['All thresholds passed'],
                narrativeRiskLevel: 'low',
                operatorOverrideAllowed: false,
                auditEntry: {
                    timestamp: new Date(),
                    phaseId: '7.12',
                    decision: 'ACCEPT',
                    reasonCount: 1,
                },
            };
            const signal2 = {
                phaseId: '7.12',
                decision: 'QUARANTINE',
                reasons: ['Drift magnitude exceeds threshold'],
                narrativeRiskLevel: 'medium',
                operatorOverrideAllowed: true,
                rejectCode: ThresholdConfig_1.REJECT_CODES.DRIFT_TOO_HIGH,
                auditEntry: {
                    timestamp: new Date(),
                    phaseId: '7.12',
                    decision: 'QUARANTINE',
                    reasonCount: 1,
                },
            };
            await hooks.processSignal(signal1);
            await hooks.processSignal(signal2);
            const logs = hooks.getAuditLog();
            (0, vitest_1.expect)(logs.length).toBe(2);
            (0, vitest_1.expect)(logs[0].decision).toBe('ACCEPT');
            (0, vitest_1.expect)(logs[1].decision).toBe('QUARANTINE');
        });
        (0, vitest_1.it)('should support audit log filtering by reject code', async () => {
            const signals = [
                {
                    phaseId: '7.12',
                    decision: 'QUARANTINE',
                    reasons: ['Drift too high'],
                    narrativeRiskLevel: 'medium',
                    operatorOverrideAllowed: true,
                    rejectCode: ThresholdConfig_1.REJECT_CODES.DRIFT_TOO_HIGH,
                    auditEntry: {
                        timestamp: new Date(),
                        phaseId: '7.12',
                        decision: 'QUARANTINE',
                        reasonCount: 1,
                    },
                },
                {
                    phaseId: '7.12',
                    decision: 'ESCALATE',
                    reasons: ['Confidence too low'],
                    narrativeRiskLevel: 'medium',
                    operatorOverrideAllowed: true,
                    rejectCode: ThresholdConfig_1.REJECT_CODES.CONFIDENCE_TOO_LOW,
                    auditEntry: {
                        timestamp: new Date(),
                        phaseId: '7.12',
                        decision: 'ESCALATE',
                        reasonCount: 1,
                    },
                },
            ];
            for (const signal of signals) {
                await hooks.processSignal(signal);
            }
            const driftLogs = hooks.getAuditLog({
                rejectCode: ThresholdConfig_1.REJECT_CODES.DRIFT_TOO_HIGH,
            });
            (0, vitest_1.expect)(driftLogs.length).toBe(1);
            (0, vitest_1.expect)(driftLogs[0].rejectCode).toBe(ThresholdConfig_1.REJECT_CODES.DRIFT_TOO_HIGH);
        });
    });
    (0, vitest_1.describe)('Operator Override Handling', () => {
        (0, vitest_1.it)('should record operator approval override', async () => {
            // Process initial escalation
            const signal = {
                phaseId: '7.12',
                decision: 'QUARANTINE',
                reasons: ['Drift too high'],
                narrativeRiskLevel: 'medium',
                operatorOverrideAllowed: true,
                rejectCode: ThresholdConfig_1.REJECT_CODES.DRIFT_TOO_HIGH,
                auditEntry: {
                    timestamp: new Date(),
                    phaseId: '7.12',
                    decision: 'QUARANTINE',
                    reasonCount: 1,
                },
            };
            const result = await hooks.processSignal(signal);
            (0, vitest_1.expect)(result).toBeDefined();
            // Record operator override
            await hooks.handleOperatorOverride('exp-123', result.escalationId, 'approved', 'Expansion approved despite drift due to critical urgency');
            const logs = hooks.getAuditLog();
            (0, vitest_1.expect)(logs.length).toBe(2); // Initial + override
            const overrideLogs = logs.filter((l) => l.operatorAction);
            (0, vitest_1.expect)(overrideLogs.length).toBe(1);
            (0, vitest_1.expect)(overrideLogs[0].operatorAction).toBe('approved');
        });
        (0, vitest_1.it)('should record operator rejection override', async () => {
            const signal = {
                phaseId: '7.12',
                decision: 'ACCEPT',
                reasons: ['All thresholds passed'],
                narrativeRiskLevel: 'low',
                operatorOverrideAllowed: false,
                auditEntry: {
                    timestamp: new Date(),
                    phaseId: '7.12',
                    decision: 'ACCEPT',
                    reasonCount: 1,
                },
            };
            await hooks.processSignal(signal);
            // Operator can reject even accepted expansions if needed
            await hooks.handleOperatorOverride('exp-124', 'esc-manual-001', 'rejected', 'Expansion contradicts upcoming policy change');
            const logs = hooks.getAuditLog();
            const overrideLogs = logs.filter((l) => l.operatorAction === 'rejected');
            (0, vitest_1.expect)(overrideLogs.length).toBe(1);
        });
    });
    (0, vitest_1.describe)('Statistics and Reporting', () => {
        (0, vitest_1.it)('should track decision statistics', async () => {
            const signals = [
                {
                    phaseId: '7.12',
                    decision: 'ACCEPT',
                    reasons: ['All pass'],
                    narrativeRiskLevel: 'low',
                    operatorOverrideAllowed: false,
                    auditEntry: {
                        timestamp: new Date(),
                        phaseId: '7.12',
                        decision: 'ACCEPT',
                        reasonCount: 1,
                    },
                },
                {
                    phaseId: '7.12',
                    decision: 'ACCEPT',
                    reasons: ['All pass'],
                    narrativeRiskLevel: 'low',
                    operatorOverrideAllowed: false,
                    auditEntry: {
                        timestamp: new Date(),
                        phaseId: '7.12',
                        decision: 'ACCEPT',
                        reasonCount: 1,
                    },
                },
                {
                    phaseId: '7.12',
                    decision: 'QUARANTINE',
                    reasons: ['One failure'],
                    narrativeRiskLevel: 'medium',
                    operatorOverrideAllowed: true,
                    rejectCode: ThresholdConfig_1.REJECT_CODES.DRIFT_TOO_HIGH,
                    auditEntry: {
                        timestamp: new Date(),
                        phaseId: '7.12',
                        decision: 'QUARANTINE',
                        reasonCount: 1,
                    },
                },
                {
                    phaseId: '7.12',
                    decision: 'REJECT',
                    reasons: ['Multiple failures'],
                    narrativeRiskLevel: 'high',
                    operatorOverrideAllowed: true,
                    rejectCode: ThresholdConfig_1.REJECT_CODES.MULTIPLE_FAILURES,
                    auditEntry: {
                        timestamp: new Date(),
                        phaseId: '7.12',
                        decision: 'REJECT',
                        reasonCount: 3,
                    },
                },
            ];
            for (const signal of signals) {
                await hooks.processSignal(signal);
            }
            const stats = hooks.getStats();
            (0, vitest_1.expect)(stats.totalDecisions).toBe(4);
            (0, vitest_1.expect)(stats.accepted).toBe(2);
            (0, vitest_1.expect)(stats.quarantined).toBe(1);
            (0, vitest_1.expect)(stats.rejected).toBe(1);
        });
        (0, vitest_1.it)('should show real-time approval percentage', async () => {
            // 80% accept, 10% quarantine, 10% reject scenario
            const signals = [
                // 8 accepts
                ...Array(8).fill(null).map(() => ({
                    phaseId: '7.12',
                    decision: 'ACCEPT',
                    reasons: ['All pass'],
                    narrativeRiskLevel: 'low',
                    operatorOverrideAllowed: false,
                    auditEntry: {
                        timestamp: new Date(),
                        phaseId: '7.12',
                        decision: 'ACCEPT',
                        reasonCount: 1,
                    },
                })),
                // 1 quarantine
                {
                    phaseId: '7.12',
                    decision: 'QUARANTINE',
                    reasons: ['One failure'],
                    narrativeRiskLevel: 'medium',
                    operatorOverrideAllowed: true,
                    rejectCode: ThresholdConfig_1.REJECT_CODES.DRIFT_TOO_HIGH,
                    auditEntry: {
                        timestamp: new Date(),
                        phaseId: '7.12',
                        decision: 'QUARANTINE',
                        reasonCount: 1,
                    },
                },
                // 1 reject
                {
                    phaseId: '7.12',
                    decision: 'REJECT',
                    reasons: ['Multiple failures'],
                    narrativeRiskLevel: 'high',
                    operatorOverrideAllowed: true,
                    rejectCode: ThresholdConfig_1.REJECT_CODES.MULTIPLE_FAILURES,
                    auditEntry: {
                        timestamp: new Date(),
                        phaseId: '7.12',
                        decision: 'REJECT',
                        reasonCount: 3,
                    },
                },
            ];
            for (const signal of signals) {
                await hooks.processSignal(signal);
            }
            const stats = hooks.getStats();
            (0, vitest_1.expect)(stats.accepted).toBe(8);
            (0, vitest_1.expect)(stats.quarantined).toBe(1);
            (0, vitest_1.expect)(stats.rejected).toBe(1);
            (0, vitest_1.expect)(stats.accepted / stats.totalDecisions).toBeCloseTo(0.8, 1);
        });
    });
    (0, vitest_1.describe)('Error Handling', () => {
        (0, vitest_1.it)('should throw error for unknown reject code', async () => {
            const signal = {
                phaseId: '7.12',
                decision: 'REJECT',
                reasons: ['Unknown error'],
                narrativeRiskLevel: 'high',
                operatorOverrideAllowed: true,
                rejectCode: 'E999_unknown_error',
                auditEntry: {
                    timestamp: new Date(),
                    phaseId: '7.12',
                    decision: 'REJECT',
                    reasonCount: 1,
                },
            };
            await (0, vitest_1.expect)(hooks.processSignal(signal)).rejects.toThrow('No governance rule found for code: E999_unknown_error');
        });
    });
});
//# sourceMappingURL=ArlGovernanceHooks.test.js.map