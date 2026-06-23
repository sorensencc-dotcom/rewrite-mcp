import { IExtractor } from "./iextractor.js";
import { StageType } from "../../pms/v2/multi-stage.js";
export declare class ExtractorChain {
    private chain;
    pms: {
        requestPrompt: (stage: StageType, context: any) => Promise<import("../../pms/v2/multi-stage.js").MultiStageResult>;
    };
    add(extractor: IExtractor): this;
    run(rawText: string, metadata?: {
        docType?: string;
        sourceFormat?: string;
        tenantId?: string;
        region?: string;
        driftDelta?: number;
    }): Promise<any>;
}
//# sourceMappingURL=extractor-chain.d.ts.map