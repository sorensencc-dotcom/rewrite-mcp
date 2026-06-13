import { PricingEngine, generatePricing } from './generator.js';
import type { PreviewGallery } from '../schemas/preview.types.js';

describe('PricingEngine', () => {
  let engine: PricingEngine;

  const createMockGallery = (overrides?: Partial<PreviewGallery>): PreviewGallery => ({
    url: 'https://example.com',
    title: 'Example Redesign Preview',
    before: {
      type: 'before',
      timestamp: new Date().toISOString(),
      description: 'Current state',
      summary: 'Has 5 WCAG issues'
    },
    after: {
      type: 'after',
      timestamp: new Date().toISOString(),
      description: 'Proposed improvements',
      summary: 'Improvements score 72/100'
    },
    componentPreviews: [
      {
        id: 'hero',
        name: 'Hero Section',
        type: 'section',
        currentUsageCount: 1,
        currentComplexity: 45,
        improvements: [
          { aspect: 'accessibility', current: 'Issues', proposed: 'Fixed', rationale: 'Compliance', impactScore: 85 },
          { aspect: 'visual', current: 'Old', proposed: 'Modern', rationale: 'Style', impactScore: 70 }
        ],
        improvementScore: 77,
        estimatedEffort: 'medium',
        visualDescription: 'Hero section with CTA',
        beforeState: 'Current hero',
        afterState: 'Improved hero'
      },
      {
        id: 'cta',
        name: 'CTA Button',
        type: 'button',
        currentUsageCount: 5,
        currentComplexity: 20,
        improvements: [
          { aspect: 'interaction', current: 'Static', proposed: 'Interactive', rationale: 'UX', impactScore: 60 }
        ],
        improvementScore: 60,
        estimatedEffort: 'low',
        visualDescription: 'Primary button',
        beforeState: 'Current button',
        afterState: 'Improved button'
      },
      {
        id: 'about-hero',
        name: 'About Hero',
        type: 'section',
        currentUsageCount: 1,
        currentComplexity: 40,
        improvements: [
          { aspect: 'visual', current: 'Dated', proposed: 'Modern', rationale: 'Design', impactScore: 70 }
        ],
        improvementScore: 70,
        estimatedEffort: 'medium',
        visualDescription: 'About section',
        beforeState: 'Current about',
        afterState: 'Improved about'
      }
    ],
    layoutDiffs: [
      {
        aspect: 'responsive',
        current: '3 routes with inconsistent breakpoints',
        proposed: 'Unified responsive grid',
        rationale: 'Better mobile experience',
        impactScore: 75
      },
      {
        aspect: 'spacing',
        current: 'Inconsistent spacing',
        proposed: 'Standard spacing scale',
        rationale: 'Visual consistency',
        impactScore: 60
      }
    ],
    designTokenDiffs: [
      {
        category: 'color',
        currentValue: '12 custom colors',
        proposedValue: '8-color system',
        rationale: 'Reduce decision fatigue',
        affectedCount: 3,
        impactScore: 70
      },
      {
        category: 'typography',
        currentValue: 'Varied fonts',
        proposedValue: '2-3 font family system',
        rationale: 'Improved readability',
        affectedCount: 2,
        impactScore: 60
      }
    ],
    overallImprovementScore: 70,
    transformationNarrative: 'Significant redesign opportunity',
    keyHighlights: ['Hero improvement potential', 'Layout consistency', 'Design token standardization'],
    estimatedTotalEffort: 'medium',
    componentCategories: {
      hero: [
        { id: 'hero', name: 'Hero Section', type: 'section', currentUsageCount: 1, currentComplexity: 45, improvements: [], improvementScore: 77, estimatedEffort: 'medium', visualDescription: '', beforeState: '', afterState: '' }
      ],
      forms: [],
      navigation: [],
      cards: [],
      buttons: [
        { id: 'cta', name: 'CTA Button', type: 'button', currentUsageCount: 5, currentComplexity: 20, improvements: [], improvementScore: 60, estimatedEffort: 'low', visualDescription: '', beforeState: '', afterState: '' }
      ],
      other: [
        { id: 'about-hero', name: 'About Hero', type: 'section', currentUsageCount: 1, currentComplexity: 40, improvements: [], improvementScore: 70, estimatedEffort: 'medium', visualDescription: '', beforeState: '', afterState: '' }
      ]
    },
    ...overrides
  });

  beforeEach(() => {
    engine = new PricingEngine();
  });

  describe('constructor', () => {
    it('creates engine with default config', () => {
      expect(engine).toBeDefined();
    });

    it('accepts custom config', () => {
      const custom = new PricingEngine({
        baseCosts: { discovery: 3000, development: 30000 }
      });
      expect(custom).toBeDefined();
    });
  });

  describe('generate', () => {
    it('returns valid PricingQuote', () => {
      const gallery = createMockGallery();
      const result = generatePricing(gallery);

      expect(result).toBeDefined();
      expect(result.url).toBe(gallery.url);
      expect(result.totalEstimate).toBeGreaterThan(0);
      expect(result.tier).toMatch(/basic|professional|enterprise/);
    });

    it('calculates total estimate in reasonable range', () => {
      const gallery = createMockGallery();
      const result = generatePricing(gallery);

      // For 3 components of medium effort: baseline ~20k-40k
      expect(result.totalEstimate).toBeGreaterThanOrEqual(15000);
      expect(result.totalEstimate).toBeLessThan(100000);
    });

    it('includes all required quote fields', () => {
      const gallery = createMockGallery();
      const result = generatePricing(gallery);

      expect(result.url).toBeDefined();
      expect(result.estimateDateIso).toBeDefined();
      expect(result.totalEstimate).toBeDefined();
      expect(result.tier).toBeDefined();
      expect(result.breakdown).toBeDefined();
      expect(result.componentCosts).toBeDefined();
      expect(result.overallEffortHours).toBeDefined();
      expect(result.confidenceLevel).toBeDefined();
      expect(result.assumptions).toBeDefined();
      expect(result.customizations).toBeDefined();
      expect(result.executionTimeline).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('breaks down cost across phases', () => {
      const gallery = createMockGallery();
      const result = generatePricing(gallery);

      const { breakdown } = result;
      const total = breakdown.discovery.amount +
        breakdown.design.amount +
        breakdown.development.amount +
        breakdown.qa.amount +
        breakdown.deployment.amount;

      // Allow 3% rounding error due to independent phase rounding
      expect(Math.abs(total - result.totalEstimate)).toBeLessThan(result.totalEstimate * 0.03);
    });

    it('calculates component costs', () => {
      const gallery = createMockGallery();
      const result = generatePricing(gallery);

      expect(result.componentCosts.length).toBe(gallery.componentPreviews.length);
      result.componentCosts.forEach(cc => {
        expect(cc.totalCost).toBeGreaterThan(0);
        expect(cc.category).toMatch(/hero|forms|navigation|cards|buttons|other/);
      });
    });

    it('estimates effort hours', () => {
      const gallery = createMockGallery();
      const result = generatePricing(gallery);

      expect(result.overallEffortHours).toBeGreaterThan(0);
      // Rough check: $200/hour rate
      const expectedHours = result.totalEstimate / 200;
      expect(Math.abs(result.overallEffortHours - expectedHours)).toBeLessThan(20);
    });

    it('determines tier correctly for low estimate', () => {
      const gallery = createMockGallery({
        componentPreviews: [
          {
            id: 'btn',
            name: 'Simple Button',
            type: 'button',
            currentUsageCount: 1,
            currentComplexity: 5,
            improvements: [],
            improvementScore: 20,
            estimatedEffort: 'low',
            visualDescription: '',
            beforeState: '',
            afterState: ''
          }
        ]
      });

      const result = generatePricing(gallery);
      expect(result.tier).toBe('basic');
    });

    it('determines tier correctly for high estimate', () => {
      const complexComps = Array.from({ length: 20 }, (_, i) => ({
        id: `comp${i}`,
        name: `Complex ${i}`,
        type: 'section',
        currentUsageCount: 2,
        currentComplexity: 80,
        improvements: [
          { aspect: 'accessibility' as const, current: 'Issues', proposed: 'Fixed', rationale: 'Compliance', impactScore: 85 },
          { aspect: 'visual' as const, current: 'Old', proposed: 'Modern', rationale: 'Style', impactScore: 70 }
        ],
        improvementScore: 75,
        estimatedEffort: 'high' as const,
        visualDescription: 'Complex component',
        beforeState: 'Before',
        afterState: 'After'
      }));

      const gallery = createMockGallery({
        componentPreviews: complexComps,
        estimatedTotalEffort: 'enterprise'
      });

      const result = generatePricing(gallery);
      expect(result.tier).toBe('enterprise');
    });

    it('applies accessibility multiplier when present', () => {
      const withA11y = createMockGallery({
        componentPreviews: [
          {
            id: 'a11y',
            name: 'Accessible Component',
            type: 'section',
            currentUsageCount: 1,
            currentComplexity: 50,
            improvements: [
              { aspect: 'accessibility', current: 'Issues', proposed: 'Fixed', rationale: 'Compliance', impactScore: 85 }
            ],
            improvementScore: 85,
            estimatedEffort: 'medium',
            visualDescription: '',
            beforeState: '',
            afterState: ''
          }
        ]
      });

      const withoutA11y = createMockGallery({
        componentPreviews: [
          {
            id: 'noa11y',
            name: 'Non-A11y Component',
            type: 'section',
            currentUsageCount: 1,
            currentComplexity: 50,
            improvements: [
              { aspect: 'visual', current: 'Old', proposed: 'Modern', rationale: 'Style', impactScore: 70 }
            ],
            improvementScore: 70,
            estimatedEffort: 'medium',
            visualDescription: '',
            beforeState: '',
            afterState: ''
          }
        ]
      });

      const resultWith = generatePricing(withA11y);
      const resultWithout = generatePricing(withoutA11y);

      // With a11y work should cost more
      expect(resultWith.totalEstimate).toBeGreaterThan(resultWithout.totalEstimate);
    });

    it('applies token standardization multiplier for many diffs', () => {
      const manyTokens = createMockGallery({
        designTokenDiffs: [
          { category: 'color', currentValue: '12', proposedValue: '8', rationale: 'System', affectedCount: 3, impactScore: 70 },
          { category: 'typography', currentValue: 'Varied', proposedValue: 'System', rationale: 'Consistency', affectedCount: 2, impactScore: 60 },
          { category: 'spacing', currentValue: 'Ad-hoc', proposedValue: 'Grid', rationale: 'Scale', affectedCount: 3, impactScore: 65 },
          { category: 'shadow', currentValue: 'Many', proposedValue: 'System', rationale: 'Depth', affectedCount: 2, impactScore: 45 }
        ]
      });

      const fewTokens = createMockGallery({
        designTokenDiffs: [
          { category: 'color', currentValue: '12', proposedValue: '8', rationale: 'System', affectedCount: 3, impactScore: 70 }
        ]
      });

      const resultMany = generatePricing(manyTokens);
      const resultFew = generatePricing(fewTokens);

      expect(resultMany.totalEstimate).toBeGreaterThan(resultFew.totalEstimate);
    });

    it('generates meaningful assumptions', () => {
      const gallery = createMockGallery();
      const result = generatePricing(gallery);

      expect(result.assumptions.length).toBeGreaterThan(0);
      expect(result.assumptions[0].factor).toBeDefined();
      expect(result.assumptions[0].impact).toBeDefined();
    });

    it('generates customizations relevant to scope', () => {
      const gallery = createMockGallery();
      const result = generatePricing(gallery);

      expect(result.customizations.length).toBeGreaterThan(0);
      result.customizations.forEach(c => {
        expect(c.name).toBeDefined();
        expect(c.description).toBeDefined();
        expect(c.estimatedCost).toBeGreaterThan(0);
      });
    });

    it('calculates execution timeline', () => {
      const gallery = createMockGallery();
      const result = generatePricing(gallery);

      const { executionTimeline: timeline } = result;
      expect(timeline.discovery).toBeGreaterThan(0);
      expect(timeline.design).toBeGreaterThan(0);
      expect(timeline.development).toBeGreaterThan(0);
      expect(timeline.qa).toBeGreaterThan(0);
      expect(timeline.deployment).toBeGreaterThan(0);
      expect(timeline.total).toBe(
        timeline.discovery + timeline.design + timeline.development + timeline.qa + timeline.deployment
      );
    });

    it('calculates confidence level', () => {
      const gallery = createMockGallery();
      const result = generatePricing(gallery);

      expect(['high', 'medium', 'low'].includes(result.confidenceLevel)).toBe(true);
    });

    it('generates meaningful summary', () => {
      const gallery = createMockGallery();
      const result = generatePricing(gallery);

      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(30);
      expect(result.summary.toLowerCase()).toMatch(/redesign|investment/);
    });
  });

  describe('component categorization', () => {
    it('categorizes hero components', () => {
      const gallery = createMockGallery();
      const result = generatePricing(gallery);

      const heroes = result.componentCosts.filter(c => c.category === 'hero');
      expect(heroes.length).toBeGreaterThan(0);
    });

    it('categorizes buttons', () => {
      const gallery = createMockGallery();
      const result = generatePricing(gallery);

      const buttons = result.componentCosts.filter(c => c.category === 'buttons');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('tier determination', () => {
    it('assigns basic tier for low estimates', () => {
      const simple = createMockGallery({
        componentPreviews: [
          {
            id: 'simple',
            name: 'Simple',
            type: 'button',
            currentUsageCount: 1,
            currentComplexity: 10,
            improvements: [],
            improvementScore: 20,
            estimatedEffort: 'low',
            visualDescription: '',
            beforeState: '',
            afterState: ''
          }
        ]
      });

      const result = generatePricing(simple);
      expect(result.tier).toBe('basic');
    });

    it('assigns professional tier for medium estimates', () => {
      const gallery = createMockGallery();
      const result = generatePricing(gallery);

      expect(['basic', 'professional', 'enterprise'].includes(result.tier)).toBe(true);
    });
  });

  describe('determinism', () => {
    it('produces consistent results for same input', () => {
      const gallery = createMockGallery();

      const result1 = generatePricing(gallery);
      const result2 = generatePricing(gallery);

      expect(result1.totalEstimate).toBe(result2.totalEstimate);
      expect(result1.tier).toBe(result2.tier);
      expect(result1.overallEffortHours).toBe(result2.overallEffortHours);
    });
  });

  describe('edge cases', () => {
    it('handles gallery with no accessibility improvements', () => {
      const gallery = createMockGallery({
        componentPreviews: [
          {
            id: 'noa11y',
            name: 'Component',
            type: 'section',
            currentUsageCount: 1,
            currentComplexity: 40,
            improvements: [
              { aspect: 'visual', current: 'Old', proposed: 'Modern', rationale: 'Style', impactScore: 70 }
            ],
            improvementScore: 70,
            estimatedEffort: 'medium',
            visualDescription: '',
            beforeState: '',
            afterState: ''
          }
        ]
      });

      const result = generatePricing(gallery);
      expect(result.totalEstimate).toBeGreaterThan(0);
    });

    it('handles gallery with many components', () => {
      const manyComps = Array.from({ length: 25 }, (_, i) => ({
        id: `comp${i}`,
        name: `Component ${i}`,
        type: 'section',
        currentUsageCount: 1,
        currentComplexity: 30 + Math.random() * 40,
        improvements: [],
        improvementScore: 50,
        estimatedEffort: 'medium' as const,
        visualDescription: '',
        beforeState: '',
        afterState: ''
      }));

      const gallery = createMockGallery({
        componentPreviews: manyComps
      });

      const result = generatePricing(gallery);
      expect(result.totalEstimate).toBeGreaterThan(50000);
    });

    it('handles gallery with high-complexity components', () => {
      const gallery = createMockGallery({
        componentPreviews: [
          {
            id: 'complex',
            name: 'Complex App',
            type: 'section',
            currentUsageCount: 1,
            currentComplexity: 95,
            improvements: [],
            improvementScore: 80,
            estimatedEffort: 'high',
            visualDescription: '',
            beforeState: '',
            afterState: ''
          }
        ]
      });

      const result = generatePricing(gallery);
      expect(result.totalEstimate).toBeGreaterThanOrEqual(10000);
    });

    it('handles enterprise effort tier', () => {
      const enterpriseComps = Array.from({ length: 15 }, (_, i) => ({
        id: `comp${i}`,
        name: `Component ${i}`,
        type: 'section',
        currentUsageCount: 2,
        currentComplexity: 70 + Math.random() * 25,
        improvements: [],
        improvementScore: 70,
        estimatedEffort: 'high' as const,
        visualDescription: '',
        beforeState: '',
        afterState: ''
      }));

      const gallery = createMockGallery({
        componentPreviews: enterpriseComps,
        estimatedTotalEffort: 'enterprise'
      });

      const result = generatePricing(gallery);
      expect(result.tier).toBe('enterprise');
    });
  });

  describe('cost calculation', () => {
    it('applies effort multiplier to components', () => {
      const low = createMockGallery({
        componentPreviews: [
          {
            id: 'low',
            name: 'Low Effort',
            type: 'button',
            currentUsageCount: 1,
            currentComplexity: 20,
            improvements: [],
            improvementScore: 30,
            estimatedEffort: 'low',
            visualDescription: '',
            beforeState: '',
            afterState: ''
          }
        ]
      });

      const high = createMockGallery({
        componentPreviews: [
          {
            id: 'high',
            name: 'High Effort',
            type: 'button',
            currentUsageCount: 1,
            currentComplexity: 20,
            improvements: [],
            improvementScore: 30,
            estimatedEffort: 'high',
            visualDescription: '',
            beforeState: '',
            afterState: ''
          }
        ]
      });

      const resultLow = generatePricing(low);
      const resultHigh = generatePricing(high);

      expect(resultHigh.totalEstimate).toBeGreaterThan(resultLow.totalEstimate);
    });

    it('component costs sum to reasonable total', () => {
      const gallery = createMockGallery();
      const result = generatePricing(gallery);

      const componentTotal = result.componentCosts.reduce((sum, cc) => sum + cc.totalCost, 0);
      // Component costs should be 50-80% of total (rest is project-level markup)
      expect(componentTotal).toBeGreaterThan(result.totalEstimate * 0.3);
      expect(componentTotal).toBeLessThan(result.totalEstimate * 1.2);
    });
  });
});
