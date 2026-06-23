export declare class SmokeTestRunner {
    private pms;
    constructor();
    runSmokeTests(sectionId: string): Promise<{
        ok: boolean;
        error?: string;
    }>;
}
