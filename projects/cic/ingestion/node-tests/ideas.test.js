import test from 'node:test';
import assert from 'node:assert';
import { extractIdea } from '../src/ideas/extractor.js';
import { IdeaRouter } from '../src/ideas/router.js';
import { IdeaClusterer } from '../src/ideas/clusterer.js';

test('IdeaRouter - should identify ideas correctly', (t) => {
  const router = new IdeaRouter();
  assert.strictEqual(router.shouldProcess({ primaryTag: 'idea', secondaryTags: [] }), true);
  assert.strictEqual(router.shouldProcess({ primaryTag: 'ingest', secondaryTags: ['idea'] }), true);
  assert.strictEqual(router.shouldProcess({ primaryTag: 'ingest', secondaryTags: ['rl'] }), false);
});

test('IdeaExtractor - should extract title and source tag', (t) => {
  const memo = {
    id: 456,
    content: 'We should build a bridge. It will be great.',
    tags: ['idea', 'civic']
  };
  const idea = extractIdea(memo);
  assert.strictEqual(idea.title, 'We should build a bridge.');
  assert.ok(idea.tags.includes('memos-source-456'));
});

test('IdeaClusterer - tag-based clustering', (t) => {
  const clusterer = new IdeaClusterer();
  const idea = {
    body: 'Testing tags',
    tags: ['idea', 'cic', 'autoscale', 'memos-source-456']
  };
  assert.strictEqual(clusterer.cluster(idea), 'cic/autoscale');
});

test('IdeaClusterer - keyword-based fallback', (t) => {
  const clusterer = new IdeaClusterer();
  const idea = {
    body: 'We need a region-aware strategy',
    tags: ['idea', 'memos-source-456']
  };
  assert.strictEqual(clusterer.cluster(idea), 'cic/regions');
});

test('IdeaClusterer - keyword-based fallback (finance)', (t) => {
  const clusterer = new IdeaClusterer();
  const idea = {
    body: 'Check the FX rates',
    tags: ['idea', 'memos-source-456']
  };
  assert.strictEqual(clusterer.cluster(idea), 'finance/fx');
});

test('IdeaClusterer - default fallback', (t) => {
  const clusterer = new IdeaClusterer();
  const idea = {
    body: 'Just a random thought',
    tags: ['idea', 'memos-source-456']
  };
  assert.strictEqual(clusterer.cluster(idea), 'misc/general');
});
