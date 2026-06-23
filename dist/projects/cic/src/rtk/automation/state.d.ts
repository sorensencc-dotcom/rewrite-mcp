import { IngestionBurst, RTKAutomationState } from "./types";
export declare class RTKAutomationStateTracker {
    private state;
    getState(): RTKAutomationState;
    setActiveSection(sectionId: string | null): void;
    addBurst(burst: IngestionBurst): void;
    updateBurstStatus(burstId: string, status: IngestionBurst["status"]): void;
    completeBurst(burstId: string): void;
    blockSection(sectionId: string): void;
    setFailureRate(rate: number): void;
}
//# sourceMappingURL=state.d.ts.map