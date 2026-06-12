import { LeadScoringEngine, scoreIRPacket } from './score.js';
import type { ScoringInput, LeadScoreResult } from '../schemas/lead-score.types.js';
import type { IRPacket } from '../schemas/ir.types.js';

describe('LeadScoringEngine', () => {
  let engine: LeadScoringEngine;

  beforeEach(() => {
    engine = new LeadScoringEngine();
  });

  describe('constructor', () => {
    it('creates engine with default weights', () => {
      expect(engine).toBeDefined();
    });

    it('throws error if weights do not sum to 1.0', () => {
      expect(
        () =>
          new LeadScoringEngine({
            weights: { complexity: 0.5, audit: 0.3, accessibility: 0.1, competitive: 0.05 }
          })
      ).toThrow('Weights must sum to 1.0');
    });

    it('accepts custom valid weights', () => {
      const custom = new LeadScoringEngine({
        weights: { complexity: 0.4, audit: 0.3, accessibility: 0.2, competitive: 0.1 }
      });
      expect(custom).toBeDefined();
    });
  });

  describe('score', () => {
    it('returns valid LeadScoreResult for high-complexity input', () => {
      const input: ScoringInput = {
        complexity: { score: 80, factors: { componentDiversity: 50, routeDepth: 20, assetCount: 200, stateVariations: 100 } },
        audit: { issues: [], severity: 'low', total: 5 },
        accessibility: { wcagLevel: 'AA', issues: [], passedTests: 35, failedTests: 5, score: 87 }
      };

      const result = engine.score(input);

      expect(result.score).toBeGreaterThan(60);
      expect(['A', 'B'].includes(result.tier as any)).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('returns low tier for low-scoring input', () => {
      const input: ScoringInput = {
        complexity: { score: 10, factors: { componentDiversity: 5, routeDepth: 2, assetCount: 10, stateVariations: 0 } },
        audit: { issues: [], severity: 'low', total: 0 },
        accessibility: { wcagLevel: 'AAA', issues: [], passedTests: 50, failedTests: 0, score: 100 }
      };

      const result = engine.score(input);

      expect(['C', 'D'].includes(result.tier as any)).toBe(true);
      expect(result.salesReady).toBe(false);
    });

    it('weights complexity factor correctly', () => {
      const highComplexity: ScoringInput = {
        complexity: { score: 95, factors: { componentDiversity: 100, routeDepth: 50, assetCount: 500, stateVariations: 200 } },
        audit: { issues: [], severity: 'low', total: 0 },
        accessibility: { wcagLevel: 'AAA', issues: [], passedTests: 50, failedTests: 0, score: 100 }
      };

      const result = engine.score(highComplexity);

      expect(result.factors.complexity.contribution).toBeGreaterThan(25);
    });

    it('weights audit factor correctly', () => {
      const manyIssues: ScoringInput = {
        complexity: { score: 50, factors: { componentDiversity: 20, routeDepth: 10, assetCount: 100, stateVariations: 50 } },
        audit: { issues: [], severity: 'critical', total: 40 },
        accessibility: { wcagLevel: 'AA', issues: [], passedTests: 30, failedTests: 20, score: 60 }
      };

      const result = engine.score(manyIssues);

      expect(result.factors.audit.value).toBeLessThan(50);
    });

    it('includes competitive factor when provided', () => {
      const input: ScoringInput = {
        complexity: { score: 60, factors: { componentDiversity: 25, routeDepth: 15, assetCount: 150, stateVariations: 75 } },
        audit: { issues: [], severity: 'medium', total: 15 },
        accessibility: { wcagLevel: 'A', issues: [], passedTests: 25, failedTests: 25, score: 50 },
        competitive: [
          { category: 'performance', severity: 'high', description: 'Slower page load', impact: 'UX', competitorExample: 'competitor.com' },
          { category: 'design', severity: 'medium', description: 'Outdated visual style', impact: 'brand perception', competitorExample: 'other.com' }
        ]
      };

      const result = engine.score(input);

      expect(result.factors.competitive).toBeDefined();
      expect(result.factors.competitive?.value).toBeGreaterThan(0);
    });

    it('generates meaningful insights for high-complexity scenario', () => {
      const input: ScoringInput = {
        complexity: { score: 85, factors: { componentDiversity: 60, routeDepth: 40, assetCount: 300, stateVariations: 150 } },
        audit: { issues: [], severity: 'high', total: 30 },
        accessibility: { wcagLevel: 'A', issues: [], passedTests: 20, failedTests: 30, score: 40 }
      };

      const result = engine.score(input);

      expect(result.insights.length).toBeGreaterThan(0);
      expect(typeof result.insights[0]).toBe('string');
    });

    it('generates recommendations based on tier', () => {
      const tierA: ScoringInput = {
        complexity: { score: 90, factors: { componentDiversity: 70, routeDepth: 40, assetCount: 400, stateVariations: 200 } },
        audit: { issues: [], severity: 'low', total: 5 },
        accessibility: { wcagLevel: 'AA', issues: [], passedTests: 40, failedTests: 10, score: 80 }
      };

      const result = engine.score(tierA);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(typeof result.recommendations[0]).toBe('string');
    });

    it('correctly estimates complexity level', () => {
      const scenarios = [
        { score: 10, expected: 'low' as const },
        { score: 30, expected: 'medium' as const },
        { score: 60, expected: 'high' as const },
        { score: 85, expected: 'enterprise' as const }
      ];

      for (const scenario of scenarios) {
        const input: ScoringInput = {
          complexity: { score: scenario.score, factors: { componentDiversity: 10, routeDepth: 5, assetCount: 50, stateVariations: 20 } },
          audit: { issues: [], severity: 'low', total: 0 },
          accessibility: { wcagLevel: 'AAA', issues: [], passedTests: 50, failedTests: 0, score: 100 }
        };

        const result = engine.score(input);

        expect(result.estimatedComplexity).toBe(scenario.expected);
      }
    });

    it('includes next steps based on tier', () => {
      const input: ScoringInput = {
        complexity: { score: 88, factors: { componentDiversity: 65, routeDepth: 35, assetCount: 350, stateVariations: 175 } },
        audit: { issues: [], severity: 'medium', total: 10 },
        accessibility: { wcagLevel: 'AA', issues: [], passedTests: 38, failedTests: 12, score: 76 }
      };

      const result = engine.score(input);

      expect(result.nextSteps).toBeDefined();
      expect(result.nextSteps.length).toBeGreaterThan(0);
      expect(result.nextSteps[0]).toMatch(/^\d+\./);
    });

    it('scores in 0-100 range', () => {
      const inputs = [
        { complexity: 5, audit: 0, accessibility: 20 },
        { complexity: 50, audit: 30, accessibility: 50 },
        { complexity: 100, audit: 80, accessibility: 90 }
      ];

      for (const { complexity, audit, accessibility } of inputs) {
        const input: ScoringInput = {
          complexity: { score: complexity, factors: { componentDiversity: 10, routeDepth: 5, assetCount: 50, stateVariations: 20 } },
          audit: { issues: [], severity: 'low', total: audit },
          accessibility: { wcagLevel: 'AA', issues: [], passedTests: 50 - (accessibility / 2), failedTests: accessibility / 2, score: accessibility }
        };

        const result = engine.score(input);

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('tier determination', () => {
    it('assigns valid tier for high scores', () => {
      const input: ScoringInput = {
        complexity: { score: 85, factors: { componentDiversity: 50, routeDepth: 25, assetCount: 250, stateVariations: 125 } },
        audit: { issues: [], severity: 'low', total: 3 },
        accessibility: { wcagLevel: 'AA', issues: [], passedTests: 45, failedTests: 5, score: 90 }
      };

      const result = engine.score(input);

      expect(['A', 'B'].includes(result.tier as any)).toBe(true);
    });

    it('assigns valid tier for medium-high scores', () => {
      const input: ScoringInput = {
        complexity: { score: 65, factors: { componentDiversity: 30, routeDepth: 15, assetCount: 150, stateVariations: 75 } },
        audit: { issues: [], severity: 'medium', total: 20 },
        accessibility: { wcagLevel: 'A', issues: [], passedTests: 30, failedTests: 20, score: 60 }
      };

      const result = engine.score(input);

      expect(['A', 'B', 'C'].includes(result.tier as any)).toBe(true);
    });

    it('assigns valid tier for medium scores', () => {
      const input: ScoringInput = {
        complexity: { score: 45, factors: { componentDiversity: 15, routeDepth: 8, assetCount: 80, stateVariations: 40 } },
        audit: { issues: [], severity: 'medium', total: 25 },
        accessibility: { wcagLevel: 'A', issues: [], passedTests: 25, failedTests: 25, score: 50 }
      };

      const result = engine.score(input);

      expect(['B', 'C', 'D'].includes(result.tier as any)).toBe(true);
    });

    it('assigns low tier for low scores', () => {
      const input: ScoringInput = {
        complexity: { score: 15, factors: { componentDiversity: 5, routeDepth: 2, assetCount: 20, stateVariations: 10 } },
        audit: { issues: [], severity: 'low', total: 2 },
        accessibility: { wcagLevel: 'AAA', issues: [], passedTests: 48, failedTests: 2, score: 96 }
      };

      const result = engine.score(input);

      expect(['C', 'D'].includes(result.tier as any)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles zero complexity', () => {
      const input: ScoringInput = {
        complexity: { score: 0, factors: { componentDiversity: 0, routeDepth: 0, assetCount: 0, stateVariations: 0 } },
        audit: { issues: [], severity: 'low', total: 0 },
        accessibility: { wcagLevel: 'AAA', issues: [], passedTests: 50, failedTests: 0, score: 100 }
      };

      const result = engine.score(input);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('handles maximum complexity', () => {
      const input: ScoringInput = {
        complexity: { score: 200, factors: { componentDiversity: 500, routeDepth: 100, assetCount: 5000, stateVariations: 1000 } },
        audit: { issues: [], severity: 'critical', total: 100 },
        accessibility: { wcagLevel: 'A', issues: [], passedTests: 0, failedTests: 50, score: 0 }
      };

      const result = engine.score(input);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('handles empty audit issues list', () => {
      const input: ScoringInput = {
        complexity: { score: 50, factors: { componentDiversity: 20, routeDepth: 10, assetCount: 100, stateVariations: 50 } },
        audit: { issues: [], severity: 'low', total: 0 },
        accessibility: { wcagLevel: 'AA', issues: [], passedTests: 40, failedTests: 10, score: 80 }
      };

      const result = engine.score(input);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThan(60);
    });

    it('handles empty competitive gaps', () => {
      const input: ScoringInput = {
        complexity: { score: 60, factors: { componentDiversity: 25, routeDepth: 12, assetCount: 120, stateVariations: 60 } },
        audit: { issues: [], severity: 'low', total: 5 },
        accessibility: { wcagLevel: 'AA', issues: [], passedTests: 42, failedTests: 8, score: 84 },
        competitive: []
      };

      const result = engine.score(input);

      expect(result).toBeDefined();
    });
  });
});

describe('scoreIRPacket', () => {
  it('scores a complete IR packet', () => {
    const ir: IRPacket = {
      version: '1.0.0',
      meta: {
        url: 'https://example.com',
        captureDate: new Date().toISOString(),
        toolVersion: '1.0.0'
      },
      designTokens: {
        colors: { primary: '#0066cc', secondary: '#ff6600' },
        spacing: { sm: '4px', md: '8px', lg: '16px' }
      },
      routes: [
        { path: '/', title: 'Home', componentIds: ['hero', 'cta'], assetCount: 10, complexity: 45 },
        { path: '/about', title: 'About', componentIds: ['about-hero', 'team-grid'], assetCount: 8, complexity: 35 }
      ],
      components: [
        { id: 'hero', name: 'Hero', type: 'section', usageCount: 1, states: ['default', 'mobile'], complexity: 50 },
        { id: 'cta', name: 'CTA Button', type: 'button', usageCount: 5, complexity: 20 }
      ],
      assets: { images: 15, videos: 2, svgs: 8, total: 25 },
      metrics: {
        totalComponentCount: 2,
        totalRouteCount: 2,
        averageComplexity: 40,
        accessibility: { wcagIssues: 5, severity: 'medium' }
      }
    };

    const result = scoreIRPacket(ir);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.tier).toMatch(/^[A-D]$/);
  });

  it('applies custom config to IR packet scoring', () => {
    const ir: IRPacket = {
      version: '1.0.0',
      meta: {
        url: 'https://example.com',
        captureDate: new Date().toISOString(),
        toolVersion: '1.0.0'
      },
      designTokens: {},
      routes: [{ path: '/', componentIds: ['a', 'b'], assetCount: 5 }],
      components: [
        { id: 'a', name: 'A', type: 'section', usageCount: 1, complexity: 30 },
        { id: 'b', name: 'B', type: 'button', usageCount: 2, complexity: 20 }
      ],
      assets: { images: 5, videos: 0, svgs: 2, total: 7 }
    };

    const result = scoreIRPacket(ir, {
      weights: { complexity: 0.5, audit: 0.25, accessibility: 0.15, competitive: 0.1 }
    });

    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
