import { RobotsCache } from './robots.js';
import type { CrawlOptions, CrawlResult, QueueEntry } from './types.js';
export type { CrawlErrorCode, CrawlOptions, CrawlResult, QueueEntry } from './types.js';
export { BloomFilter } from './bloom.js';
export { RobotsCache } from './robots.js';
export declare class CrawlQueue {
    private entries;
    enqueue(url: string, priority: number): void;
    dequeue(): QueueEntry | undefined;
    get size(): number;
    has(url: string): boolean;
}
export declare class CrawlerEngine {
    private readonly dedup;
    private readonly robots;
    private readonly domainLastFetch;
    private readonly failedCrawls;
    private readonly timeout;
    private readonly retries;
    private readonly politenessMs;
    private readonly userAgent;
    constructor(options?: CrawlOptions, robots?: RobotsCache);
    /** Returns all crawl results that exhausted retries. */
    get deadLetter(): CrawlResult[];
    /**
     * Crawl a single URL.
     * Checks: dedup → robots.txt → politeness delay → fetch with retry.
     * Already-seen URLs return cached dedup result without network call.
     */
    crawl(url: string): Promise<CrawlResult>;
    private fetchWithRetry;
}
