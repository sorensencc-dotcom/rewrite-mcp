import { LeadScoringEngine, scoreIRPacket } from '../lead-scorer/index.js';
import { validateScoringInput, validateLeadScoreResult } from '../validators/index.js';
import type { IRPacket } from '../schemas/ir.types.js';
import type { ScoringInput } from '../schemas/lead-score.types.js';

describe('Integration Tests', () => {
  describe('Scoring pipeline with validation', () => {
    it('validates output of scoring engine', () => {
      const input: ScoringInput = {
        complexity: { score: 65, factors: { componentDiversity: 30, routeDepth: 15, assetCount: 150, stateVariations: 75 } },
        audit: { issues: [], severity: 'medium', total: 15 },
        accessibility: { wcagLevel: 'AA', issues: [], passedTests: 35, failedTests: 15, score: 70 }
      };

      const engine = new LeadScoringEngine();
      const result = engine.score(input);

      expect(validateLeadScoreResult(result)).toBe(true);
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('tier');
      expect(result).toHaveProperty('factors');
    });

    it('produces consistent deterministic scores', () => {
      const input: ScoringInput = {
        complexity: { score: 60, factors: { componentDiversity: 25, routeDepth: 12, assetCount: 120, stateVariations: 60 } },
        audit: { issues: [], severity: 'medium', total: 15 },
        accessibility: { wcagLevel: 'AA', issues: [], passedTests: 35, failedTests: 15, score: 70 }
      };

      const engine = new LeadScoringEngine();
      const result1 = engine.score(input);
      const result2 = engine.score(input);

      expect(result1.score).toBe(result2.score);
      expect(result1.tier).toBe(result2.tier);
    });

    it('scores IR packet end-to-end', () => {
      const ir: IRPacket = {
        version: '1.0.0',
        meta: {
          url: 'https://example.com',
          captureDate: new Date().toISOString(),
          toolVersion: '1.0.0'
        },
        designTokens: { colors: { primary: '#0066cc' } },
        routes: [
          { path: '/', componentIds: ['hero', 'cta'], assetCount: 15, complexity: 50 }
        ],
        components: [
          { id: 'hero', name: 'Hero', type: 'section', usageCount: 1, complexity: 50 },
          { id: 'cta', name: 'CTA', type: 'button', usageCount: 2, complexity: 20 }
        ],
        assets: { images: 10, videos: 2, svgs: 3, total: 15 },
        metrics: {
          totalComponentCount: 2,
          totalRouteCount: 1,
          averageComplexity: 40,
          accessibility: { wcagIssues: 5, severity: 'medium' }
        }
      };

      const result = scoreIRPacket(ir);

      expect(validateLeadScoreResult(result)).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D'].includes(result.tier as any)).toBe(true);
    });
  });

  describe('Custom configuration', () => {
    it('applies custom weights', () => {
      const input: ScoringInput = {
        complexity: { score: 100, factors: { componentDiversity: 100, routeDepth: 50, assetCount: 500, stateVariations: 200 } },
        audit: { issues: [], severity: 'low', total: 0 },
        accessibility: { wcagLevel: 'AAA', issues: [], passedTests: 50, failedTests: 0, score: 100 }
      };

      const highComplexity = new LeadScoringEngine({
        weights: { complexity: 0.7, audit: 0.15, accessibility: 0.1, competitive: 0.05 }
      });
      const balanced = new LeadScoringEngine({
        weights: { complexity: 0.25, audit: 0.25, accessibility: 0.25, competitive: 0.25 }
      });

      const score1 = highComplexity.score(input).score;
      const score2 = balanced.score(input).score;

      expect(score1).toBeGreaterThan(score2);
    });

    it('applies custom thresholds', () => {
      const input: ScoringInput = {
        complexity: { score: 60, factors: { componentDiversity: 25, routeDepth: 12, assetCount: 120, stateVariations: 60 } },
        audit: { issues: [], severity: 'low', total: 5 },
        accessibility: { wcagLevel: 'AA', issues: [], passedTests: 42, failedTests: 8, score: 84 }
      };

      const strict = new LeadScoringEngine({
        thresholds: { A: 90, B: 75, C: 60, D: 0 }
      });
      const lenient = new LeadScoringEngine({
        thresholds: { A: 50, B: 30, C: 10, D: 0 }
      });

      const result1 = strict.score(input);
      const result2 = lenient.score(input);

      expect(result1.tier).not.toBe(result2.tier);
    });
  });
});
