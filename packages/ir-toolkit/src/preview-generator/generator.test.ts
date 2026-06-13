import { PreviewGenerator, generatePreview } from './generator.js';
import type { IRPacket } from '../schemas/ir.types.js';

describe('PreviewGenerator', () => {
  let generator: PreviewGenerator;

  const createMockIR = (overrides?: Partial<IRPacket>): IRPacket => ({
    version: '1.0.0',
    meta: {
      url: 'https://example.com',
      captureDate: new Date().toISOString(),
      toolVersion: '1.0.0'
    },
    designTokens: {
      colors: { primary: '#0066cc', secondary: '#ff6600', gray: '#999999' },
      spacing: { sm: '4px', md: '8px', lg: '16px', xl: '32px' }
    },
    routes: [
      { path: '/', title: 'Home', componentIds: ['hero', 'cta'], assetCount: 10 },
      { path: '/about', title: 'About', componentIds: ['about-hero', 'team'], assetCount: 8 }
    ],
    components: [
      { id: 'hero', name: 'Hero Section', type: 'section', usageCount: 1, complexity: 45 },
      { id: 'cta', name: 'CTA Button', type: 'button', usageCount: 5, complexity: 20 },
      { id: 'about-hero', name: 'About Hero', type: 'section', usageCount: 1, complexity: 40 },
      { id: 'team', name: 'Team Grid', type: 'grid', usageCount: 1, complexity: 55 }
    ],
    assets: { images: 15, videos: 2, svgs: 8, total: 25 },
    metrics: {
      totalComponentCount: 4,
      totalRouteCount: 2,
      averageComplexity: 40,
      accessibility: { wcagIssues: 5, severity: 'medium' }
    },
    ...overrides
  });

  beforeEach(() => {
    generator = new PreviewGenerator();
  });

  describe('constructor', () => {
    it('creates generator with default config', () => {
      expect(generator).toBeDefined();
    });

    it('accepts custom config', () => {
      const custom = new PreviewGenerator({
        focusOnAccessibility: false,
        emphasizeVisualDesign: false,
        detailLevel: 'summary'
      });
      expect(custom).toBeDefined();
    });
  });

  describe('generate', () => {
    it('returns valid PreviewGallery', () => {
      const ir = createMockIR();
      const result = generatePreview(ir);

      expect(result).toBeDefined();
      expect(result.url).toBe(ir.meta.url);
      expect(result.before).toBeDefined();
      expect(result.after).toBeDefined();
      expect(result.componentPreviews).toBeDefined();
      expect(Array.isArray(result.componentPreviews)).toBe(true);
    });

    it('includes all IR components in previews', () => {
      const ir = createMockIR();
      const result = generatePreview(ir);

      expect(result.componentPreviews.length).toBe(ir.components.length);
      const previewIds = result.componentPreviews.map(c => c.id);
      const irIds = ir.components.map(c => c.id);
      expect(previewIds.sort()).toEqual(irIds.sort());
    });

    it('generates meaningful improvements for each component', () => {
      const ir = createMockIR();
      const result = generatePreview(ir);

      for (const preview of result.componentPreviews) {
        expect(preview.improvements.length).toBeGreaterThan(0);
        expect(preview.improvementScore).toBeGreaterThanOrEqual(0);
        expect(preview.improvementScore).toBeLessThanOrEqual(100);
      }
    });

    it('calculates overall improvement score 0-100', () => {
      const ir = createMockIR();
      const result = generatePreview(ir);

      expect(result.overallImprovementScore).toBeGreaterThanOrEqual(0);
      expect(result.overallImprovementScore).toBeLessThanOrEqual(100);
    });

    it('generates layout diffs', () => {
      const ir = createMockIR();
      const result = generatePreview(ir);

      expect(result.layoutDiffs).toBeDefined();
      expect(Array.isArray(result.layoutDiffs)).toBe(true);
      expect(result.layoutDiffs.length).toBeGreaterThan(0);

      for (const diff of result.layoutDiffs) {
        expect(['spacing', 'grid', 'responsive', 'alignment'].includes(diff.aspect)).toBe(true);
        expect(diff.impactScore).toBeGreaterThan(0);
      }
    });

    it('generates design token diffs', () => {
      const ir = createMockIR();
      const result = generatePreview(ir);

      expect(result.designTokenDiffs).toBeDefined();
      expect(Array.isArray(result.designTokenDiffs)).toBe(true);
      expect(result.designTokenDiffs.length).toBeGreaterThan(0);

      for (const diff of result.designTokenDiffs) {
        expect(['color', 'typography', 'spacing', 'shadow', 'border'].includes(diff.category)).toBe(true);
      }
    });

    it('generates component categories', () => {
      const ir = createMockIR();
      const result = generatePreview(ir);

      expect(result.componentCategories).toBeDefined();
      expect(result.componentCategories.hero).toBeDefined();
      expect(result.componentCategories.buttons).toBeDefined();
      expect(result.componentCategories.navigation).toBeDefined();
      expect(result.componentCategories.cards).toBeDefined();
      expect(result.componentCategories.forms).toBeDefined();
      expect(result.componentCategories.other).toBeDefined();
    });

    it('generates meaningful narrative', () => {
      const ir = createMockIR();
      const result = generatePreview(ir);

      expect(result.transformationNarrative).toBeDefined();
      expect(typeof result.transformationNarrative).toBe('string');
      expect(result.transformationNarrative.length).toBeGreaterThan(50);
    });

    it('extracts key highlights', () => {
      const ir = createMockIR();
      const result = generatePreview(ir);

      expect(result.keyHighlights).toBeDefined();
      expect(Array.isArray(result.keyHighlights)).toBe(true);
      expect(result.keyHighlights.length).toBeGreaterThan(0);
      expect(result.keyHighlights[0]).toMatch(/^[A-Z]/); // starts with capital letter
    });

    it('estimates total effort', () => {
      const ir = createMockIR();
      const result = generatePreview(ir);

      expect(['low', 'medium', 'high', 'enterprise'].includes(result.estimatedTotalEffort)).toBe(true);
    });

    it('respects detail level config', () => {
      const ir = createMockIR();

      const detailed = generatePreview(ir, { detailLevel: 'detailed' });
      const summary = generatePreview(ir, { detailLevel: 'summary' });

      // Summary should have fewer diffs/improvements
      expect(summary.componentPreviews[0]?.improvements.length).toBeLessThanOrEqual(
        detailed.componentPreviews[0]?.improvements.length ?? 0
      );
    });

    it('respects accessibility focus config', () => {
      const ir = createMockIR();

      const withA11y = generatePreview(ir, { focusOnAccessibility: true });
      const withoutA11y = generatePreview(ir, { focusOnAccessibility: false });

      const a11yImprovements = withA11y.componentPreviews.flatMap(c =>
        c.improvements.filter(i => i.aspect === 'accessibility')
      );

      const noA11yImprovements = withoutA11y.componentPreviews.flatMap(c =>
        c.improvements.filter(i => i.aspect === 'accessibility')
      );

      expect(a11yImprovements.length).toBeGreaterThanOrEqual(noA11yImprovements.length);
    });
  });

  describe('component categorization', () => {
    it('categorizes hero components correctly', () => {
      const ir = createMockIR({
        components: [
          { id: 'hero', name: 'Hero Banner', type: 'section', usageCount: 1 }
        ]
      });

      const result = generatePreview(ir);

      expect(result.componentCategories.hero.length).toBeGreaterThan(0);
      expect(result.componentCategories.hero[0].name).toContain('Hero');
    });

    it('categorizes form components correctly', () => {
      const ir = createMockIR({
        components: [
          { id: 'form', name: 'Contact Form', type: 'form', usageCount: 1 }
        ]
      });

      const result = generatePreview(ir);

      expect(result.componentCategories.forms.length).toBeGreaterThan(0);
    });

    it('categorizes navigation components correctly', () => {
      const ir = createMockIR({
        components: [
          { id: 'nav', name: 'Navigation Menu', type: 'nav', usageCount: 1 }
        ]
      });

      const result = generatePreview(ir);

      expect(result.componentCategories.navigation.length).toBeGreaterThan(0);
    });

    it('categorizes button components correctly', () => {
      const ir = createMockIR({
        components: [
          { id: 'btn', name: 'Primary Button', type: 'button', usageCount: 3 }
        ]
      });

      const result = generatePreview(ir);

      expect(result.componentCategories.buttons.length).toBeGreaterThan(0);
    });

    it('categorizes card components correctly', () => {
      const ir = createMockIR({
        components: [
          { id: 'card', name: 'Product Card', type: 'card', usageCount: 10 }
        ]
      });

      const result = generatePreview(ir);

      expect(result.componentCategories.cards.length).toBeGreaterThan(0);
    });

    it('puts uncategorized components in other', () => {
      const ir = createMockIR({
        components: [
          { id: 'custom', name: 'Custom Component', type: 'custom', usageCount: 1 }
        ]
      });

      const result = generatePreview(ir);

      expect(result.componentCategories.other.length).toBeGreaterThan(0);
    });
  });

  describe('effort estimation', () => {
    it('estimates low or medium effort for simple components', () => {
      const ir = createMockIR({
        components: [
          { id: 'simple', name: 'Simple Button', type: 'button', usageCount: 1, complexity: 10 }
        ]
      });

      const result = generatePreview(ir);
      const component = result.componentPreviews[0];

      expect(['low', 'medium'].includes(component.estimatedEffort)).toBe(true);
    });

    it('estimates high effort for complex components', () => {
      const ir = createMockIR({
        components: [
          { id: 'complex', name: 'Complex Component', type: 'section', usageCount: 5, complexity: 90 }
        ]
      });

      const result = generatePreview(ir);
      const component = result.componentPreviews[0];

      expect(component.estimatedEffort).toBe('high');
    });

    it('estimates enterprise effort for many complex components', () => {
      const complexComps = Array.from({ length: 15 }, (_, i) => ({
        id: `comp${i}`,
        name: `Complex Component ${i}`,
        type: 'section',
        usageCount: 2,
        complexity: 80
      }));

      const ir = createMockIR({
        components: complexComps
      });

      const result = generatePreview(ir);

      expect(result.estimatedTotalEffort).toBe('enterprise');
    });
  });

  describe('score calculation', () => {
    it('calculates score based on component improvements', () => {
      const ir = createMockIR();
      const result = generatePreview(ir);

      // Score should be influenced by component improvements
      const avgComponentScore = result.componentPreviews.reduce((sum, c) => sum + c.improvementScore, 0) / result.componentPreviews.length;
      expect(result.overallImprovementScore).toBeGreaterThan(avgComponentScore - 20);
      expect(result.overallImprovementScore).toBeLessThan(avgComponentScore + 20);
    });

    it('high-complexity IR produces similar or higher score', () => {
      const simple = createMockIR({
        components: [
          { id: 'btn', name: 'Button', type: 'button', usageCount: 1, complexity: 10 }
        ]
      });

      const complex = createMockIR({
        components: [
          { id: 'app', name: 'App', type: 'app', usageCount: 1, complexity: 95 }
        ]
      });

      const simpleResult = generatePreview(simple);
      const complexResult = generatePreview(complex);

      // Complex IR should score in similar range as simple (both get layout/token improvements)
      expect(Math.abs(complexResult.overallImprovementScore - simpleResult.overallImprovementScore)).toBeLessThan(20);
    });
  });

  describe('determinism', () => {
    it('produces consistent results for same input', () => {
      const ir = createMockIR();

      const result1 = generatePreview(ir);
      const result2 = generatePreview(ir);

      expect(result1.overallImprovementScore).toBe(result2.overallImprovementScore);
      expect(result1.componentPreviews.length).toBe(result2.componentPreviews.length);
      expect(result1.estimatedTotalEffort).toBe(result2.estimatedTotalEffort);
    });
  });

  describe('edge cases', () => {
    it('handles IR with no accessibility issues', () => {
      const ir = createMockIR({
        metrics: {
          totalComponentCount: 4,
          totalRouteCount: 2,
          averageComplexity: 40,
          accessibility: { wcagIssues: 0, severity: 'low' }
        }
      });

      const result = generatePreview(ir);

      expect(result.componentPreviews).toBeDefined();
      expect(result.componentPreviews.length).toBe(ir.components.length);
    });

    it('handles IR with many routes', () => {
      const manyRoutes = Array.from({ length: 20 }, (_, i) => ({
        path: `/page${i}`,
        title: `Page ${i}`,
        componentIds: ['hero', 'content'],
        assetCount: 5
      }));

      const ir = createMockIR({
        routes: manyRoutes
      });

      const result = generatePreview(ir);

      expect(result.layoutDiffs.length).toBeGreaterThan(0);
    });

    it('handles IR with many design tokens', () => {
      const manyColors = Object.fromEntries(
        Array.from({ length: 15 }, (_, i) => [`color${i}`, `#${String(i).padStart(6, '0')}`])
      );

      const ir = createMockIR({
        designTokens: {
          colors: manyColors,
          spacing: { sm: '4px', md: '8px', lg: '16px', xl: '32px' }
        }
      });

      const result = generatePreview(ir);

      expect(result.designTokenDiffs.length).toBeGreaterThan(0);
    });

    it('handles empty component improvements', () => {
      const ir = createMockIR({
        components: [
          { id: 'empty', name: 'Empty', type: 'div', usageCount: 0 }
        ]
      });

      const result = generatePreview(ir);

      expect(result.componentPreviews[0].improvements.length).toBeGreaterThan(0);
    });
  });

  describe('snapshot structure', () => {
    it('before snapshot has required fields', () => {
      const ir = createMockIR();
      const result = generatePreview(ir);

      expect(result.before.type).toBe('before');
      expect(result.before.timestamp).toBeDefined();
      expect(result.before.description).toBeDefined();
      expect(result.before.summary).toBeDefined();
    });

    it('after snapshot has required fields', () => {
      const ir = createMockIR();
      const result = generatePreview(ir);

      expect(result.after.type).toBe('after');
      expect(result.after.timestamp).toBeDefined();
      expect(result.after.description).toBeDefined();
      expect(result.after.summary).toBeDefined();
    });
  });
});
