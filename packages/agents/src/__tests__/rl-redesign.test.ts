/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Must be set before dynamic import resolves the module
const mockMessagesCreate = jest.fn();

jest.unstable_mockModule('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate },
  })),
}));

const { RedesignAgent, RedesignNotConfiguredError, REDESIGN_VERSION } = await import(
  '../redesign/redesign-agent.js'
);

describe('RL-4.1: RedesignAgent — 3-Pass LLM Chain', () => {

  describe('RedesignAgent constructor', () => {
    it('initializes with default options', () => {
      const agent = new RedesignAgent();
      expect(agent).toBeTruthy();
    });

    it('accepts custom model and maxTokens', () => {
      const agent = new RedesignAgent({ model: 'claude-sonnet-4-6', maxTokens: 8192 });
      expect(agent).toBeTruthy();
    });
  });

  describe('RedesignNotConfiguredError', () => {
    it('throws when ANTHROPIC_API_KEY not set', async () => {
      const saved = process.env['ANTHROPIC_API_KEY'];
      delete process.env['ANTHROPIC_API_KEY'];
      try {
        const agent = new RedesignAgent();
        await expect(
          agent.redesign({ url: 'https://example.com' })
        ).rejects.toThrow(RedesignNotConfiguredError);
        await expect(
          agent.redesign({ url: 'https://example.com' })
        ).rejects.toThrow('ANTHROPIC_API_KEY');
      } finally {
        if (saved !== undefined) process.env['ANTHROPIC_API_KEY'] = saved;
      }
    });

    it('RedesignNotConfiguredError is instanceof RedesignNotConfiguredError', async () => {
      const saved = process.env['ANTHROPIC_API_KEY'];
      delete process.env['ANTHROPIC_API_KEY'];
      try {
        const agent = new RedesignAgent();
        let caught: unknown;
        try {
          await agent.redesign({ url: 'https://example.com' });
        } catch (err) {
          caught = err;
        }
        expect(caught instanceof RedesignNotConfiguredError).toBe(true);
      } finally {
        if (saved !== undefined) process.env['ANTHROPIC_API_KEY'] = saved;
      }
    });
  });

  describe('REDESIGN_VERSION', () => {
    it('is a semver string', () => {
      expect(REDESIGN_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('W3C validation (structural)', () => {
    let agent: InstanceType<typeof RedesignAgent>;

    beforeEach(() => {
      agent = new RedesignAgent();
    });

    it('passes fully valid HTML', () => {
      const html = [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head><meta charset="UTF-8"><title>Test</title></head>',
        '<body><h1>Hello</h1></body>',
        '</html>',
      ].join('\n');

      const result = (agent as any).validateW3C(html);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects missing DOCTYPE', () => {
      const html = '<html lang="en"><head><meta charset="UTF-8"><title>T</title></head><body></body></html>';
      const result = (agent as any).validateW3C(html);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing DOCTYPE declaration');
    });

    it('detects missing lang attribute', () => {
      const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>T</title></head><body></body></html>';
      const result = (agent as any).validateW3C(html);
      expect(result.errors.some((e: string) => e.includes('lang'))).toBe(true);
    });

    it('detects missing title', () => {
      const html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body></body></html>';
      const result = (agent as any).validateW3C(html);
      expect(result.errors.some((e: string) => e.includes('title'))).toBe(true);
    });

    it('detects missing charset', () => {
      const html = '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body></body></html>';
      const result = (agent as any).validateW3C(html);
      expect(result.errors.some((e: string) => e.includes('charset'))).toBe(true);
    });

    it('accumulates multiple errors', () => {
      const html = '<html><head></head><body></body></html>';
      const result = (agent as any).validateW3C(html);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Token drift calculation', () => {
    let agent: InstanceType<typeof RedesignAgent>;

    beforeEach(() => {
      agent = new RedesignAgent();
    });

    it('returns 0 drift when no source tokens', () => {
      const drift = (agent as any).calculateTokenDrift({}, '.btn { color: red; }');
      expect(drift).toBe(0);
    });

    it('returns 0 drift when all tokens used in CSS', () => {
      const sourceTokens = { 'color-primary': '#007bff', 'font-base': 'Arial' };
      const css = 'body { color: #007bff; font-family: Arial; }';
      const drift = (agent as any).calculateTokenDrift(sourceTokens, css);
      expect(drift).toBe(0);
    });

    it('returns 1.0 drift when no tokens appear in CSS', () => {
      const sourceTokens = { 'color-primary': '#007bff', 'font-base': 'Arial' };
      const css = 'body { color: red; font-family: sans-serif; }';
      const drift = (agent as any).calculateTokenDrift(sourceTokens, css);
      expect(drift).toBe(1);
    });

    it('returns partial drift for partial token usage', () => {
      const sourceTokens = { 'color-primary': '#007bff', 'color-accent': '#ff0000' };
      const css = 'body { color: #007bff; }';
      const drift = (agent as any).calculateTokenDrift(sourceTokens, css);
      expect(drift).toBeGreaterThan(0);
      expect(drift).toBeLessThan(1);
      expect(drift).toBe(0.5);
    });

    it('drift score is in [0, 1] range', () => {
      const tokens = { a: '#111', b: '#222', c: '#333' };
      const css = 'body { color: #111; }';
      const drift = (agent as any).calculateTokenDrift(tokens, css);
      expect(drift).toBeGreaterThanOrEqual(0);
      expect(drift).toBeLessThanOrEqual(1);
    });
  });

  describe('redesign() — mocked LLM', () => {
    const validHtml = (name: string) =>
      `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${name}</title></head><body><h1>${name}</h1></body></html>`;

    beforeEach(() => {
      process.env['ANTHROPIC_API_KEY'] = 'test-key';
      mockMessagesCreate.mockClear();
      mockMessagesCreate
        .mockResolvedValueOnce({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                layoutType: 'single-column',
                colorScheme: 'light',
                typographyHierarchy: 'standard',
                interactionDensity: 'medium',
                modernizationTargets: ['typography', 'spacing'],
                redesignBrief: 'Clean modern redesign with improved hierarchy.',
              }),
            },
          ],
        })
        .mockResolvedValueOnce({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                customProps: ':root { --color-primary: #007bff; --font-base: "Inter, sans-serif"; }',
                baseCSS: '*, *::before, *::after { box-sizing: border-box; } body { margin: 0; }',
              }),
            },
          ],
        })
        .mockResolvedValueOnce({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                variants: [
                  { name: 'Minimal', html: validHtml('Minimal'), css: 'body { color: #007bff; }' },
                  { name: 'Bold', html: validHtml('Bold'), css: 'body { font-weight: bold; color: #007bff; }' },
                  { name: 'Editorial', html: validHtml('Editorial'), css: 'body { font-size: 18px; color: #007bff; }' },
                ],
              }),
            },
          ],
        });
    });

    it('completes all 3 passes and returns variants', async () => {
      const agent = new RedesignAgent();
      const result = await agent.redesign({
        url: 'https://example.com',
        title: 'Example Site',
        designTokens: { 'color-primary': '#007bff' },
      });

      expect(result.passesCompleted).toBe(3);
      expect(result.sourceUrl).toBe('https://example.com');
      expect(result.variants).toHaveLength(3);
    });

    it('variants have required shape', async () => {
      const agent = new RedesignAgent();
      const result = await agent.redesign({ url: 'https://example.com' });

      for (const v of result.variants) {
        expect(v.variantId).toMatch(/^variant-\d+$/);
        expect(typeof v.variantName).toBe('string');
        expect(typeof v.html).toBe('string');
        expect(typeof v.css).toBe('string');
        expect(v.tokenDriftScore).toBeGreaterThanOrEqual(0);
        expect(v.tokenDriftScore).toBeLessThanOrEqual(1);
        expect(typeof v.w3cValid).toBe('boolean');
        expect(Array.isArray(v.w3cErrors)).toBe(true);
      }
    });

    it('W3C-valid HTML produces w3cValid=true', async () => {
      const agent = new RedesignAgent();
      const result = await agent.redesign({
        url: 'https://example.com',
        designTokens: { 'color-primary': '#007bff' },
      });

      expect(result.variants.every((v) => v.w3cValid)).toBe(true);
    });

    it('token drift reflects token usage in CSS', async () => {
      const agent = new RedesignAgent();
      const result = await agent.redesign({
        url: 'https://example.com',
        designTokens: { 'color-primary': '#007bff' },
      });

      // CSS contains #007bff → token used → drift should be 0
      for (const v of result.variants) {
        expect(v.tokenDriftScore).toBe(0);
      }
    });

    it('generationTimeMs is non-negative', async () => {
      const agent = new RedesignAgent();
      const result = await agent.redesign({ url: 'https://example.com' });
      expect(result.generationTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('LLM called exactly 3 times (one per pass)', async () => {
      const agent = new RedesignAgent();
      await agent.redesign({ url: 'https://example.com' });
      expect(mockMessagesCreate).toHaveBeenCalledTimes(3);
    });
  });
});
