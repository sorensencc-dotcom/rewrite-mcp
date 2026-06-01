#!/usr/bin/env node
/**
 * drift-classifier.js
 * Classify extraction stability as: stable, minor drift, moderate drift, unstable.
 */

import fs from 'node:fs/promises';

export function classifyDrift(score) {
  if (score >= 0.95) return 'stable';
  if (score >= 0.85) return 'minor-drift';
  if (score >= 0.70) return 'moderate-drift';
  return 'unstable';
}

export function classifyExtractionDrift(result) {
  const score = result.score || 0;
  const classification = classifyDrift(score);

  return {
    assetId: result.assetId,
    fileName: result.fileName,
    score: Math.round(score * 100) / 100,
    classification,
    recommendation: getRecommendation(classification)
  };
}

function getRecommendation(classification) {
  switch (classification) {
    case 'stable':
      return 'No action needed. This extractor is suitable for production.';
    case 'minor-drift':
      return 'Minor tuning may improve consistency. Consider increasing pass count.';
    case 'moderate-drift':
      return 'Moderate drift detected. Try multi-prompt extraction or model upgrade.';
    case 'unstable':
      return 'High drift. Recommend V4 (multi-prompt) or manual review of this image.';
    default:
      return 'Unknown classification.';
  }
}

export function classifyBatch(results) {
  const classified = results.map(r => classifyExtractionDrift(r));

  const counts = {
    stable: 0,
    'minor-drift': 0,
    'moderate-drift': 0,
    unstable: 0
  };

  for (const c of classified) {
    counts[c.classification]++;
  }

  return { classified, counts };
}

export function printDriftReport(classificationResult) {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Drift Classification Report           ║');
  console.log('╚════════════════════════════════════════╝\n');

  const { classified, counts } = classificationResult;
  const total = classified.length;

  console.log('Summary:');
  console.log(`  Stable:          ${counts.stable} (${((counts.stable / total) * 100).toFixed(1)}%)`);
  console.log(`  Minor Drift:     ${counts['minor-drift']} (${((counts['minor-drift'] / total) * 100).toFixed(1)}%)`);
  console.log(`  Moderate Drift:  ${counts['moderate-drift']} (${((counts['moderate-drift'] / total) * 100).toFixed(1)}%)`);
  console.log(`  Unstable:        ${counts.unstable} (${((counts.unstable / total) * 100).toFixed(1)}%)\n`);

  // Show action items
  const actionRequired = classified.filter(c => c.classification !== 'stable');

  if (actionRequired.length > 0) {
    console.log(`⚠️  Action Required (${actionRequired.length} items):\n`);

    actionRequired.slice(0, 10).forEach(c => {
      console.log(`  • ${c.fileName || c.assetId}`);
      console.log(`    Classification: ${c.classification} (score: ${(c.score * 100).toFixed(1)}%)`);
      console.log(`    ${c.recommendation}\n`);
    });

    if (actionRequired.length > 10) {
      console.log(`  ... and ${actionRequired.length - 10} more items\n`);
    }
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const resultsFile = process.argv[2];

  if (!resultsFile) {
    console.error('Usage: node drift-classifier.js <results.json>');
    process.exit(1);
  }

  try {
    const content = await fs.readFile(resultsFile, 'utf8');
    let data = JSON.parse(content);

    // Extract results array
    let results = data.results || (Array.isArray(data) ? data : [data]);

    const classification = classifyBatch(results);
    printDriftReport(classification);

    const outputPath = resultsFile.replace('.json', '-classified.json');
    await fs.writeFile(outputPath, JSON.stringify(classification, null, 2));

    console.log(`✓ Classification saved: ${outputPath}\n`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
