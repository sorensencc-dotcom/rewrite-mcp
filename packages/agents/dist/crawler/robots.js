/** Per-domain robots.txt cache. Fetches once per origin; reused for all paths. */
export class RobotsCache {
    constructor() {
        this.cache = new Map();
    }
    /**
     * Returns true if `url` is allowed for crawling.
     * Fetches and caches robots.txt on first call per origin.
     * No robots.txt (or fetch failure) = allow all.
     */
    async isAllowed(url, userAgent = 'RewriteLabsBot') {
        const parsed = new URL(url);
        const origin = parsed.origin;
        if (!this.cache.has(origin)) {
            await this.fetchAndCache(origin, userAgent);
        }
        const disallowed = this.cache.get(origin);
        const path = parsed.pathname;
        for (const rule of disallowed) {
            if (path.startsWith(rule))
                return false;
        }
        return true;
    }
    async fetchAndCache(origin, userAgent) {
        const disallowed = new Set();
        try {
            const res = await globalThis.fetch(`${origin}/robots.txt`, {
                signal: AbortSignal.timeout(5000),
                headers: { 'User-Agent': userAgent },
            });
            if (res.ok) {
                const text = await res.text();
                this.parse(text, userAgent, disallowed);
            }
        }
        catch {
            // Connection error or timeout — treat as allow all
        }
        this.cache.set(origin, disallowed);
    }
    parse(text, userAgent, disallowed) {
        const lines = text.split('\n').map(l => l.trim());
        let active = false;
        for (const line of lines) {
            if (line.startsWith('#') || line === '')
                continue;
            if (line.toLowerCase().startsWith('user-agent:')) {
                const agent = line.slice(11).trim();
                active = agent === '*' || agent.toLowerCase() === userAgent.toLowerCase();
            }
            else if (active && line.toLowerCase().startsWith('disallow:')) {
                const path = line.slice(9).trim();
                if (path)
                    disallowed.add(path);
            }
        }
    }
    /** Evict cached entry — use in tests or when robots.txt changes. */
    evict(origin) {
        this.cache.delete(origin);
    }
}
