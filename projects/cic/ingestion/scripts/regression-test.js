#!/usr/bin/env node
/**
 * regression-test.js
 * Compare new extractor output against baseline to detect regressions.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

export function compareOutputs(oldOutput, newOutput) {
  return {
    descriptionChanged: (oldOutput?.description || '') !== (newOutput?.description || ''),
    summaryChanged: (oldOutput?.summary || '') !== (newOutput?.summary || ''),
    tagsChanged: JSON.stringify(oldOutput?.tags || []) !== JSON.stringify(newOutput?.tags || []),
    successChanged: oldOutput?.success !== newOutput?.success
  };
}

export function regressionTest(baseline, newResults) {
  const regressions = [];

  for (const newResult of newResults) {
    const baselineResult = baseline.find(b => b.assetId === newResult.assetId || b.fileName === newResult.fileName);

    if (!baselineResult) {
      continue; // Skip if not in baseline
    }

    const changes = compareOutputs(baselineResult, newResult);

    if (changes.successChanged || changes.descriptionChanged || changes.summaryChanged || changes.tagsChanged) {
      regressions.push({
        assetId: newResult.assetId,
        fileName: newResult.fileName,
        changes
      });
    }
  }

  return {
    totalTests: newResults.length,
    regressions: regressions.length,
    passing: newResults.length - regressions.length,
    details: regressions
  };
}

export async function loadBaseline(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

export function printRegressionReport(report) {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Regression Test Report                ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`Total tests:    ${report.totalTests}`);
  console.log(`Passing:        ${report.passing}`);
  console.log(`Regressions:    ${report.regressions}\n`);

  if (report.regressions > 0) {
    console.log('Regression Details:');
    report.details.slice(0, 10).forEach(r => {
      console.log(`  • ${r.fileName || r.assetId}`);

      const changes = [];
      if (r.changes.successChanged) changes.push('success');
      if (r.changes.descriptionChanged) changes.push('description');
      if (r.changes.summaryChanged) changes.push('summary');
      if (r.changes.tagsChanged) changes.push('tags');

      console.log(`    Changed: ${changes.join(', ')}`);
    });

    if (report.details.length > 10) {
      console.log(`  ... and ${report.details.length - 10} more`);
    }
    console.log();
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const baselineFile = process.argv[2];
  const newFile = process.argv[3];

  if (!baselineFile || !newFile) {
    console.error('Usage: node regression-test.js <baseline.json> <new-results.json>');
    process.exit(1);
  }

  try {
    const baseline = await loadBaseline(baselineFile);
    const newResults = await loadBaseline(newFile);

    const results = Array.isArray(baseline) ? baseline : baseline.results || [];
    const newRes = Array.isArray(newResults) ? newResults : newResults.results || [];

    const report = regressionTest(results, newRes);
    printRegressionReport(report);

    const outputPath = `regression-report-${new Date().toISOString().split('T')[0]}.json`;
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));

    console.log(`✓ Report saved: ${outputPath}\n`);

    if (report.regressions > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
