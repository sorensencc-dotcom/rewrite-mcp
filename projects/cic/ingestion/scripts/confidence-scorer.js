#!/usr/bin/env node
/**
 * confidence-scorer.js
 * Compute extraction confidence based on multi-pass consistency.
 */

import fs from 'node:fs/promises';

export function scoreConfidence(passes) {
  if (!passes || passes.length === 0) {
    return { descriptionConfidence: 0, tagsConfidence: 0, summaryConfidence: 0, overallConfidence: 0 };
  }

  // Description confidence: 1 / (unique descriptions)
  const descriptions = new Set(passes.map(p => (p.description || '').trim()));
  const descriptionConfidence = 1 / Math.max(descriptions.size, 1);

  // Summary confidence: 1 / (unique summaries)
  const summaries = new Set(passes.map(p => (p.summary || '').trim()));
  const summaryConfidence = 1 / Math.max(summaries.size, 1);

  // Tags confidence: intersection / union
  const tagSets = passes.map(p => new Set(p.tags || []));
  let tagIntersection = new Set(tagSets[0] || []);

  for (let i = 1; i < tagSets.length; i++) {
    tagIntersection = new Set([...tagIntersection].filter(t => tagSets[i].has(t)));
  }

  const tagUnion = new Set();
  for (const s of tagSets) {
    for (const t of s) tagUnion.add(t);
  }

  const tagsConfidence = tagUnion.size === 0 ? 1.0 : tagIntersection.size / tagUnion.size;

  const overallConfidence = (descriptionConfidence + summaryConfidence + tagsConfidence) / 3;

  return {
    descriptionConfidence: Math.round(descriptionConfidence * 100) / 100,
    summaryConfidence: Math.round(summaryConfidence * 100) / 100,
    tagsConfidence: Math.round(tagsConfidence * 100) / 100,
    overallConfidence: Math.round(overallConfidence * 100) / 100
  };
}

export function scoreExtractorOutput(extractorResult) {
  if (!extractorResult?.passes) {
    return { score: 0, confidence: {} };
  }

  let passes = [];

  if (Array.isArray(extractorResult.passes)) {
    passes = extractorResult.passes;
  } else if (extractorResult.resultsByPrompt) {
    // V4 format: { resultsByPrompt: { semantic: [...], structural: [...] } }
    passes = [
      ...extractorResult.resultsByPrompt.semantic,
      ...extractorResult.resultsByPrompt.structural
    ];
  } else if (extractorResult.allResults) {
    // Other formats with allResults
    passes = extractorResult.allResults;
  }

  const confidence = scoreConfidence(passes);

  return {
    score: confidence.overallConfidence,
    confidence
  };
}

export function printConfidenceReport(results) {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Extraction Confidence Report          ║');
  console.log('╚════════════════════════════════════════╝\n');

  for (const result of results) {
    const { score, confidence } = scoreExtractorOutput(result);

    console.log(`${result.fileName || result.assetId || 'unknown'}`);
    console.log(`  Overall:      ${(score * 100).toFixed(1)}%`);
    console.log(`  Description:  ${(confidence.descriptionConfidence * 100).toFixed(1)}%`);
    console.log(`  Summary:      ${(confidence.summaryConfidence * 100).toFixed(1)}%`);
    console.log(`  Tags:         ${(confidence.tagsConfidence * 100).toFixed(1)}%\n`);
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const resultsFile = process.argv[2];

  if (!resultsFile) {
    console.error('Usage: node confidence-scorer.js <results.json>');
    process.exit(1);
  }

  try {
    const content = await fs.readFile(resultsFile, 'utf8');
    let results = JSON.parse(content);

    // Handle both direct results and wrapped results
    if (results.results) {
      results = results.results;
    } else if (!Array.isArray(results)) {
      results = [results];
    }

    printConfidenceReport(results);

    const scores = results.map(r => scoreExtractorOutput(r).score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);

    console.log(`Average Confidence: ${(avgScore * 100).toFixed(1)}%\n`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
