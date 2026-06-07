#!/usr/bin/env node
/**
 * drift-heatmap.js
 * Generate a drift heatmap from baseline consistency results.
 * Shows per-field drift scores (description, summary, tags).
 */

import fs from 'node:fs/promises';
import path from 'node:path';

export async function generateHeatmap(baselineResults) {
  if (!baselineResults?.results) {
    throw new Error('Invalid baseline results format');
  }

  const heatmap = baselineResults.results.map(result => {
    const metrics = result.metrics || {};
    return {
      fileName: result.fileName,
      descriptionConsistency: metrics.description || 0,
      descriptionDrift: 1 - (metrics.description || 0),
      tagsConsistency: metrics.tags || 0,
      tagsDrift: 1 - (metrics.tags || 0),
      summaryConsistency: metrics.summary || 0,
      summaryDrift: 1 - (metrics.summary || 0),
      overallScore: result.score || 0,
      consistent: result.consistency || false
    };
  });

  // Calculate aggregates
  const driftAgg = {
    avgDescriptionDrift: heatmap.reduce((sum, h) => sum + h.descriptionDrift, 0) / heatmap.length,
    avgTagsDrift: heatmap.reduce((sum, h) => sum + h.tagsDrift, 0) / heatmap.length,
    avgSummaryDrift: heatmap.reduce((sum, h) => sum + h.summaryDrift, 0) / heatmap.length,
    overallDrift: heatmap.reduce((sum, h) => sum + (1 - h.overallScore), 0) / heatmap.length,
    totalFiles: heatmap.length,
    consistentFiles: heatmap.filter(h => h.consistent).length
  };

  return { heatmap, aggregates: driftAgg };
}

export async function saveHeatmap(heatmap, outputPath) {
  await fs.writeFile(outputPath, JSON.stringify(heatmap, null, 2));
  return outputPath;
}

export async function printHeatmapSummary(heatmap) {
  const agg = heatmap.aggregates;

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Drift Heatmap Summary                  ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`Total files:       ${agg.totalFiles}`);
  console.log(`Consistent files:  ${agg.consistentFiles} (${((agg.consistentFiles / agg.totalFiles) * 100).toFixed(1)}%)\n`);

  console.log('Average Drift by Field:');
  console.log(`  Description: ${(agg.avgDescriptionDrift * 100).toFixed(1)}%`);
  console.log(`  Tags:        ${(agg.avgTagsDrift * 100).toFixed(1)}%`);
  console.log(`  Summary:     ${(agg.avgSummaryDrift * 100).toFixed(1)}%`);
  console.log(`  Overall:     ${(agg.overallDrift * 100).toFixed(1)}%\n`);

  // Show unstable files
  const unstable = heatmap.heatmap.filter(h => !h.consistent);
  if (unstable.length > 0) {
    console.log(`⚠️  Unstable files (${unstable.length}):`);
    unstable.slice(0, 10).forEach(u => {
      console.log(`  - ${u.fileName} (score: ${(u.overallScore * 100).toFixed(1)}%)`);
    });
    if (unstable.length > 10) {
      console.log(`  ... and ${unstable.length - 10} more`);
    }
    console.log();
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const baselineFile = process.argv[2];
  if (!baselineFile) {
    console.error('Usage: node drift-heatmap.js <baseline-results.json>');
    process.exit(1);
  }

  try {
    const content = await fs.readFile(baselineFile, 'utf8');
    const baseline = JSON.parse(content);
    const heatmap = await generateHeatmap(baseline);

    const outputPath = baselineFile.replace('.json', '-heatmap.json');
    await saveHeatmap(heatmap, outputPath);
    await printHeatmapSummary(heatmap);

    console.log(`✓ Heatmap saved: ${outputPath}\n`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
