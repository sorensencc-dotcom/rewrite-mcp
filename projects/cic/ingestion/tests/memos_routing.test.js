import { describe, it, expect } from 'vitest';
import { extractPrimaryTag, extractSecondaryTags, computeRoutingKey } from '../src/memos/routing.js';

describe('Memos Routing Logic', () => {
  describe('extractPrimaryTag', () => {
    it('should extract a primary tag from a list', () => {
      expect(extractPrimaryTag(['task', 'cic', 'urgent'])).toBe('task');
      expect(extractPrimaryTag(['rl', 'ingest', 'p1'])).toBe('ingest');
    });

    it('should be case-insensitive', () => {
      expect(extractPrimaryTag(['TASK', 'cic'])).toBe('task');
    });

    it('should return null if no primary tag is found', () => {
      expect(extractPrimaryTag(['unknown', 'context'])).toBeNull();
    });
  });

  describe('extractSecondaryTags', () => {
    it('should return all tags except the primary one', () => {
      expect(extractSecondaryTags(['task', 'cic', 'urgent'], 'task')).toEqual(['cic', 'urgent']);
    });
  });

  describe('computeRoutingKey', () => {
    it('should route ingest with rl to rewritelabs', () => {
      expect(computeRoutingKey('ingest', ['rl', 'p1'])).toBe('cic.rewritelabs.ingest');
    });

    it('should route ingest with cic to core', () => {
      expect(computeRoutingKey('ingest', ['cic'])).toBe('cic.core.ingest');
    });

    it('should route generic ingest', () => {
      expect(computeRoutingKey('ingest', ['other'])).toBe('cic.generic.ingest');
    });

    it('should route other primary tags', () => {
      expect(computeRoutingKey('idea', [])).toBe('cic.ideas.inbox');
      expect(computeRoutingKey('task', [])).toBe('cic.tasks.inbox');
    });
  });
});
