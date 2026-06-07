import { describe, it, expect } from 'vitest';
import { ideaInboxHarvester } from './index.js';
const mockFinding = (o = {}) => ({ id: 'f1', title: 'Test', type: 'opt', assessment: { finalScore: 0.75, recommendation: 'approve' }, ...o });

describe('Idea Inbox Harvester (45.6)', () => {
  it('should validate findings', async () => {
    const r = await ideaInboxHarvester({});
    expect(r.success).toBe(false);
  });

  it('should harvest findings', async () => {
    const r = await ideaInboxHarvester({ findings: [mockFinding()] });
    expect(r.success).toBe(true);
    expect(r.ideas.length).toBe(1);
  });

  it('should prioritize by score', async () => {
    const r = await ideaInboxHarvester({ findings: [mockFinding({ assessment: { finalScore: 0.5 } }), mockFinding({ id: 'f2', title: 'High', assessment: { finalScore: 0.9 } })], priorityThreshold: 0.6, deduplicateMode: 'off' });
    expect(r.stats.inboxCount).toBe(1);
    expect(r.stats.archiveCount).toBe(1);
  });

  it('should deduplicate exact', async () => {
    const r = await ideaInboxHarvester({ findings: [mockFinding({ id: 'f1', title: 'Same' }), mockFinding({ id: 'f2', title: 'Same' })], deduplicateMode: 'exact' });
    expect(r.stats.deduplication.removed).toBeGreaterThan(0);
  });

  it('should include timing', async () => {
    const r = await ideaInboxHarvester({ findings: [mockFinding()] });
    expect(r.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});
