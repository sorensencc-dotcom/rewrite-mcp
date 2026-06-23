import { type CrawlResult } from './crawler/index.js';
import { type DomModel } from './extractors/dom.js';
import { type StyleMetrics } from './extractors/style-engine.js';
export interface IRPacket {
    version: string;
    meta: {
        url: string;
        captureDate: string;
        toolVersion: string;
    };
    designTokens: Record<string, unknown>;
    routes: Array<{
        path: string;
        title?: string;
        componentIds: string[];
        assetCount: number;
    }>;
    components: unknown[];
    assets: {
        images: number;
        videos: number;
        svgs: number;
        total: number;
    };
    cssMetrics?: StyleMetrics;
    metrics?: Record<string, unknown>;
}
export interface OrchestrationResult {
    crawlResult: CrawlResult;
    domModel: DomModel | null;
    styleMetrics: StyleMetrics | null;
    irPacket: IRPacket | null;
    error?: string;
}
export interface OrchestratorOptions {
    crawlerOptions?: any;
    extractorOptions?: any;
    buildIrPacket?: boolean;
}
export declare class RewriteLabsOrchestrator {
    private readonly crawler;
    private readonly extractor;
    private readonly styleEngine;
    constructor(options?: OrchestratorOptions);
    /**
     * Orchestrate full pipeline: crawl → extract → style → IR packet.
     * Returns results at each stage for inspection/debugging.
     */
    orchestrate(url: string): Promise<OrchestrationResult>;
    private buildIrPacket;
}
