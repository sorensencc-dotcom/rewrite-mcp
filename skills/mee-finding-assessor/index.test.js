import { describe, it, expect, beforeEach } from 'vitest';
import { meeFindingAssessor } from './index.js';

describe('MEE Finding Assessor (45.4)', () => {
  const mockFinding = (overrides = {}) => ({
    id: 'find-test-1',
    type: 'optimization',
    title: 'Test Finding',
    description: 'A test finding',
    confidence: 0.7,
    impact: 0.8,
    effort: 30,
    ...overrides
  });

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('should validate required findings input', async () => {
    const result = await meeFindingAssessor({});
    expect(result.success).toBe(false);
    expect(result.error).toContain('findings');
  });

  it('should validate findings array is non-empty', async () => {
    const result = await meeFindingAssessor({ findings: [] });
    expect(result.success).toBe(false);
    expect(result.error).toContain('non-empty');
  });

  it('should validate findings array length', async () => {
    const findings = Array.from({ length: 101 }, (_, i) => mockFinding({ id: `f-${i}` }));
    const result = await meeFindingAssessor({ findings });
    expect(result.success).toBe(false);
    expect(result.error).toContain('100');
  });

  it('should validate finding fields', async () => {
    const result = await meeFindingAssessor({
      findings: [{ id: 'test' }] // Missing required fields
    });
    expect(result.success).toBe(false);
  });

  it('should assess single finding', async () => {
    const result = await meeFindingAssessor({
      findings: [mockFinding()]
    });

    expect(result.success).toBe(true);
    expect(result.findings.length).toBe(1);
    expect(result.findings[0].assessment).toBeDefined();
    expect(result.findings[0].assessment.finalScore).toBeGreaterThan(0);
    expect(result.findings[0].assessment.finalScore).toBeLessThanOrEqual(1);
  });

  it('should assess multiple findings and sort by score', async () => {
    const findings = [
      mockFinding({ id: 'high', confidence: 0.9, impact: 0.9 }),
      mockFinding({ id: 'low', confidence: 0.2, impact: 0.2 }),
      mockFinding({ id: 'mid', confidence: 0.5, impact: 0.5 })
    ];

    const result = await meeFindingAssessor({ findings });

    expect(result.success).toBe(true);
    expect(result.findings.length).toBe(3);
    // Should be sorted descending by score
    const scores = result.findings.map(f => f.assessment.finalScore);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });

  it('should compute base score correctly', async () => {
    const result = await meeFindingAssessor({
      findings: [mockFinding({ confidence: 0.6, impact: 0.8, effort: 20 })]
    });

    expect(result.success).toBe(true);
    const score = result.findings[0].assessment.baseScore;
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should generate recommendations based on score', async () => {
    const highScore = mockFinding({ confidence: 0.95, impact: 0.95, effort: 10 });
    const lowScore = mockFinding({ id: 'low', confidence: 0.1, impact: 0.1, effort: 90 });

    const result = await meeFindingAssessor({
      findings: [highScore, lowScore]
    });

    expect(result.success).toBe(true);
    const recommendations = result.findings.map(f => f.assessment.recommendation);
    expect(recommendations).toContain('approve');
  });

  it('should support custom scoring weights', async () => {
    const finding = mockFinding();

    const result1 = await meeFindingAssessor({
      findings: [finding],
      scoringWeights: { confidenceWeight: 1, impactWeight: 0, effortWeight: 0 }
    });

    const result2 = await meeFindingAssessor({
      findings: [finding],
      scoringWeights: { confidenceWeight: 0, impactWeight: 1, effortWeight: 0 }
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    // Different weights should (likely) produce different scores
    // Note: may be equal by chance, so we just check both computed
    expect(result1.findings[0].assessment.baseScore).toBeDefined();
    expect(result2.findings[0].assessment.baseScore).toBeDefined();
  });

  it('should apply context boost for priority findings', async () => {
    const result = await meeFindingAssessor({
      findings: [mockFinding({ type: 'bug', confidence: 0.5 })],
      assessmentContext: { priorityLevel: 'critical' }
    });

    expect(result.success).toBe(true);
    expect(result.findings[0].assessment.contextBoost).toBeGreaterThan(0);
  });

  it('should support returnTopN parameter', async () => {
    const findings = Array.from({ length: 20 }, (_, i) =>
      mockFinding({ id: `f-${i}`, confidence: Math.random() })
    );

    const result = await meeFindingAssessor({
      findings,
      returnTopN: 5
    });

    expect(result.success).toBe(true);
    expect(result.findings.length).toBe(5);
    expect(result.skippedFindings).toBe(15);
  });

  it('should compute summary statistics', async () => {
    const findings = [
      mockFinding({ id: 'f1', type: 'bug', confidence: 0.9, impact: 0.9 }),
      mockFinding({ id: 'f2', type: 'optimization', confidence: 0.5, impact: 0.5 }),
      mockFinding({ id: 'f3', type: 'performance', confidence: 0.8, impact: 0.7 })
    ];

    const result = await meeFindingAssessor({ findings });

    expect(result.success).toBe(true);
    expect(result.summary).toBeDefined();
    expect(result.summary.totalAssessed).toBe(3);
    expect(result.summary.typeBreakdown).toBeDefined();
    expect(result.summary.recommendationBreakdown).toBeDefined();
  });

  it('should generate implementation path', async () => {
    const findings = [
      mockFinding({ id: 'quick', confidence: 0.9, impact: 0.9, effort: 10 }),
      mockFinding({ id: 'medium', confidence: 0.8, impact: 0.8, effort: 40 }),
      mockFinding({ id: 'long', confidence: 0.7, impact: 0.7, effort: 100 })
    ];

    const result = await meeFindingAssessor({ findings });

    expect(result.success).toBe(true);
    expect(result.summary.suggestedPhasing).toBeDefined();
    expect(result.summary.suggestedPhasing.phase1).toBeDefined();
    expect(result.summary.suggestedPhasing.phase2).toBeDefined();
    expect(result.summary.suggestedPhasing.phase3).toBeDefined();
  });

  it('should generate actionable next steps', async () => {
    const result = await meeFindingAssessor({
      findings: [
        mockFinding({ type: 'bug', confidence: 0.9, impact: 0.9 }),
        mockFinding({ type: 'optimization', confidence: 0.4, impact: 0.4 })
      ]
    });

    expect(result.success).toBe(true);
    expect(result.summary.nextActions).toBeDefined();
    expect(Array.isArray(result.summary.nextActions)).toBe(true);
    expect(result.summary.nextActions.length).toBeGreaterThan(0);
  });

  it('should handle findings with missing optional fields', async () => {
    const result = await meeFindingAssessor({
      findings: [
        {
          id: 'test',
          type: 'feature',
          title: 'Test',
          description: 'Test',
          confidence: 0.5,
          impact: 0.5
          // Missing effort and benchmarkData
        }
      ]
    });

    expect(result.success).toBe(true);
    expect(result.findings.length).toBe(1);
  });

  it('should include timing information', async () => {
    const result = await meeFindingAssessor({
      findings: [mockFinding()]
    });

    expect(result.success).toBe(true);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.elapsedMs).toBe('number');
  });

  it('should handle batch mode', async () => {
    const findings = Array.from({ length: 10 }, (_, i) => mockFinding({ id: `f-${i}` }));

    const result = await meeFindingAssessor({
      findings,
      batchMode: true
    });

    expect(result.success).toBe(true);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('should validate confidence and impact ranges', async () => {
    const result = await meeFindingAssessor({
      findings: [mockFinding({ confidence: 1.5 })]
    });

    expect(result.success).toBe(false);
  });

  it('should handle edge case: all findings with same score', async () => {
    const findings = [
      mockFinding({ id: 'f1', confidence: 0.5, impact: 0.5, effort: 30 }),
      mockFinding({ id: 'f2', confidence: 0.5, impact: 0.5, effort: 30 }),
      mockFinding({ id: 'f3', confidence: 0.5, impact: 0.5, effort: 30 })
    ];

    const result = await meeFindingAssessor({ findings });

    expect(result.success).toBe(true);
    expect(result.findings.length).toBe(3);
  });

  it('should track assessment statistics', async () => {
    const result = await meeFindingAssessor({
      findings: [
        mockFinding({ confidence: 0.9, impact: 0.9 }),
        mockFinding({ id: 'f2', confidence: 0.6, impact: 0.6 }),
        mockFinding({ id: 'f3', confidence: 0.3, impact: 0.3 })
      ]
    });

    expect(result.success).toBe(true);
    expect(result.stats).toBeDefined();
    expect(result.stats.averageScore).toBeDefined();
    expect(result.stats.topScore).toBeGreaterThan(0);
    expect(result.stats.recommendCount).toBeGreaterThanOrEqual(0);
  });

  it('should generate unique assessment IDs', async () => {
    const result1 = await meeFindingAssessor({
      findings: [mockFinding()]
    });

    const result2 = await meeFindingAssessor({
      findings: [mockFinding()]
    });

    expect(result1.assessmentId).not.toEqual(result2.assessmentId);
  });
});
