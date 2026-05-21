// apps/cic-pms/tests/modelRouter.test.js
import assert from 'node:assert';
import { test } from 'node:test';
import { recordModelCall, getRecentModelCalls } from '../src/telemetryCache.js';
import { computeModelScores, getDynamicModelChain, markModelCooldown } from '../src/modelRouter.js';

test('Model Router - Scoring Logic', async (t) => {
  // Clear any existing calls (though in tests we start fresh)
  // recordModelCall is append-only in the current impl, so let's just add our own and see if they dominate
  
  // Scenario: Gemini is fast and successful, Claude is slow, Llama is cheap but failed once
  recordModelCall({ model: 'gemini', success: true, latencyMs: 100 });
  recordModelCall({ model: 'gemini', success: true, latencyMs: 120 });
  
  recordModelCall({ model: 'claude', success: true, latencyMs: 2000 });
  
  recordModelCall({ model: 'llama', success: false, errorCode: 500, latencyMs: 50 });
  recordModelCall({ model: 'llama', success: true, latencyMs: 60 });

  const scores = computeModelScores();
  
  assert.ok(scores.gemini.score > scores.claude.score, 'Gemini should score higher than Claude due to latency');
  assert.ok(scores.gemini.score > scores.llama.score, 'Gemini should score higher than Llama due to failure');
  
  const chain = getDynamicModelChain();
  // Llama is very cheap (0.4 vs 1.0), so efficiency might still be high
  console.log('Scores:', JSON.stringify(scores, null, 2));
  console.log('Chain:', chain.map(m => m.name));
  
  assert.strictEqual(chain[0].name, 'llama', 'Llama should be first in chain due to high efficiency (low cost)');
});

test('Model Router - Cooldown Logic', async (t) => {
  markModelCooldown('gemini', 1000);
  const chain = getDynamicModelChain();
  assert.ok(!chain.find(m => m.name === 'gemini'), 'Gemini should be excluded from chain during cooldown');
  
  // Wait for cooldown
  await new Promise(r => setTimeout(r, 1100));
  const chainAfter = getDynamicModelChain();
  assert.ok(chainAfter.find(m => m.name === 'gemini'), 'Gemini should return to chain after cooldown');
});
