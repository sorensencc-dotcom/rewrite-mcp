import { describe, it, expect } from 'vitest';
import { meeFindingAssessor } from './index.js';
const mockFinding = (o = {}) => ({ id: 'f1', type: 'optimization', title: 'Test', description: 'Test', confidence: 0.7, impact: 0.8, ...o });

describe('MEE Finding Assessor (45.4)', () => {
  it('should validate findings', async () => {
    const r = await meeFindingAssessor({});
    expect(r.success).toBe(false);
  });

  it('should assess single finding', async () => {
    const r = await meeFindingAssessor({ findings: [mockFinding()] });
    expect(r.success).toBe(true);
    expect(r.findings.length).toBe(1);
    expect(r.findings[0].assessment.finalScore).toBeGreaterThan(0);
  });

  it('should sort by score', async () => {
    const r = await meeFindingAssessor({
      findings: [
        mockFinding({ id: 'h', confidence: 0.9, impact: 0.9 }),
        mockFinding({ id: 'l', confidence: 0.2, impact: 0.2 })
      ]
    });
    expect(r.success).toBe(true);
    expect(r.findings[0].assessment.finalScore).toBeGreaterThanOrEqual(r.findings[1].assessment.finalScore);
  });

  it('should limit results', async () => {
    const r = await meeFindingAssessor({
      findings: Array(15).fill(null).map((_, i) => mockFinding({ id: `f${i}` })),
      returnTopN: 5
    });
    expect(r.findings.length).toBe(5);
  });

  it('should generate recommendations', async () => {
    const r = await meeFindingAssessor({ findings: [mockFinding({ confidence: 0.95, impact: 0.95 })] });
    expect(r.findings[0].assessment.recommendation).toBe('approve');
  });

  it('should include timing', async () => {
    const r = await meeFindingAssessor({ findings: [mockFinding()] });
    expect(r.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});
