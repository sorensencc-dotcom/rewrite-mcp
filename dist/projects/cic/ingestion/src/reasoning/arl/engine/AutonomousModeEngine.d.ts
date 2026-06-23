import { AutonomousModeState, AutonomousDecision } from '../contracts/AutonomousMode';
export declare class AutonomousModeEngine {
    initializeAutonomousMode(): AutonomousModeState;
    makeAutonomousDecision(expansionScore: number, confidenceLevel: number, state: AutonomousModeState): {
        decision: AutonomousDecision;
        updatedState: AutonomousModeState;
    };
    autonomouslyReject(reason: string, severity: number, state: AutonomousModeState): AutonomousModeState;
    autonomouslyEscalate(path: string, severity: number, state: AutonomousModeState): AutonomousModeState;
    autonomouslyStabilize(action: string, state: AutonomousModeState): AutonomousModeState;
    private initializeThresholds;
    private determineVerdict;
}
//# sourceMappingURL=AutonomousModeEngine.d.ts.map