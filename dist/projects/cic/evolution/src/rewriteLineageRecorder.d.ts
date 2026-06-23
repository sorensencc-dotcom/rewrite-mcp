import { CkgStore } from "../../src/ckg/ckg-store.js";
export interface LineageData {
    lineageId: string;
    runId: string;
    tenantId: string;
    url: string;
    discovery: {
        framework: string;
        contentBlocks: number;
    };
    redesign: {
        templateId: string;
        recommendations: string[];
        colorSystem: {
            primary: string;
            background: string;
        };
    };
    outreach: {
        uxImprovements: string[];
        recommendations: string[];
    };
    timestamp: number;
}
export declare class RewriteLineageRecorder {
    private readonly store;
    private readonly baseDir;
    constructor(store: CkgStore, baseDir?: string);
    recordLineage(runResult: any): LineageData;
}
//# sourceMappingURL=rewriteLineageRecorder.d.ts.map