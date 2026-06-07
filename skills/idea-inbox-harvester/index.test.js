import { describe, it, expect, beforeEach } from 'vitest';
import { ideaInboxHarvester } from './index.js';

describe('Idea Inbox Harvester (45.6)', () => {
  const mockFinding = (overrides = {}) => ({
    id: 'find-test-1',
    title: 'Test Finding',
    type: 'optimization',
    description: 'A test finding',
    assessment: {
      finalScore: 0.75,
      recommendation: 'approve'
    },
    ...overrides
  });

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('should validate required findings input', async () => {
    const result = await ideaInboxHarvester({});
    expect(result.success).toBe(false);
    expect(result.error).toContain('findings');
  });

  it('should validate findings array', async () => {
    const result = await ideaInboxHarvester({
      findings: 'not-an-array'
    });
    expect(result.success).toBe(false);
  });

  it('should handle empty findings array', async () => {
    const result = await ideaInboxHarvester({
      findings: []
    });
    expect(result.success).toBe(true);
    expect(result.ideas.length).toBe(0);
  });

  it('should harvest single finding into idea', async () => {
    const result = await ideaInboxHarvester({
      findings: [mockFinding()]
    });

    expect(result.success).toBe(true);
    expect(result.ideas.length).toBe(1);
    expect(result.ideas[0].title).toBe('Test Finding');
    expect(result.ideas[0].metadata).toBeDefined();
  });

  it('should prioritize findings by score', async () => {
    const findings = [
      mockFinding({ id: 'f1', title: 'Low score finding', assessment: { finalScore: 0.5, recommendation: 'review' } }),
      mockFinding({ id: 'f2', title: 'High score finding', assessment: { finalScore: 0.9, recommendation: 'approve' } }),
      mockFinding({ id: 'f3', title: 'Medium score finding', assessment: { finalScore: 0.7, recommendation: 'review' } })
    ];

    const result = await ideaInboxHarvester({
      findings,
      priorityThreshold: 0.6,
      deduplicateMode: 'off'
    });

    expect(result.success).toBe(true);
    expect(result.stats.inboxCount).toBe(2);
    expect(result.stats.archiveCount).toBe(1);
  });

  it('should support exact deduplication', async () => {
    const findings = [
      mockFinding({ id: 'f1', title: 'Cache optimization' }),
      mockFinding({ id: 'f2', title: 'Cache optimization' }),
      mockFinding({ id: 'f3', title: 'Database indexing' })
    ];

    const result = await ideaInboxHarvester({
      findings,
      deduplicateMode: 'exact'
    });

    expect(result.success).toBe(true);
    expect(result.stats.deduplication.deduplicated).toBeLessThan(3);
  });

  it('should support semantic deduplication', async () => {
    const findings = [
      mockFinding({ id: 'f1', title: 'Cache optimization strategy', type: 'optimization' }),
      mockFinding({ id: 'f2', title: 'Cache optimization for performance', type: 'optimization' }),
      mockFinding({ id: 'f3', title: 'Memory allocation issue', type: 'bug' })
    ];

    const result = await ideaInboxHarvester({
      findings,
      deduplicateMode: 'semantic'
    });

    expect(result.success).toBe(true);
    expect(result.stats.deduplication.removed).toBeGreaterThanOrEqual(0);
  });

  it('should disable deduplication with off mode', async () => {
    const findings = [
      mockFinding({ id: 'f1', title: 'Same title' }),
      mockFinding({ id: 'f2', title: 'Same title' })
    ];

    const result = await ideaInboxHarvester({
      findings,
      deduplicateMode: 'off'
    });

    expect(result.success).toBe(true);
    expect(result.stats.deduplication.deduplicated).toBe(2);
  });

  it('should store ideas in CKG', async () => {
    const result = await ideaInboxHarvester({
      findings: [mockFinding()],
      storeInCKG: true
    });

    expect(result.success).toBe(true);
    expect(result.stats.ckgStorage).toBeDefined();
    expect(result.stats.ckgStorage.stored).toBeGreaterThanOrEqual(0);
  });

  it('should generate dashboard when requested', async () => {
    const findings = [
      mockFinding({ type: 'bug', assessment: { finalScore: 0.9, recommendation: 'approve' } }),
      mockFinding({ id: 'f2', type: 'optimization', assessment: { finalScore: 0.6, recommendation: 'review' } })
    ];

    const result = await ideaInboxHarvester({
      findings,
      generateDashboard: true
    });

    expect(result.success).toBe(true);
    expect(result.dashboard).toBeDefined();
    expect(result.dashboard.typeBreakdown).toBeDefined();
    expect(result.dashboard.insights).toBeDefined();
  });

  it('should enrich ideas with metadata', async () => {
    const result = await ideaInboxHarvester({
      findings: [mockFinding()],
      context: {
        source: 'phase-45',
        executionId: 'exec-123',
        tags: ['critical', 'urgent']
      }
    });

    expect(result.success).toBe(true);
    const idea = result.ideas[0];
    expect(idea.metadata.source).toBe('phase-45');
    expect(idea.metadata.executionId).toBe('exec-123');
    expect(idea.metadata.tags).toContain('critical');
  });

  it('should track deduplication statistics', async () => {
    const findings = [
      mockFinding({ id: 'f1' }),
      mockFinding({ id: 'f2', title: 'Duplicate' }),
      mockFinding({ id: 'f3', title: 'Duplicate' })
    ];

    const result = await ideaInboxHarvester({
      findings,
      deduplicateMode: 'semantic'
    });

    expect(result.success).toBe(true);
    expect(result.stats.deduplication.original).toBe(3);
    expect(result.stats.deduplication.deduplicated).toBeGreaterThan(0);
    expect(result.stats.deduplication.removed).toBeGreaterThanOrEqual(0);
  });

  it('should handle findings without assessment', async () => {
    const result = await ideaInboxHarvester({
      findings: [
        {
          id: 'f1',
          title: 'Unassessed finding',
          type: 'feature'
        }
      ],
      priorityThreshold: 0,  // Include ideas with score 0
      deduplicateMode: 'off'
    });

    expect(result.success).toBe(true);
    expect(result.stats.totalProcessed).toBe(1);
  });

  it('should validate priority threshold range', async () => {
    const result = await ideaInboxHarvester({
      findings: [mockFinding()],
      priorityThreshold: 1.5
    });

    expect(result.success).toBe(false);
  });

  it('should generate harvest ID', async () => {
    const result = await ideaInboxHarvester({
      findings: [mockFinding()]
    });

    expect(result.success).toBe(true);
    expect(result.harvestId).toBeDefined();
    expect(result.harvestId).toMatch(/^harvest-/);
  });

  it('should include timing information', async () => {
    const result = await ideaInboxHarvester({
      findings: [mockFinding()]
    });

    expect(result.success).toBe(true);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('should handle multiple ideas with type breakdown', async () => {
    const findings = [
      mockFinding({ id: 'f1', title: 'Bug fix 1', type: 'bug' }),
      mockFinding({ id: 'f2', title: 'Bug fix 2', type: 'bug' }),
      mockFinding({ id: 'f3', title: 'Optimization idea', type: 'optimization' }),
      mockFinding({ id: 'f4', title: 'Feature request', type: 'feature' })
    ];

    const result = await ideaInboxHarvester({
      findings,
      generateDashboard: true,
      deduplicateMode: 'off'
    });

    expect(result.success).toBe(true);
    expect(result.dashboard.typeBreakdown.bug).toBe(2);
    expect(result.dashboard.typeBreakdown.optimization).toBe(1);
  });

  it('should generate insights in dashboard', async () => {
    const findings = Array.from({ length: 5 }, (_, i) =>
      mockFinding({ id: `f-${i}`, assessment: { finalScore: 0.8, recommendation: 'approve' } })
    );

    const result = await ideaInboxHarvester({
      findings,
      generateDashboard: true
    });

    expect(result.success).toBe(true);
    expect(result.dashboard.insights).toBeDefined();
    expect(Array.isArray(result.dashboard.insights)).toBe(true);
  });

  it('should generate next steps in dashboard', async () => {
    const result = await ideaInboxHarvester({
      findings: [mockFinding()],
      generateDashboard: true
    });

    expect(result.success).toBe(true);
    expect(result.dashboard.nextSteps).toBeDefined();
    expect(Array.isArray(result.dashboard.nextSteps)).toBe(true);
  });

  it('should calculate average score in dashboard', async () => {
    const findings = [
      mockFinding({ assessment: { finalScore: 0.8, recommendation: 'approve' } }),
      mockFinding({ id: 'f2', assessment: { finalScore: 0.6, recommendation: 'review' } })
    ];

    const result = await ideaInboxHarvester({
      findings,
      generateDashboard: true
    });

    expect(result.success).toBe(true);
    expect(result.dashboard.avgScore).toBeGreaterThan(0);
  });

  it('should handle large finding sets', async () => {
    const findings = Array.from({ length: 50 }, (_, i) =>
      mockFinding({ id: `f-${i}` })
    );

    const result = await ideaInboxHarvester({
      findings
    });

    expect(result.success).toBe(true);
    expect(result.stats.totalProcessed).toBe(50);
  });

  it('should validate findings array size limit', async () => {
    const findings = Array.from({ length: 101 }, (_, i) =>
      mockFinding({ id: `f-${i}` })
    );

    const result = await ideaInboxHarvester({
      findings
    });

    expect(result.success).toBe(false);
  });

  it('should generate unique harvest IDs', async () => {
    const result1 = await ideaInboxHarvester({
      findings: [mockFinding()]
    });

    const result2 = await ideaInboxHarvester({
      findings: [mockFinding()]
    });

    expect(result1.harvestId).not.toEqual(result2.harvestId);
  });
});
