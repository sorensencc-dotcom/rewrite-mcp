/**
 * scoring.test.js
 * @version 5.0.0
 * @date 2026-05-31
 *
 * CIC Phase 5: Scoring System Test Suite
 *
 * Tests individual subsystems and the full scoring pipeline.
 * Run with: npm test -- scoring.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Test Setup
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_GOOD_HTML = `
  <h1>Excellent Article on Climate Science</h1>
  <h2>Introduction</h2>
  <p>Climate change represents one of the most pressing challenges of our time.
  This article explores the scientific evidence, policy implications, and actionable steps
  communities can take. For more information, see [[1]](https://ipcc.org).</p>

  <h2>Evidence</h2>
  <p>Global temperatures have risen approximately 1.1°C since pre-industrial times,
  according to the IPCC 2021 report. This warming is driven by human activities,
  particularly greenhouse gas emissions.</p>

  <h2>Solutions</h2>
  <p>Effective mitigation requires coordinated action across energy, transportation,
  and agriculture sectors. See the UN Sustainable Development Goals for policy frameworks.</p>

  <h2>References</h2>
  <ul>
    <li>IPCC Fourth Assessment Report (2021)</li>
    <li>UN SDGS Framework (2015)</li>
  </ul>
`;

const SAMPLE_POOR_HTML = `
  <p>Climate is changing. It's hot. Bad stuff.</p>
  <p>We need to do stuff. But nobody does.</p>
`;

const SAMPLE_INACCESSIBLE_HTML = `
  <h1>Page Title</h1>
  <img src="chart.png">
  <form>
    <input type="email">
    <input type="password">
  </form>
`;

// ─────────────────────────────────────────────────────────────────────────────
// Heuristic Rules Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Heuristic: Good content scores higher than poor content', async () => {
  const { applyHeuristicRules } = await import('./heuristic-rules.mjs');

  const goodScore = await applyHeuristicRules(SAMPLE_GOOD_HTML);
  const poorScore = await applyHeuristicRules(SAMPLE_POOR_HTML);

  assert.ok(goodScore.score > poorScore.score, 'Good content should score higher');
  assert.ok(goodScore.score > 0.5, 'Good content should be acceptable');
  assert.ok(poorScore.score < 0.5, 'Poor content should be below acceptable');
});

test('Heuristic: Detects insufficient content', async () => {
  const { applyHeuristicRules } = await import('./heuristic-rules.mjs');

  const result = await applyHeuristicRules('<p>Too short.</p>');

  assert.ok(
    result.issues.some(i => i.type === 'insufficient_content'),
    'Should detect short content'
  );
});

test('Heuristic: Detects missing sources', async () => {
  const { applyHeuristicRules } = await import('./heuristic-rules.mjs');

  const nosources = await applyHeuristicRules(
    '<p>Long content goes here. '.repeat(50) + '</p>'
  );
  const withsources = await applyHeuristicRules(
    '<p>See [1] for details. '.repeat(50) + '</p>'
  );

  assert.ok(
    nosources.issues.some(i => i.type === 'missing_sources'),
    'Should detect missing sources'
  );
  assert.ok(withsources.score > nosources.score, 'Content with sources should score higher');
});

// ─────────────────────────────────────────────────────────────────────────────
// Semantic Evaluation Tests (LLM-based, may require API)
// ─────────────────────────────────────────────────────────────────────────────

test('Semantic: Returns valid score range', async () => {
  const { evaluateSemantics } = await import('./semantic-evaluator.mjs');

  const result = await evaluateSemantics(SAMPLE_GOOD_HTML, { intent: 'education' });

  assert.ok(typeof result.score === 'number', 'Score should be a number');
  assert.ok(result.score >= 0 && result.score <= 1, 'Score should be 0-1');
  assert.ok(result.factors, 'Should have factors breakdown');
});

// ─────────────────────────────────────────────────────────────────────────────
// Structural Analysis Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Structural: Good structure scores higher', async () => {
  const { analyzeStructure } = await import('./structural-analyzer.mjs');

  const goodStructure = await analyzeStructure(SAMPLE_GOOD_HTML);
  const poorStructure = await analyzeStructure(SAMPLE_POOR_HTML);

  assert.ok(goodStructure.score > poorStructure.score, 'Good structure should score higher');
  assert.ok(
    goodStructure.metrics.headingCount > 0,
    'Good structure should have headings'
  );
});

test('Structural: Detects missing headings', async () => {
  const { analyzeStructure } = await import('./structural-analyzer.mjs');

  const result = await analyzeStructure('<p>No headings here.</p>');

  assert.ok(
    result.issues.some(i => i.type === 'missing_headings'),
    'Should detect missing headings'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Accessibility Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Accessibility: Detects missing alt text', async () => {
  const { checkAccessibility } = await import('./accessibility-checker.mjs');

  const result = await checkAccessibility(SAMPLE_INACCESSIBLE_HTML);

  assert.ok(
    result.issues.some(i => i.type === 'missing_alt_text'),
    'Should detect missing alt text'
  );
});

test('Accessibility: Detects missing form labels', async () => {
  const { checkAccessibility } = await import('./accessibility-checker.mjs');

  const result = await checkAccessibility(SAMPLE_INACCESSIBLE_HTML);

  assert.ok(
    result.issues.some(i => i.type === 'missing_label'),
    'Should detect missing form labels'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Scoring Engine Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Scoring Engine: Full pipeline returns valid result', async () => {
  const { scoreContent } = await import('./scoring-engine.mjs');

  const result = await scoreContent(SAMPLE_GOOD_HTML, {
    user_id: 'test-user',
    correlation_id: 'test-123',
  });

  assert.ok(typeof result.score === 'number', 'Score should be a number');
  assert.ok(result.score >= 0 && result.score <= 1, 'Score should be 0-1');
  assert.ok(['A', 'B', 'C', 'D', 'F'].includes(result.grade), 'Grade should be A-F');
  assert.ok(result.breakdown, 'Should have breakdown');
  assert.ok(Array.isArray(result.issues), 'Issues should be an array');
  assert.ok(Array.isArray(result.suggestions), 'Suggestions should be an array');
  assert.ok(result.metadata.duration_ms >= 0, 'Should have duration');
});

test('Scoring Engine: Good content scores higher than poor content', async () => {
  const { scoreContent } = await import('./scoring-engine.mjs');

  const goodResult = await scoreContent(SAMPLE_GOOD_HTML);
  const poorResult = await scoreContent(SAMPLE_POOR_HTML);

  assert.ok(goodResult.score > poorResult.score, 'Good content should score higher');
});

test('Scoring Engine: Partial scoring works', async () => {
  const { scoreContentPartial } = await import('./scoring-engine.mjs');

  const result = await scoreContentPartial(
    SAMPLE_GOOD_HTML,
    {},
    ['heuristic', 'structural']
  );

  assert.ok(result.breakdown.heuristic, 'Should have heuristic subscore');
  assert.ok(result.breakdown.structural, 'Should have structural subscore');
  assert.ok(!result.breakdown.semantic, 'Should not have semantic subscore');
  assert.ok(!result.breakdown.accessibility, 'Should not have accessibility subscore');
});

// ─────────────────────────────────────────────────────────────────────────────
// Auto-Repair Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Auto-Repair: Generates suggestions for detected issues', async () => {
  const { generateRepairSuggestions } = await import('./auto-repair.mjs');

  const issues = [
    { type: 'missing_alt_text', message: 'Image missing alt', severity: 'high' },
    { type: 'missing_headings', message: 'No headings found', severity: 'high' },
  ];

  const suggestions = await generateRepairSuggestions(SAMPLE_INACCESSIBLE_HTML, issues);

  assert.ok(Array.isArray(suggestions), 'Should return array of suggestions');
  assert.ok(suggestions.length > 0, 'Should generate at least one suggestion');
  assert.ok(suggestions[0].suggestion, 'Suggestion should have text');
  assert.ok(suggestions[0].estimatedEffort, 'Suggestion should have effort estimate');
});

test('Auto-Repair: Repair plan prioritizes by severity', async () => {
  const { createRepairPlan } = await import('./auto-repair.mjs');

  const suggestions = [
    { issueType: 'a', severity: 'low', estimatedEffort: 1 },
    { issueType: 'b', severity: 'critical', estimatedEffort: 2 },
    { issueType: 'c', severity: 'medium', estimatedEffort: 1 },
  ];

  const plan = createRepairPlan(suggestions);

  assert.equal(plan.phases.critical.length, 1, 'Should have 1 critical issue');
  assert.equal(plan.phases.medium.length, 1, 'Should have 1 medium issue');
  assert.equal(plan.phases.low.length, 1, 'Should have 1 low issue');
  assert.equal(plan.totalEstimatedEffort, 4, 'Should sum effort');
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Integration: Scoring pipeline wrapper', async () => {
  const { runScoringPipeline } = await import('../pipeline/score-pipeline.js');

  const result = await runScoringPipeline({
    content: SAMPLE_GOOD_HTML,
    user_id: 'test',
    source: 'test',
  });

  assert.ok(result.correlation_id, 'Should have correlation ID');
  assert.ok(typeof result.score === 'number', 'Should have score');
  assert.ok(result.duration_ms >= 0, 'Should have duration');
});

console.log('✓ All scoring tests defined (some may require ANTHROPIC_API_KEY for LLM calls)');
