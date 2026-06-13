import { CrawlerEngine, type CrawlResult } from './crawler/index.js';
import { DomExtractor, type DomModel } from './extractors/dom.js';
import { StyleMatchEngine, type StyleMetrics } from './extractors/style-engine.js';

export interface IRPacket {
  version: string;
  meta: {
    url: string;
    captureDate: string;
    toolVersion: string;
  };
  designTokens: Record<string, unknown>;
  routes: Array<{ path: string; title?: string; componentIds: string[]; assetCount: number }>;
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

export class RewriteLabsOrchestrator {
  private readonly crawler: CrawlerEngine;
  private readonly extractor: DomExtractor;
  private readonly styleEngine: StyleMatchEngine;

  constructor(options: OrchestratorOptions = {}) {
    this.crawler = new CrawlerEngine(options.crawlerOptions);
    this.extractor = new DomExtractor(options.extractorOptions);
    this.styleEngine = new StyleMatchEngine();
  }

  /**
   * Orchestrate full pipeline: crawl → extract → style → IR packet.
   * Returns results at each stage for inspection/debugging.
   */
  async orchestrate(url: string): Promise<OrchestrationResult> {
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
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { crawlResult: { url, status: 0, redirectChain: [], robotsAllowed: true, capturedAt: new Date().toISOString() }, domModel: null, styleMetrics: null, irPacket: null, error: errorMsg };
    }
  }

  private buildIrPacket(crawl: CrawlResult, dom: DomModel, metrics: StyleMetrics): IRPacket {
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
