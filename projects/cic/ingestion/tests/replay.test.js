import test from 'node:test';
import assert from 'node:assert';
import { ReplaySimulator } from '../src/replay/simulator.js';
import { ReplayReporter } from '../src/replay/reporter.js';

test('Replay Engine - Simulator and Reporter logic', async (t) => {
  // Mock Joplin Client
  const mockJoplinClient = {
    findNotesByTag: async (tag) => {
      // Simulate that memo 123 already exists, but 124 doesn't
      if (tag === 'memos-source-123') return [{ id: 'note_1' }];
      return [];
    }
  };

  const simulator = new ReplaySimulator({ joplinClient: mockJoplinClient });
  const reporter = new ReplayReporter();

  // Test Case 1: Task and Idea (New)
  const memoNew = {
    id: 124,
    content: 'Build a robot #task #idea #robotics',
    tags: ['task', 'idea', 'robotics'],
    createTime: '2026-05-22T14:00:00Z'
  };

  const resultNew = await simulator.simulate(memoNew);
  const reportNew = reporter.report(124, resultNew);

  assert.ok(reportNew.includes('Routed to: TaskExtractor, IdeaClusterer'));
  assert.ok(reportNew.includes('Would Create: YES'));
  assert.ok(reportNew.includes('Cluster: task/robotics'));

  // Test Case 2: Existing Memo
  const memoExisting = {
    id: 123,
    content: 'Existing task #task',
    tags: ['task'],
    createTime: '2026-05-22T14:00:00Z'
  };

  const resultExisting = await simulator.simulate(memoExisting);
  const reportExisting = reporter.report(123, resultExisting);

  assert.ok(reportExisting.includes('Would Create: NO (already exists)'));

  // Test Case 3: No primary tag
  const memoNone = {
    id: 125,
    content: 'Just a note #unknown',
    tags: ['unknown'],
    createTime: '2026-05-22T14:00:00Z'
  };

  const resultNone = await simulator.simulate(memoNone);
  const reportNone = reporter.report(125, resultNone);

  assert.ok(reportNone.includes('Status: SKIPPED (No primary tag found)'));
});
