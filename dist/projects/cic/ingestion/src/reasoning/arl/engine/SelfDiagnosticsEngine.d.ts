import { SelfDiagnosticsResult } from '../contracts/HealthMetrics';
export interface SubsystemState {
    compositeReasoning: {
        score: number;
        variance: number;
    };
    confidenceModel: {
        score: number;
        variance: number;
    };
    driftCalculator: {
        score: number;
        variance: number;
    };
    verdictSynthesizer: {
        score: number;
        variance: number;
    };
}
export declare class SelfDiagnosticsEngine {
    private lastState;
    private stateHistory;
    runDiagnostics(currentState: SubsystemState): SelfDiagnosticsResult;
    private checkSubsystemHealth;
    private calculateDriftOfDrift;
    private validateWeightingSanity;
    private detectInternalContradictions;
    private computeIntegrityScore;
    private generateRecommendations;
    getStateHistory(): SubsystemState[];
}
//# sourceMappingURL=SelfDiagnosticsEngine.d.ts.map