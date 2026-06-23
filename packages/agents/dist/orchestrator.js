import { CrawlerEngine } from './crawler/index.js';
import { DomExtractor } from './extractors/dom.js';
import { StyleMatchEngine } from './extractors/style-engine.js';
export class RewriteLabsOrchestrator {
    constructor(options = {}) {
        this.crawler = new CrawlerEngine(options.crawlerOptions);
        this.extractor = new DomExtractor(options.extractorOptions);
        this.styleEngine = new StyleMatchEngine();
    }
    /**
     * Orchestrate full pipeline: crawl → extract → style → IR packet.
     * Returns results at each stage for inspection/debugging.
     */
    async orchestrate(url) {
        try {
            // Stage 1: Crawl
            const crawlResult = await this.crawler.crawl(url);
            if (crawlResult.errorCode) {
                return { crawlResult, domModel: null, styleMetrics: null, irPacket: null, error: crawlResult.errorCode };
            }
            // Stage 2: Extract DOM
            const domModel = this.extractor.extract(crawlResult);
            if (!domModel) {
                return { crawlResult, domModel: null, styleMetrics: null, irPacket: null, error: 'DOM_EXTRACTION_FAILED' };
            }
            // Stage 3: Calculate style metrics
            const styleMetrics = this.styleEngine.metrics(domModel, { rules: [], fonts: [], variables: {} });
            // Stage 4: Build IR packet
            const irPacket = this.buildIrPacket(crawlResult, domModel, styleMetrics);
            return { crawlResult, domModel, styleMetrics, irPacket };
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            return { crawlResult: { url, status: 0, redirectChain: [], robotsAllowed: true, capturedAt: new Date().toISOString() }, domModel: null, styleMetrics: null, irPacket: null, error: errorMsg };
        }
    }
    buildIrPacket(crawl, dom, metrics) {
        return {
            version: '1.1.0',
            meta: {
                url: crawl.url,
                captureDate: crawl.capturedAt,
                toolVersion: 'rewrite-labs-4.0',
            },
            designTokens: {
                colors: undefined,
                spacing: undefined,
                typography: undefined,
            },
            routes: [
                {
                    path: new URL(crawl.url).pathname,
                    title: dom.title,
                    componentIds: [],
                    assetCount: dom.images.length + dom.links.length,
                },
            ],
            components: [],
            assets: {
                images: dom.images.length,
                videos: 0,
                svgs: 0,
                total: dom.images.length,
            },
            cssMetrics: metrics,
            metrics: {
                totalComponentCount: 0,
                totalRouteCount: 1,
            },
        };
    }
}
