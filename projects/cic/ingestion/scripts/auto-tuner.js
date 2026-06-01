#!/usr/bin/env node
/**
 * auto-tuner.js
 * Analyze unstable extractions and suggest parameter adjustments.
 */

import fs from 'node:fs/promises';

export function analyzeDrift(results) {
  const unstable = results.filter(r => !r.consistency || (r.score || 0) < 0.80);

  if (unstable.length === 0) {
    return {
      totalResults: results.length,
      unstableCount: 0,
      suggestions: []
    };
  }

  const suggestions = [];

  // Suggest higher pass count if many unstable
  if (unstable.length > results.length * 0.3) {
    suggestions.push({
      category: 'pass-count',
      severity: 'high',
      suggestion: 'Increase extraction passes',
      detail: `${unstable.length} images are unstable. Try V3 (3 passes) or V4 (6 passes).`,
      action: 'Use ImageAnalyzerV3 or V4 instead of V2'
    });
  }

  // Suggest multi-prompt if moderate instability
  if (unstable.length > results.length * 0.15) {
    suggestions.push({
      category: 'prompt-strategy',
      severity: 'medium',
      suggestion: 'Use multi-prompt extraction',
      detail: 'Different prompts may capture different aspects of the image.',
      action: 'Switch to ImageAnalyzerV4 (semantic + structural prompts)'
    });
  }

  // Suggest model upgrade if very unstable
  const veryUnstable = unstable.filter(r => (r.score || 0) < 0.70);
  if (veryUnstable.length > 0) {
    suggestions.push({
      category: 'model-upgrade',
      severity: 'medium',
      suggestion: 'Consider model upgrade',
      detail: `${veryUnstable.length} images have very low scores (<70%).`,
      action: 'Test with claude-opus-4-8 (latest model)'
    });
  }

  // Per-image recommendations
  const perImageSuggestions = unstable.map(r => ({
    fileName: r.fileName,
    score: r.score,
    recommendation: getImageRecommendation(r)
  }));

  return {
    totalResults: results.length,
    unstableCount: unstable.length,
    unstablePercentage: ((unstable.length / results.length) * 100).toFixed(1),
    suggestions,
    perImage: perImageSuggestions
  };
}

function getImageRecommendation(result) {
  const score = result.score || 0;

  if (score < 0.60) {
    return 'Very unstable - consider manual review or image preprocessing';
  } else if (score < 0.70) {
    return 'Unstable - try V4 multi-prompt extraction';
  } else if (score < 0.80) {
    return 'Moderate drift - increase pass count to 5+';
  } else if (score < 0.90) {
    return 'Minor drift - acceptable for most use cases';
  }
  return 'Stable - no action needed';
}

export function printAutoTuneReport(analysis) {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Auto-Tuner Report                     ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`Total Results:    ${analysis.totalResults}`);
  console.log(`Unstable:         ${analysis.unstableCount} (${analysis.unstablePercentage}%)\n`);

  if (analysis.suggestions.length > 0) {
    console.log('Recommended Actions:\n');

    analysis.suggestions.forEach((s, i) => {
      const severityIcon = s.severity === 'high' ? '🔴' : '🟡';
      console.log(`${i + 1}. ${severityIcon} ${s.suggestion}`);
      console.log(`   ${s.detail}`);
      console.log(`   → ${s.action}\n`);
    });
  } else {
    console.log('✓ No significant issues detected.\n');
  }

  // Show per-image recommendations
  if (analysis.perImage.length > 0 && analysis.perImage.length <= 20) {
    console.log('Per-Image Recommendations:\n');
    analysis.perImage.forEach(p => {
      console.log(`  ${p.fileName} (${(p.score * 100).toFixed(1)}%)`);
      console.log(`    → ${p.recommendation}\n`);
    });
  } else if (analysis.perImage.length > 20) {
    console.log(`Per-Image Recommendations (showing first 10 of ${analysis.perImage.length}):\n`);
    analysis.perImage.slice(0, 10).forEach(p => {
      console.log(`  ${p.fileName} (${(p.score * 100).toFixed(1)}%)`);
      console.log(`    → ${p.recommendation}`);
    });
    console.log(`  ... and ${analysis.perImage.length - 10} more\n`);
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const resultsFile = process.argv[2];

  if (!resultsFile) {
    console.error('Usage: node auto-tuner.js <results.json>');
    process.exit(1);
  }

  try {
    const content = await fs.readFile(resultsFile, 'utf8');
    let data = JSON.parse(content);

    // Extract results array
    let results = data.results || (Array.isArray(data) ? data : [data]);

    const analysis = analyzeDrift(results);
    printAutoTuneReport(analysis);

    const outputPath = resultsFile.replace('.json', '-tuning.json');
    await fs.writeFile(outputPath, JSON.stringify(analysis, null, 2));

    console.log(`✓ Tuning analysis saved: ${outputPath}\n`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
