import { ImageAnalyzer } from "../../../src/harvester/extractors/imageAnalyzer.js";
import { TextExtractor } from "../../../src/harvester/extractors/textExtractor.js";
import { RTKOrchestrator } from "../../../src/rtk/automation/orchestrator.js";
export declare class ControlledImageAnalyzer extends ImageAnalyzer {
    extract(input: any): Promise<{
        type: string;
        prompt: any;
        metadata: {
            filename: any;
            mime: any;
        };
    }>;
}
export declare class ControlledTextExtractor extends TextExtractor {
    extract(input: any): Promise<{
        type: string;
        prompt: any;
        text: any;
    }>;
}
export declare function withHealthyExtractors(): void;
export declare function withFailingExtractors(rate: number): void;
export declare function withPMSTemplateError(enabled: boolean): void;
export declare function emitRRKGoals(fixtureFilename: string): any[];
export declare function advanceSection(sectionId: string): Record<string, string>;
export declare function resetHarnessState(): void;
export declare function snapshotAutomationState(orchestrator: RTKOrchestrator): import("../../../src/rtk/automation/types.js").RTKAutomationState;
export declare function captureGovernanceEvents(): any[];
export declare function getMetricsSnapshot(orchestrator: RTKOrchestrator): {
    rtk_bursts_active: number;
    rtk_burst_failure_rate: number;
    rtk_jobs_in_flight: number;
    rtk_sections_blocked: number;
};
//# sourceMappingURL=harness.d.ts.map