export interface RewriteHandoff {
    tenantId: string;
    url: string;
    goals: {
        vitals: string[];
        targetScore: number;
    };
}
export interface RewriteRunResult {
    runId: string;
    tenantId: string;
    url: string;
    discovery: any;
    redesign: any;
    outreach: any;
    timestamp: number;
    success: boolean;
}
export declare class CicToRewritePlanner {
    private readonly baseDir;
    constructor(baseDir?: string);
    runE2ETests(): boolean;
    executeRewriteRun(handoff: RewriteHandoff): Promise<RewriteRunResult>;
}
//# sourceMappingURL=cicToRewritePlanner.d.ts.map