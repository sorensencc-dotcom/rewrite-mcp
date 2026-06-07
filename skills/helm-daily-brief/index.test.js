import { describe, it, expect, beforeEach } from 'vitest';
import { helmDailyBrief } from './index.js';

describe('HELM Daily Brief (45.5)', () => {
  beforeEach(() => {
    // Clear any state between tests
  });

  it('should generate briefing with all sections', async () => {
    const result = await helmDailyBrief({
      includeEvents: true,
      includeEmails: true,
      includeFinance: true,
      format: 'text'
    });

    expect(result.success).toBe(true);
    expect(result.brief).toBeDefined();
    expect(result.brief).toContain('DAILY BRIEF');
    expect(result.brief).toContain('SCHEDULE');
    expect(result.brief).toContain('MESSAGES');
    expect(result.brief).toContain('FINANCIAL');
  });

  it('should generate briefing with only events', async () => {
    const result = await helmDailyBrief({
      includeEvents: true,
      includeEmails: false,
      includeFinance: false,
      format: 'text'
    });

    expect(result.success).toBe(true);
    expect(result.brief).toContain('SCHEDULE');
  });

  it('should validate maxEventsPerDay range', async () => {
    const result = await helmDailyBrief({
      maxEventsPerDay: 25 // Too high
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('maxEventsPerDay');
  });

  it('should validate maxEmailCount range', async () => {
    const result = await helmDailyBrief({
      maxEmailCount: 15 // Too high
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('maxEmailCount');
  });

  it('should validate format enum', async () => {
    const result = await helmDailyBrief({
      format: 'invalid-format'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('format');
  });

  it('should return JSON format when requested', async () => {
    const result = await helmDailyBrief({
      includeEvents: true,
      includeEmails: true,
      includeFinance: true,
      format: 'json'
    });

    expect(result.success).toBe(true);
    expect(result.format).toBe('json');
    expect(result.briefing).toBeDefined();
    expect(result.briefing.sections).toBeDefined();
  });

  it('should include events in briefing', async () => {
    const result = await helmDailyBrief({
      includeEvents: true,
      includeEmails: false,
      includeFinance: false,
      maxEventsPerDay: 5
    });

    expect(result.success).toBe(true);
    expect(result.brief).toContain('Meeting');
  });

  it('should include emails in briefing', async () => {
    const result = await helmDailyBrief({
      includeEvents: false,
      includeEmails: true,
      includeFinance: false,
      maxEmailCount: 3
    });

    expect(result.success).toBe(true);
    expect(result.brief).toContain('message');
  });

  it('should include finance data in briefing', async () => {
    const result = await helmDailyBrief({
      includeEvents: false,
      includeEmails: false,
      includeFinance: true
    });

    expect(result.success).toBe(true);
    expect(result.brief).toContain('Net Worth');
    expect(result.brief).toContain('Spending');
  });

  it('should cache briefing results', async () => {
    // First call (live)
    const result1 = await helmDailyBrief({
      forceRefresh: true
    });
    expect(result1.source).toBe('live');

    // Second call (cached)
    const result2 = await helmDailyBrief({
      forceRefresh: false
    });
    expect(result2.source).toBe('cached');
    expect(result2.cachedAt).toBeDefined();
    expect(result2.expiresAt).toBeDefined();
  });

  it('should force refresh cache', async () => {
    const result = await helmDailyBrief({
      forceRefresh: true
    });

    expect(result.success).toBe(true);
    expect(result.source).toBe('live');
  });

  it('should respect maxEventsPerDay limit', async () => {
    const result = await helmDailyBrief({
      includeEvents: true,
      includeEmails: false,
      includeFinance: false,
      maxEventsPerDay: 3
    });

    expect(result.success).toBe(true);
    const eventLines = (result.brief.match(/Meeting/g) || []).length;
    expect(eventLines).toBeLessThanOrEqual(3);
  });

  it('should respect maxEmailCount limit', async () => {
    const result = await helmDailyBrief({
      includeEvents: false,
      includeEmails: true,
      includeFinance: false,
      maxEmailCount: 2
    });

    expect(result.success).toBe(true);
    // Count email entries (pattern: "  N. 🔴|🟡 From:")
    const emailEntries = (result.brief.match(/\s+\d+\.\s+(?:🔴|🟡)/g) || []).length;
    expect(emailEntries).toBeLessThanOrEqual(2);
  });

  it('should include generation timestamp', async () => {
    const result = await helmDailyBrief({
      forceRefresh: true  // Force fresh to guarantee generatedAt
    });

    expect(result.success).toBe(true);
    expect(result.generatedAt || result.cachedAt).toBeDefined();
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.elapsedMs).toBe('number');
  });

  it('should handle empty sections gracefully', async () => {
    // All sections might be empty depending on randomization
    const result = await helmDailyBrief({
      includeEvents: true,
      includeEmails: true,
      includeFinance: true
    });

    expect(result.success).toBe(true);
    // Should still return valid briefing even if sections are empty
    expect(result.brief).toBeDefined();
  });

  it('should use default parameters', async () => {
    const result = await helmDailyBrief();

    expect(result.success).toBe(true);
    expect(result.format).toBe('text');
    expect(result.brief).toBeDefined();
  });
});
