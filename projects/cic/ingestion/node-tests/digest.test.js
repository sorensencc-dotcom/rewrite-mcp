import test from 'node:test';
import assert from 'node:assert';
import { DigestSynthesizer } from '../src/digest/synthesizer.js';

test('DigestSynthesizer - should correctly format markdown', (t) => {
  const synthesizer = new DigestSynthesizer();
  const data = {
    date: '2026-05-22',
    memos: [{ title: 'Memo 1' }],
    tasks: [
      { title: 'Task Low', priority: 3 },
      { title: 'Task High', priority: 1, due: '2026-05-25' }
    ],
    ideas: [
      { title: 'Idea 1', cluster: 'cic/autoscale' },
      { title: 'Idea 2', cluster: 'rewrite-labs/design' }
    ],
    operatorNotes: [{ title: 'Note 1' }]
  };

  const md = synthesizer.synthesize(data);

  // Check sections
  assert.ok(md.includes('# 🗞️ Daily Digest — 2026-05-22'));
  assert.ok(md.includes('## ⚠️ Operator Notes'));
  assert.ok(md.includes('## ✅ Tasks'));
  assert.ok(md.includes('## 💡 Ideas'));
  assert.ok(md.includes('## 📝 New Memos'));
  assert.ok(md.includes('## 📊 Cluster Summary'));

  // Check Task Sorting (P1 should come before P3)
  const taskHighPos = md.indexOf('[P1] Task High');
  const taskLowPos = md.indexOf('[P3] Task Low');
  assert.ok(taskHighPos < taskLowPos, 'P1 task should appear before P3 task');

  // Check Clusters
  assert.ok(md.includes('### cic/autoscale'));
  assert.ok(md.includes('### rewrite-labs/design'));
  
  // Check Cluster Summary
  assert.ok(md.includes('- cic/autoscale: 1 idea'));
});
