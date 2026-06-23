export declare class LoadCampaignRunner {
    private ingestFn;
    constructor(ingestFn: (doc: any) => Promise<void>);
    run(docs: any[], rate: number, durationMs: number): Promise<{
        ingested: number;
    }>;
}
