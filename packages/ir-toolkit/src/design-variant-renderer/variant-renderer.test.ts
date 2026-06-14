import { DesignVariantRenderer } from './index.js';
import type { DesignVariantInput } from './index.js';

const validHtml = (title = 'Test') => [
  '<!DOCTYPE html>',
  '<html lang="en">',
  `<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>`,
  '<body><h1>Hello</h1></body>',
  '</html>',
].join('\n');

const sampleVariant = (id = '1', name = 'Minimal'): DesignVariantInput => ({
  variantId: `variant-${id}`,
  variantName: name,
  html: validHtml(name),
  css: ':root { --color-primary: #007bff; } body { font-family: "Inter, sans-serif"; margin: 0; }',
});

describe('DesignVariantRenderer', () => {

  describe('render()', () => {
    it('returns a RenderedVariant with all required fields', () => {
      const renderer = new DesignVariantRenderer();
      const result = renderer.render(sampleVariant());

      expect(result.variantId).toBe('variant-1');
      expect(result.variantName).toBe('Minimal');
      expect(typeof result.html).toBe('string');
      expect(typeof result.css).toBe('string');
      expect(typeof result.tokenDriftScore).toBe('number');
      expect(typeof result.w3cValid).toBe('boolean');
      expect(Array.isArray(result.w3cErrors)).toBe(true);
      expect(typeof result.renderedAt).toBe('string');
    });

    it('renders w3cValid=true for valid HTML', () => {
      const renderer = new DesignVariantRenderer();
      const result = renderer.render(sampleVariant());
      expect(result.w3cValid).toBe(true);
      expect(result.w3cErrors).toHaveLength(0);
    });

    it('renders w3cValid=false for invalid HTML', () => {
      const renderer = new DesignVariantRenderer();
      const variant: DesignVariantInput = {
        ...sampleVariant(),
        html: '<html><head></head><body></body></html>',
      };
      const result = renderer.render(variant);
      expect(result.w3cValid).toBe(false);
      expect(result.w3cErrors.length).toBeGreaterThan(0);
    });

    it('calculates zero drift when tokens present in CSS', () => {
      const renderer = new DesignVariantRenderer();
      const result = renderer.render(sampleVariant(), {
        sourceTokens: { 'color-primary': '#007bff' },
      });
      expect(result.tokenDriftScore).toBe(0);
    });

    it('calculates full drift when tokens absent from CSS', () => {
      const renderer = new DesignVariantRenderer();
      const result = renderer.render(sampleVariant(), {
        sourceTokens: { 'color-accent': '#ff0000', 'color-danger': '#cc0000' },
      });
      expect(result.tokenDriftScore).toBe(1);
    });

    it('calculates partial drift', () => {
      const renderer = new DesignVariantRenderer();
      const result = renderer.render(sampleVariant(), {
        sourceTokens: { 'color-primary': '#007bff', 'color-accent': '#ff0000' },
      });
      expect(result.tokenDriftScore).toBeGreaterThan(0);
      expect(result.tokenDriftScore).toBeLessThan(1);
    });

    it('returns zero drift when no source tokens', () => {
      const renderer = new DesignVariantRenderer();
      const result = renderer.render(sampleVariant(), { sourceTokens: {} });
      expect(result.tokenDriftScore).toBe(0);
    });
  });

  describe('renderAll()', () => {
    it('renders all variants', () => {
      const renderer = new DesignVariantRenderer();
      const variants = [sampleVariant('1', 'Minimal'), sampleVariant('2', 'Bold'), sampleVariant('3', 'Editorial')];
      const result = renderer.renderAll(variants);
      expect(result.variants).toHaveLength(3);
    });

    it('reports allW3CValid correctly', () => {
      const renderer = new DesignVariantRenderer();
      const variants = [sampleVariant('1'), sampleVariant('2'), sampleVariant('3')];
      const result = renderer.renderAll(variants);
      expect(result.allW3CValid).toBe(true);
    });

    it('allW3CValid=false when any variant has errors', () => {
      const renderer = new DesignVariantRenderer();
      const variants: DesignVariantInput[] = [
        sampleVariant('1'),
        { ...sampleVariant('2'), html: '<html><body></body></html>' },
      ];
      const result = renderer.renderAll(variants);
      expect(result.allW3CValid).toBe(false);
    });

    it('meetsThreshold=true when maxDrift ≤ 0.15', () => {
      const renderer = new DesignVariantRenderer();
      const variants = [sampleVariant('1')];
      const result = renderer.renderAll(variants, {
        sourceTokens: { 'color-primary': '#007bff' },
      });
      expect(result.meetsThreshold).toBe(true);
    });

    it('meetsThreshold=false when drift exceeds threshold', () => {
      const renderer = new DesignVariantRenderer();
      const variants: DesignVariantInput[] = [
        {
          variantId: 'variant-1',
          variantName: 'HighDrift',
          html: validHtml(),
          css: 'body { color: red; }',
        },
      ];
      const result = renderer.renderAll(variants, {
        sourceTokens: {
          c1: '#111', c2: '#222', c3: '#333', c4: '#444',
          c5: '#555', c6: '#666', c7: '#777',
        },
      });
      expect(result.meetsThreshold).toBe(false);
    });

    it('reports correct maxTokenDrift', () => {
      const renderer = new DesignVariantRenderer();
      const variants: DesignVariantInput[] = [
        { ...sampleVariant('1'), css: 'body { color: #007bff; }' },  // drift 0
        { ...sampleVariant('2'), css: 'body { color: red; }' },       // drift 1
      ];
      const result = renderer.renderAll(variants, {
        sourceTokens: { 'color-primary': '#007bff' },
      });
      expect(result.maxTokenDrift).toBe(1);
    });

    it('supports custom drift threshold', () => {
      const renderer = new DesignVariantRenderer();
      const variants: DesignVariantInput[] = [
        { ...sampleVariant('1'), css: 'body { color: red; }' },
      ];
      const highThreshold = renderer.renderAll(
        variants,
        { sourceTokens: { c: '#007bff' } },
        1.0
      );
      expect(highThreshold.meetsThreshold).toBe(true);

      const lowThreshold = renderer.renderAll(
        variants,
        { sourceTokens: { c: '#007bff' } },
        0.0
      );
      expect(lowThreshold.meetsThreshold).toBe(false);
    });
  });

  describe('validateW3C()', () => {
    const renderer = new DesignVariantRenderer();

    it('passes complete valid HTML', () => {
      const result = renderer.validateW3C(validHtml());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('flags missing DOCTYPE', () => {
      const html = '<html lang="en"><head><meta charset="UTF-8"><title>T</title></head><body></body></html>';
      const result = renderer.validateW3C(html);
      expect(result.errors).toContain('Missing DOCTYPE declaration');
    });

    it('flags missing lang attribute', () => {
      const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>T</title></head><body></body></html>';
      const result = renderer.validateW3C(html);
      expect(result.errors.some((e) => e.includes('lang'))).toBe(true);
    });

    it('flags missing title', () => {
      const html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body></body></html>';
      const result = renderer.validateW3C(html);
      expect(result.errors.some((e) => e.includes('title'))).toBe(true);
    });

    it('flags missing charset', () => {
      const html = '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body></body></html>';
      const result = renderer.validateW3C(html);
      expect(result.errors.some((e) => e.includes('charset'))).toBe(true);
    });

    it('strict mode adds viewport check', () => {
      const htmlNoViewport = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>T</title></head><body></body></html>';
      const lenient = renderer.validateW3C(htmlNoViewport, false);
      const strict = renderer.validateW3C(htmlNoViewport, true);
      expect(lenient.valid).toBe(true);
      expect(strict.errors.some((e) => e.includes('viewport'))).toBe(true);
    });
  });

  describe('calculateTokenDrift()', () => {
    const renderer = new DesignVariantRenderer();

    it('zero drift with empty token map', () => {
      expect(renderer.calculateTokenDrift({}, 'body { color: red; }')).toBe(0);
    });

    it('zero drift when all tokens in CSS', () => {
      const tokens = { primary: '#007bff', font: 'Inter' };
      const css = 'body { color: #007bff; font-family: Inter; }';
      expect(renderer.calculateTokenDrift(tokens, css)).toBe(0);
    });

    it('full drift when no tokens in CSS', () => {
      const tokens = { primary: '#007bff', font: 'Inter' };
      const css = 'body { color: red; }';
      expect(renderer.calculateTokenDrift(tokens, css)).toBe(1);
    });

    it('drift is in [0, 1] range', () => {
      const tokens = { a: '#111', b: '#222', c: '#333' };
      const css = 'body { color: #111; }';
      const drift = renderer.calculateTokenDrift(tokens, css);
      expect(drift).toBeGreaterThanOrEqual(0);
      expect(drift).toBeLessThanOrEqual(1);
    });

    it('drift is 0.15 threshold-compatible', () => {
      const tokens = { a: '#111', b: '#222', c: '#333', d: '#444',
                       e: '#555', f: '#666', g: '#777' };
      const css = 'body { color: #111; background: #222; border: #333; padding: #444; margin: #555; gap: #666; }';
      const drift = renderer.calculateTokenDrift(tokens, css);
      expect(drift).toBeLessThanOrEqual(0.15);
    });
  });
});
