import { BloomFilter } from './bloom.js';
import { RobotsCache } from './robots.js';
export { BloomFilter } from './bloom.js';
export { RobotsCache } from './robots.js';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 2;
const DEFAULT_POLITENESS_MS = 2000;
const DEFAULT_UA = 'RewriteLabsBot/1.0';
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export class CrawlQueue {
    constructor() {
        this.entries = [];
    }
    enqueue(url, priority) {
        this.entries.push({ url, priority, addedAt: new Date().toISOString() });
        this.entries.sort((a, b) => b.priority - a.priority);
    }
    dequeue() {
        return this.entries.shift();
    }
    get size() {
        return this.entries.length;
    }
    has(url) {
        return this.entries.some(e => e.url === url);
    }
}
export class CrawlerEngine {
    constructor(options = {}, robots) {
        this.dedup = new BloomFilter();
        this.domainLastFetch = new Map();
        this.failedCrawls = [];
        this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
        this.retries = options.retries ?? DEFAULT_RETRIES;
        this.politenessMs = options.politenessMs ?? DEFAULT_POLITENESS_MS;
        this.userAgent = options.userAgent ?? DEFAULT_UA;
        this.robots = robots ?? new RobotsCache();
    }
    /** Returns all crawl results that exhausted retries. */
    get deadLetter() {
        return this.failedCrawls;
    }
    /**
     * Crawl a single URL.
     * Checks: dedup → robots.txt → politeness delay → fetch with retry.
     * Already-seen URLs return cached dedup result without network call.
     */
    async crawl(url) {
        const capturedAt = new Date().toISOString();
        // Dedup: return immediately for already-seen URLs
        if (this.dedup.has(url)) {
            return { url, status: 0, redirectChain: [], robotsAllowed: true, capturedAt };
        }
        // robots.txt check
        const allowed = await this.robots.isAllowed(url, this.userAgent);
        if (!allowed) {
            this.dedup.add(url);
            return {
                url,
                status: 0,
                redirectChain: [],
                robotsAllowed: false,
                capturedAt,
                errorCode: 'ROBOTS_BLOCKED',
            };
        }
        // Politeness: enforce minimum delay per domain
        const origin = new URL(url).origin;
        const last = this.domainLastFetch.get(origin) ?? 0;
        const wait = this.politenessMs - (Date.now() - last);
        if (wait > 0)
            await sleep(wait);
        // Fetch with retry
        const result = await this.fetchWithRetry(url, capturedAt);
        this.domainLastFetch.set(origin, Date.now());
        this.dedup.add(url);
        if (result.errorCode && result.errorCode !== 'ROBOTS_BLOCKED') {
            this.failedCrawls.push(result);
        }
        return result;
    }
    async fetchWithRetry(url, capturedAt) {
        let lastResult;
        for (let attempt = 0; attempt <= this.retries; attempt++) {
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), this.timeout);
                const redirectChain = [];
                let currentUrl = url;
                const res = await globalThis.fetch(currentUrl, {
                    signal: controller.signal,
                    redirect: 'manual',
                    headers: { 'User-Agent': this.userAgent },
                });
                clearTimeout(timer);
                // Collect redirect chain
                if (res.status >= 300 && res.status < 400) {
                    const location = res.headers.get('location');
                    if (location) {
                        redirectChain.push(currentUrl);
                        currentUrl = new URL(location, currentUrl).href;
                    }
                }
                if (res.status >= 400) {
                    lastResult = {
                        url,
                        status: res.status,
                        redirectChain,
                        robotsAllowed: true,
                        capturedAt,
                        errorCode: 'STATUS_ERROR',
                    };
                    // Don't retry 4xx (client error); do retry 5xx
                    if (res.status < 500)
                        break;
                    continue;
                }
                const contentType = res.headers.get('content-type') ?? undefined;
                const rawHtml = contentType?.includes('text/html') ? await res.text() : undefined;
                return {
                    url,
                    status: res.status,
                    redirectChain,
                    robotsAllowed: true,
                    capturedAt,
                    contentType,
                    rawHtml,
                };
            }
            catch (err) {
                const errName = err?.name ?? '';
                const isTimeout = errName === 'AbortError' || errName === 'TimeoutError';
                lastResult = {
                    url,
                    status: 0,
                    redirectChain: [],
                    robotsAllowed: true,
                    capturedAt,
                    errorCode: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
                };
            }
        }
        return lastResult ?? {
            url,
            status: 0,
            redirectChain: [],
            robotsAllowed: true,
            capturedAt,
            errorCode: 'NETWORK_ERROR',
        };
    }
}
