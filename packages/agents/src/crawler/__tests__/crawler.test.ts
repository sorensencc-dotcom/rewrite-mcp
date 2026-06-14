/* eslint-disable @typescript-eslint/no-explicit-any */
import { BloomFilter } from '../bloom.js';
import { CrawlerEngine, CrawlQueue } from '../index.js';
import { RobotsCache } from '../robots.js';

// Helper: cast to bypass jest.fn() type-arg mismatch between Jest 29 runtime / Jest 30 types
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function makeFetchMock(): {
  mockReset(): void;
  mockResolvedValue(v: any): void;
  mockRejectedValue(v: any): void;
  mockImplementation(fn: (url: unknown, init?: unknown) => Promise<any>): void;
  mock: { calls: unknown[][] };
} {
  return jest.fn() as any;
}

// --- BloomFilter ---

describe('BloomFilter', () => {
  it('reports no false negatives on 1000 unique URLs', () => {
    const bloom = new BloomFilter();
    const urls = Array.from({ length: 1000 }, (_, i) => `https://site${i}.example.com/page`);
    for (const u of urls) bloom.add(u);
    const misses = urls.filter(u => !bloom.has(u));
    expect(misses).toHaveLength(0);
  });

  it('returns false for unseen URLs', () => {
    const bloom = new BloomFilter();
    bloom.add('https://seen.example.com/');
    expect(bloom.has('https://unseen.example.com/')).toBe(false);
  });
});

// --- RobotsCache ---

describe('RobotsCache', () => {
  let mockFetch: ReturnType<typeof makeFetchMock>;

  beforeEach(() => {
    mockFetch = makeFetchMock();
    (globalThis as any).fetch = mockFetch;
  });

  function robotsTxt(...disallowPaths: string[]): string {
    return `User-agent: *\n${disallowPaths.map(p => `Disallow: ${p}`).join('\n')}\n`;
  }

  it('blocks 10 mock domains with Disallow: /', async () => {
    const cache = new RobotsCache();
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(robotsTxt('/')) });

    const domains = Array.from({ length: 10 }, (_, i) => `https://blocked${i}.example.com/page`);
    const results = await Promise.all(domains.map(url => cache.isAllowed(url)));

    expect(results.every(r => r === false)).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(10); // one fetch per origin
  });

  it('allows URL when robots.txt has no matching Disallow', async () => {
    const cache = new RobotsCache();
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(robotsTxt('/admin')) });

    const allowed = await cache.isAllowed('https://example.com/public');
    expect(allowed).toBe(true);
  });

  it('allows all when robots.txt fetch fails', async () => {
    const cache = new RobotsCache();
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const allowed = await cache.isAllowed('https://down.example.com/page');
    expect(allowed).toBe(true);
  });

  it('caches robots.txt — only one fetch per origin', async () => {
    const cache = new RobotsCache();
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(robotsTxt('/secret')) });

    await cache.isAllowed('https://example.com/a');
    await cache.isAllowed('https://example.com/b');
    await cache.isAllowed('https://example.com/secret');

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// --- CrawlerEngine ---

describe('CrawlerEngine', () => {
  let mockFetch: ReturnType<typeof makeFetchMock>;

  beforeEach(() => {
    mockFetch = makeFetchMock();
    (globalThis as any).fetch = mockFetch;
  });

  function urlIs(url: unknown, pattern: string): boolean {
    return typeof url === 'string' && url.includes(pattern);
  }

  it('returns robotsAllowed: false and ROBOTS_BLOCKED for disallowed URL', async () => {
    mockFetch.mockImplementation((url: unknown) => {
      if (urlIs(url, '/robots.txt')) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve('User-agent: *\nDisallow: /\n') });
      }
      return Promise.resolve({ ok: true, status: 200, headers: new Headers() });
    });

    const engine = new CrawlerEngine({ politenessMs: 0 });
    const result = await engine.crawl('https://blocked.example.com/page');

    expect(result.robotsAllowed).toBe(false);
    expect(result.errorCode).toBe('ROBOTS_BLOCKED');
    expect(result.status).toBe(0);
  });

  it('retries on 503 and records in dead-letter after retries exhausted', async () => {
    mockFetch.mockImplementation((url: unknown) => {
      if (urlIs(url, '/robots.txt')) return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: false, status: 503, headers: new Headers() });
    });

    const engine = new CrawlerEngine({ retries: 2, politenessMs: 0 });
    const result = await engine.crawl('https://flaky.example.com/page');

    const calls = mockFetch.mock.calls as [string][];
    const pageFetches = calls.filter(([url]) => !url.endsWith('/robots.txt'));
    expect(pageFetches).toHaveLength(3); // 1 initial + 2 retries

    expect(result.errorCode).toBe('STATUS_ERROR');
    expect(result.status).toBe(503);
    expect(engine.deadLetter).toHaveLength(1);
  });

  it('returns TIMEOUT errorCode on AbortError', async () => {
    mockFetch.mockImplementation((url: unknown) => {
      if (urlIs(url, '/robots.txt')) return Promise.resolve({ ok: false });
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });

    const engine = new CrawlerEngine({ retries: 0, politenessMs: 0 });
    const result = await engine.crawl('https://timeout.example.com/page');

    expect(result.errorCode).toBe('TIMEOUT');
    expect(engine.deadLetter).toHaveLength(1);
  });

  it('deduplicates — second crawl of same URL skips network', async () => {
    mockFetch.mockImplementation((url: unknown) => {
      if (urlIs(url, '/robots.txt')) return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: true, status: 200, headers: new Headers() });
    });

    const engine = new CrawlerEngine({ politenessMs: 0 });
    await engine.crawl('https://example.com/page');
    await engine.crawl('https://example.com/page');

    const calls = mockFetch.mock.calls as [string][];
    const pageFetches = calls.filter(([url]) => !url.endsWith('/robots.txt'));
    expect(pageFetches).toHaveLength(1);
  });

  it('returns status 200 with no errorCode on success', async () => {
    mockFetch.mockImplementation((url: unknown) => {
      if (urlIs(url, '/robots.txt')) return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: true, status: 200, headers: new Headers() });
    });

    const engine = new CrawlerEngine({ politenessMs: 0 });
    const result = await engine.crawl('https://success.example.com/');

    expect(result.status).toBe(200);
    expect(result.errorCode).toBeUndefined();
    expect(result.robotsAllowed).toBe(true);
    expect(engine.deadLetter).toHaveLength(0);
  });
});

// --- CrawlQueue ---

describe('CrawlQueue', () => {
  it('dequeues in priority order (highest first)', () => {
    const q = new CrawlQueue();
    q.enqueue('https://c-tier.example.com/', 40);
    q.enqueue('https://a-tier.example.com/', 90);
    q.enqueue('https://b-tier.example.com/', 70);

    expect(q.dequeue()?.url).toBe('https://a-tier.example.com/');
    expect(q.dequeue()?.url).toBe('https://b-tier.example.com/');
    expect(q.dequeue()?.url).toBe('https://c-tier.example.com/');
    expect(q.dequeue()).toBeUndefined();
  });

  it('tracks size correctly', () => {
    const q = new CrawlQueue();
    expect(q.size).toBe(0);
    q.enqueue('https://a.example.com/', 80);
    q.enqueue('https://b.example.com/', 60);
    expect(q.size).toBe(2);
    q.dequeue();
    expect(q.size).toBe(1);
  });
});
