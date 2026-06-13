/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, jest } from '@jest/globals';
import { CrawlerEngine } from '../crawler/index.js';
import { DomExtractor } from '../extractors/dom.js';
import { StyleMatchEngine } from '../extractors/style-engine.js';
import { RewriteLabsOrchestrator } from '../orchestrator.js';

describe('RL-4.0: Playwright DOM Capture + Style Engine', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  function makeFetchMock(): { mockImplementation(fn: (...args: unknown[]) => unknown): void; mockRejectedValue(v: unknown): void; } {
    return jest.fn() as any;
  }

  const sampleHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Page</title>
      <meta name="description" content="Test description">
      <meta name="viewport" content="width=device-width">
      <style>
        .header { color: #333; font-family: Arial; }
        .btn { background-color: #007bff; transition: all 0.3s; }
        @media (max-width: 768px) { body { font-size: 14px; } }
      </style>
    </head>
    <body>
      <header class="header" id="top">
        <h1>Welcome</h1>
      </header>
      <main>
        <button class="btn">Click me</button>
        <img src="/img.png" alt="Test image">
        <a href="/page">Link</a>
      </main>
    </body>
    </html>
  `;

  describe('CrawlResult v1.1 — HTML capture', () => {
    it('captures rawHtml and contentType on 200 response', async () => {
      const mockFetch = makeFetchMock();
      (globalThis as any).fetch = mockFetch;

      mockFetch.mockImplementation((url: unknown) => {
        if ((url as string).includes('/robots.txt')) return Promise.resolve({ ok: false });
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
          text: () => Promise.resolve(sampleHtml),
        });
      });

      const engine = new CrawlerEngine({ politenessMs: 0 });
      const result = await engine.crawl('https://example.com/');

      expect(result.status).toBe(200);
      expect(result.contentType).toBe('text/html; charset=utf-8');
      expect(result.rawHtml).toBeTruthy();
      expect(result.rawHtml).toContain('<title>Test Page</title>');
    });

    it('returns undefined rawHtml for non-HTML response', async () => {
      const mockFetch = makeFetchMock();
      (globalThis as any).fetch = mockFetch;

      mockFetch.mockImplementation((url: unknown) => {
        if ((url as string).includes('/robots.txt')) return Promise.resolve({ ok: false });
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          text: () => Promise.resolve('{}'),
        });
      });

      const engine = new CrawlerEngine({ politenessMs: 0 });
      const result = await engine.crawl('https://example.com/api');

      expect(result.status).toBe(200);
      expect(result.rawHtml).toBeUndefined();
    });
  });

  describe('DomExtractor — DOM tree parsing', () => {
    it('builds DOM tree from HTML', () => {
      const extractor = new DomExtractor();
      const crawlResult = {
        url: 'https://example.com/',
        status: 200,
        redirectChain: [],
        robotsAllowed: true,
        capturedAt: new Date().toISOString(),
        contentType: 'text/html',
        rawHtml: sampleHtml,
      };

      const domModel = extractor.extract(crawlResult);

      expect(domModel).toBeTruthy();
      expect(domModel?.title).toBe('Test Page');
      expect(domModel?.meta.description).toBe('Test description');
      expect(domModel?.headings).toContainEqual(expect.objectContaining({ tag: 'h1', text: 'Welcome' }));
    });

    it('extracts images and links', () => {
      const extractor = new DomExtractor();
      const crawlResult = {
        url: 'https://example.com/',
        status: 200,
        redirectChain: [],
        robotsAllowed: true,
        capturedAt: new Date().toISOString(),
        contentType: 'text/html',
        rawHtml: sampleHtml,
      };

      const domModel = extractor.extract(crawlResult);

      expect(domModel?.images).toHaveLength(1);
      expect(domModel?.images[0].src).toBe('/img.png');
      expect(domModel?.links).toHaveLength(1);
      expect(domModel?.links[0].href).toBe('/page');
    });

    it('returns null for crawl without HTML', () => {
      const extractor = new DomExtractor();
      const crawlResult = {
        url: 'https://example.com/',
        status: 200,
        redirectChain: [],
        robotsAllowed: true,
        capturedAt: new Date().toISOString(),
      };

      const domModel = extractor.extract(crawlResult);
      expect(domModel).toBeNull();
    });

    it('builds DOM tree with classes and IDs', () => {
      const extractor = new DomExtractor();
      const crawlResult = {
        url: 'https://example.com/',
        status: 200,
        redirectChain: [],
        robotsAllowed: true,
        capturedAt: new Date().toISOString(),
        contentType: 'text/html',
        rawHtml: sampleHtml,
      };

      const domModel = extractor.extract(crawlResult);
      const findNode = (node: any, tag: string, id?: string): any => {
        if (node.tag === tag && (id ? node.id === id : true)) return node;
        for (const child of node.children) {
          const found = findNode(child, tag, id);
          if (found) return found;
        }
        return null;
      };

      const header = findNode(domModel?.root, 'header', 'top');
      expect(header).toBeTruthy();
      expect(header?.classes).toContain('header');
    });
  });

  describe('StyleMatchEngine — CSS parsing & metrics', () => {
    it('calculates style metrics from DOM', () => {
      const extractor = new DomExtractor();
      const crawlResult = {
        url: 'https://example.com/',
        status: 200,
        redirectChain: [],
        robotsAllowed: true,
        capturedAt: new Date().toISOString(),
        contentType: 'text/html',
        rawHtml: sampleHtml,
      };

      const domModel = extractor.extract(crawlResult);
      expect(domModel).toBeTruthy();

      const styleEngine = new StyleMatchEngine();
      const metrics = styleEngine.metrics(domModel!, { rules: [], fonts: [], variables: {} });

      expect(metrics.uniqueClasses).toBeGreaterThan(0);
      expect(metrics.uniqueIds).toBeGreaterThan(0);
      expect(Array.isArray(metrics.fontFamilies)).toBe(true);
    });

    it('parses CSS and extracts fonts', () => {
      const cssText = `
        @font-face {
          font-family: "Custom Font";
          src: url(/font.woff);
        }
        .text { font-family: Arial; color: #333; }
      `;

      const styleEngine = new StyleMatchEngine();
      const stylesheet = styleEngine.parseStylesheet({ root: null } as any, cssText);

      expect(stylesheet.fonts).toContainEqual('Custom Font');
    });

    it('counts CSS properties', () => {
      const cssText = `
        .btn { transition: all 0.3s; animation: slide 1s; }
        .link { color: #007bff; background-color: white; }
      `;

      const styleEngine = new StyleMatchEngine();
      const stylesheet = styleEngine.parseStylesheet({ root: null } as any, cssText);
      const metrics = styleEngine.metrics({ root: null } as any, stylesheet);

      expect(metrics.transitionCount).toBeGreaterThan(0);
      expect(metrics.animationCount).toBeGreaterThan(0);
      expect(metrics.colorCount).toBeGreaterThan(0);
    });
  });

  describe('IRPacket v1.1 — schema extension', () => {
    it('builds IR packet with CSS metrics', () => {
      const extractor = new DomExtractor();
      const crawlResult = {
        url: 'https://example.com/',
        status: 200,
        redirectChain: [],
        robotsAllowed: true,
        capturedAt: new Date().toISOString(),
        contentType: 'text/html',
        rawHtml: sampleHtml,
      };

      const domModel = extractor.extract(crawlResult);
      const styleEngine = new StyleMatchEngine();
      const stylesheet = styleEngine.parseStylesheet(domModel!, '');
      const metrics = styleEngine.metrics(domModel!, stylesheet);

      const orchestra = new RewriteLabsOrchestrator({ crawlerOptions: { politenessMs: 0 } });
      // @ts-expect-error private method
      const irPacket = orchestra.buildIrPacket(crawlResult, domModel!, metrics);

      expect(irPacket.version).toBe('1.1.0');
      expect(irPacket.cssMetrics).toBeTruthy();
      expect(irPacket.meta.toolVersion).toBe('rewrite-labs-4.0');
    });
  });

  describe('RewriteLabsOrchestrator — full pipeline', () => {
    it('orchestrates crawl → extract → style → IR packet', async () => {
      const mockFetch = makeFetchMock();
      (globalThis as any).fetch = mockFetch;

      mockFetch.mockImplementation((url: unknown) => {
        if ((url as string).includes('/robots.txt')) return Promise.resolve({ ok: false });
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'text/html' }),
          text: () => Promise.resolve(sampleHtml),
        });
      });

      const orchestra = new RewriteLabsOrchestrator({ crawlerOptions: { politenessMs: 0 } });
      const result = await orchestra.orchestrate('https://example.com/');

      expect(result.crawlResult.status).toBe(200);
      expect(result.domModel).toBeTruthy();
      expect(result.styleMetrics).toBeTruthy();
      expect(result.irPacket).toBeTruthy();
      expect(result.irPacket?.version).toBe('1.1.0');
      expect(result.error).toBeUndefined();
    });

    it('handles crawl errors gracefully', async () => {
      const mockFetch = makeFetchMock();
      (globalThis as any).fetch = mockFetch;

      mockFetch.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

      const orchestra = new RewriteLabsOrchestrator({ crawlerOptions: { politenessMs: 0, retries: 0 } });
      const result = await orchestra.orchestrate('https://timeout.example.com/');

      expect(result.crawlResult.errorCode).toBe('TIMEOUT');
      expect(result.irPacket).toBeNull();
      expect(result.error).toBe('TIMEOUT');
    });

    it('reports DOM extraction failure', async () => {
      const mockFetch = makeFetchMock();
      (globalThis as any).fetch = mockFetch;

      mockFetch.mockImplementation((url: unknown) => {
        if ((url as string).includes('/robots.txt')) return Promise.resolve({ ok: false });
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          text: () => Promise.resolve('{}'),
        });
      });

      const orchestra = new RewriteLabsOrchestrator({ crawlerOptions: { politenessMs: 0 } });
      const result = await orchestra.orchestrate('https://example.com/api');

      expect(result.crawlResult.status).toBe(200);
      expect(result.domModel).toBeNull();
      expect(result.error).toBe('DOM_EXTRACTION_FAILED');
      expect(result.irPacket).toBeNull();
    });
  });
});
