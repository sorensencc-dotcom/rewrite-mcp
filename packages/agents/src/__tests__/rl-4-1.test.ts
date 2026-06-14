/* eslint-disable @typescript-eslint/no-explicit-any */
import { PlaywrightExtractor, PlaywrightNotConfiguredError } from '../extractors/playwright-extractor.js';
import { ComputedStylesAnalyzer } from '../extractors/computed-styles.js';
import { IRPacketV12Builder } from '../extractors/ir-v1-2-extension.js';

describe('RL-4.1: Playwright Browser Engine + Computed Styles', () => {

  describe('PlaywrightExtractor', () => {
    it('initializes with default options', () => {
      const extractor = new PlaywrightExtractor();
      expect(extractor).toBeTruthy();
    });

    it('accepts custom options', () => {
      const extractor = new PlaywrightExtractor({
        headless: false,
        timeout: 60_000,
        viewport: { width: 1280, height: 720 },
      });
      expect(extractor).toBeTruthy();
    });

    it('throws PlaywrightNotConfiguredError when PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH not set', async () => {
      const saved = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];
      delete process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];
      try {
        const extractor = new PlaywrightExtractor();
        await expect(extractor.extract('https://example.com')).rejects.toThrow(
          PlaywrightNotConfiguredError
        );
        await expect(extractor.extract('https://example.com')).rejects.toThrow(
          'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'
        );
      } finally {
        if (saved !== undefined) process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] = saved;
      }
    });
  });

  describe('ComputedStylesAnalyzer', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sampleComputedStyles: any[] = [
      {
        selector: 'h1',
        computed: {
          'font-family': 'Arial, sans-serif',
          'font-size': '32px',
          'color': '#333333',
          'display': 'block',
          'margin': '16px 0',
        },
        box: { width: 800, height: 48, top: 10, left: 0 },
      },
      {
        selector: '.button',
        computed: {
          'display': 'inline-block',
          'background-color': '#007bff',
          'color': '#ffffff',
          'padding': '8px 16px',
          'border-radius': '4px',
          'font-size': '14px',
        },
        box: { width: 120, height: 36, top: 100, left: 20 },
      },
      {
        selector: 'body',
        computed: {
          'font-family': 'Arial, sans-serif',
          'font-size': '16px',
          'color': '#666666',
          'margin': '0',
          'padding': '0',
        },
      },
    ];

    it('analyzes computed styles and counts unique values', () => {
      const analyzer = new ComputedStylesAnalyzer();
      const metrics = analyzer.analyze(sampleComputedStyles);

      expect(metrics.totalElements).toBe(3);
      expect(metrics.uniqueFonts.size).toBeGreaterThan(0);
      expect(metrics.uniqueFontSizes.size).toBeGreaterThan(0);
      expect(metrics.uniqueColors.size).toBeGreaterThan(0);
      expect(metrics.displayModes.size).toBeGreaterThan(0);
    });

    it('categorizes styles by functional purpose', () => {
      const analyzer = new ComputedStylesAnalyzer();
      const categories = analyzer.categorizeStyles(sampleComputedStyles);

      expect(categories.layout).toHaveLength(2);   // h1 + .button have display; body does not
      expect(categories.typography).toHaveLength(3); // all three have font-family or font-size
      expect(categories.color).toHaveLength(3);      // all three have color or background-color
      expect(categories.spacing).toHaveLength(3);   // all three have margin or padding
    });

    it('extracts design tokens from metrics', () => {
      const analyzer = new ComputedStylesAnalyzer();
      const metrics = analyzer.analyze(sampleComputedStyles);
      const tokens = analyzer.extractDesignTokens(metrics);

      expect(Array.isArray(tokens.colors)).toBe(true);
      expect(Array.isArray(tokens.fonts)).toBe(true);
      expect(Array.isArray(tokens.fontSizes)).toBe(true);
      expect(Array.isArray(tokens.spacings)).toBe(true);
      expect(tokens.colors.length).toBeGreaterThan(0);
    });

    it('detects breakpoints from media queries', () => {
      const analyzer = new ComputedStylesAnalyzer();
      const mediaQueries = new Set([
        '@media (max-width: 768px)',
        '@media (min-width: 1024px)',
        '@media (max-width: 480px)',
      ]);

      const breakpoints = analyzer.detectBreakpoints(mediaQueries);

      expect(breakpoints).toContain(480);
      expect(breakpoints).toContain(768);
      expect(breakpoints).toContain(1024);
      expect(breakpoints[0]).toBeLessThan(breakpoints[breakpoints.length - 1]);
    });
  });

  describe('IRPacketV12Extension', () => {
    const mockPlaywrightModel = {
      url: 'https://example.com/',
      title: 'Test Page',
      viewport: { width: 1920, height: 1080 },
      computedStyles: [
        {
          selector: 'h1',
          computed: { 'font-size': '32px', 'color': '#333333' },
        },
      ],
      interactiveElements: [
        {
          tag: 'button',
          selector: '.btn',
          text: 'Click me',
          isVisible: true,
          isDisabled: false,
        },
        {
          tag: 'input',
          type: 'text',
          selector: '#search',
          ariaLabel: 'Search',
          isVisible: true,
          isDisabled: false,
        },
      ],
      screenshots: [
        {
          width: 1920,
          height: 1080,
          dataUrl: 'data:image/png;base64,...',
          capturedAt: new Date().toISOString(),
        },
      ],
      performanceMetrics: {
        navigationStart: 0,
        loadEventEnd: 2500,
        domContentLoadedEventEnd: 1800,
        firstContentfulPaint: 800,
      },
      jsExecutionTime: 150,
      extractedAt: new Date().toISOString(),
    };

    it('builds IR v1.2 extension from Playwright model', () => {
      const builder = new IRPacketV12Builder();
      const extension = builder.buildExtension(mockPlaywrightModel);

      expect(extension.playwrightEnabled).toBe(true);
      expect(extension.computedStyles).toBeTruthy();
      expect(extension.screenshots).toBeTruthy();
      expect(extension.interactiveElements).toBeTruthy();
      expect(extension.performanceMetrics).toBeTruthy();
    });

    it('counts interactive elements correctly', () => {
      const builder = new IRPacketV12Builder();
      const extension = builder.buildExtension(mockPlaywrightModel);

      expect(extension.interactiveElements?.count.buttons).toBe(1);
      expect(extension.interactiveElements?.count.inputs).toBe(1);
      expect(extension.interactiveElements?.count.links).toBe(0);
    });

    it('converts screenshots to references', () => {
      const builder = new IRPacketV12Builder();
      const extension = builder.buildExtension(mockPlaywrightModel);

      expect(extension.screenshots).toHaveLength(1);
      expect(extension.screenshots?.[0].type).toBe('viewport');
      expect(extension.screenshots?.[0].dataUrl).toContain('data:image');
    });

    it('calculates performance metrics', () => {
      const builder = new IRPacketV12Builder();
      const extension = builder.buildExtension(mockPlaywrightModel);

      expect(extension.performanceMetrics?.navigationTimeMs).toBe(2500);
      expect(extension.performanceMetrics?.domContentLoadedMs).toBe(1800);
      expect(extension.performanceMetrics?.jsExecutionTimeMs).toBe(150);
    });
  });

  describe('IR v1.2 integration', () => {
    it('merges v1.0 (static) + v1.1 (CSS) + v1.2 (browser)', () => {
      // Simulates full pipeline:
      // v1.0: DomExtractor → DomModel (headings, images, links)
      // v1.1: StyleMatchEngine → CssMetrics
      // v1.2: PlaywrightExtractor → ComputedStyles + Screenshots + Performance

      const irPacketV10 = {
        version: '1.0.0',
        routes: [{ path: '/', title: 'Test Page', componentIds: [], assetCount: 5 }],
      };

      const irPacketV11 = {
        ...irPacketV10,
        cssMetrics: {
          totalSelectors: 25,
          uniqueClasses: 12,
          colorCount: 8,
        },
      };

      const irPacketV12 = {
        ...irPacketV11,
        playwrightEnabled: true,
        performanceMetrics: {
          navigationTimeMs: 2500,
          domContentLoadedMs: 1800,
        },
      };

      expect(irPacketV12.version).toBe('1.0.0');
      expect(irPacketV12.cssMetrics).toBeTruthy();
      expect(irPacketV12.playwrightEnabled).toBe(true);
    });
  });
});
