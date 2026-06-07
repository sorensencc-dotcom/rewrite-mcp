import test from 'node:test';
import assert from 'node:assert';
import { extractTask } from '../src/tasks/extractor.js';
import { TaskRouter } from '../src/tasks/router.js';

test('TaskRouter - should identify tasks correctly', (t) => {
  const router = new TaskRouter();
  
  assert.strictEqual(router.shouldProcess({ primaryTag: 'task', secondaryTags: [] }), true);
  assert.strictEqual(router.shouldProcess({ primaryTag: 'ingest', secondaryTags: ['task'] }), true);
  assert.strictEqual(router.shouldProcess({ primaryTag: 'ingest', secondaryTags: ['Task'] }), true);
  assert.strictEqual(router.shouldProcess({ primaryTag: 'ingest', secondaryTags: ['rl'] }), false);
});

test('TaskExtractor - should extract title from first line', (t) => {
  const memo = {
    id: 123,
    content: 'Finish the project report #task',
    tags: ['task']
  };
  const task = extractTask(memo);
  assert.strictEqual(task.title, 'Finish the project report #task');
});

test('TaskExtractor - should extract title from first sentence', (t) => {
  const memo = {
    id: 124,
    content: 'Call John. Ask about the status of the server.',
    tags: ['task']
  };
  const task = extractTask(memo);
  assert.strictEqual(task.title, 'Call John.');
});

test('TaskExtractor - should parse due date', (t) => {
  const memo = {
    id: 125,
    content: 'Mow the lawn #task due:2026-05-30',
    tags: ['task']
  };
  const task = extractTask(memo);
  assert.strictEqual(task.due, '2026-05-30');
});

test('TaskExtractor - should parse priority', (t) => {
  const memoUrgent = {
    id: 126,
    content: 'Fix the leak! #task #urgent',
    tags: ['task', 'urgent']
  };
  assert.strictEqual(extractTask(memoUrgent).priority, 1);

  const memoHigh = {
    id: 127,
    content: 'Important meeting #task #high',
    tags: ['task', 'high']
  };
  assert.strictEqual(extractTask(memoHigh).priority, 2);

  const memoNormal = {
    id: 128,
    content: 'Buy milk #task',
    tags: ['task']
  };
  assert.strictEqual(extractTask(memoNormal).priority, 3);
});

test('TaskExtractor - should include source tag', (t) => {
  const memo = {
    id: 'abc-789',
    content: 'Test task',
    tags: ['test']
  };
  const task = extractTask(memo);
  assert.ok(task.tags.includes('memos-source-abc-789'));
});
