/** Per-domain robots.txt cache. Fetches once per origin; reused for all paths. */
export declare class RobotsCache {
    private readonly cache;
    /**
     * Returns true if `url` is allowed for crawling.
     * Fetches and caches robots.txt on first call per origin.
     * No robots.txt (or fetch failure) = allow all.
     */
    isAllowed(url: string, userAgent?: string): Promise<boolean>;
    private fetchAndCache;
    private parse;
    /** Evict cached entry — use in tests or when robots.txt changes. */
    evict(origin: string): void;
}
