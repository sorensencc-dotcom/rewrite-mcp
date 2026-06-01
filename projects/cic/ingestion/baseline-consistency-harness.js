#!/usr/bin/env node
/**
 * baseline-consistency-harness.js
 * @version 4.0.1
 * @date 2026-05-31
 *
 * CIC Step 3: ImageAnalyzerV2 consistency baseline via Local Ingestion
 * Runs local sample images twice, measures output stability (consistency ≥ 0.80)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run as analyzeImage } from './src/extractors/ImageAnalyzerV2.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local samples directory (correct CIC root)
const SAMPLES_DIR = path.join(__dirname, 'samples');
const TARGET_COUNT = 25;

/**
 * Scan local directory for valid image assets
 */
async function getLocalSamples(directoryPath) {
  const files = await fs.readdir(directoryPath);
  const validExtensions = ['.jpg', '.jpeg', '.png'];

  const images = files.filter(file =>
    validExtensions.includes(path.extname(file).toLowerCase())
  );

  return images.map(filename => ({
    name: filename,
    absolutePath: path.join(directoryPath, filename)
  }));
}

/**
 * Run ImageAnalyzerV2 on a local file asset
 */
async function runImageAnalyzer(imagePath, attempt) {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

  return analyzeImage(
    {
      assetId: `baseline-${path.basename(imagePath)}-${attempt}`,
      sourcePath: imagePath,
      mimeType,
      sourceSystem: 'local',
      bytesPath: imagePath
    },
    {
      model: 'claude-opus-4-6',
      structured: true
    }
  );
}

/**
 * Compare two extraction outputs for consistency
 */
function compareExtractions(run1, run2) {
  if (run1.success !== run2.success) {
    return { consistent: false, reason: 'success mismatch', score: 0 };
  }

  if (!run1.success) {
    return { consistent: true, reason: 'both failed', score: 1.0 };
  }

  const textSim = (a, b) => {
    if (!a && !b) return 1.0;
    if (!a || !b) return 0.0;
    const aWords = a.toLowerCase().split(/\s+/);
    const bWords = b.toLowerCase().split(/\s+/);
    const common = aWords.filter(w => bWords.includes(w)).length;
    return (2 * common) / (aWords.length + bWords.length);
  };

  const setMatch = (a, b) => {
    const aSet = new Set(a || []);
    const bSet = new Set(b || []);
    const intersection = [...aSet].filter(x => bSet.has(x)).length;
    const union = new Set([...(a || []), ...(b || [])]).size;
    return union === 0 ? 1.0 : intersection / union;
  };

  const metrics = {
    description: textSim(run1.description, run2.description),
    tags: setMatch(run1.tags, run2.tags),
    summary: textSim(run1.summary, run2.summary)
  };

  const score =
    (metrics.description + metrics.tags + metrics.summary) / 3;

  return { consistent: score >= 0.80, score, metrics };
}

/**
 * Process images with concurrency limit
 */
async function processWithConcurrency(samples, concurrency = 4) {
  const results = [];
  let completed = 0;

  const processSample = async (sample, index) => {
    try {
      const run1 = await runImageAnalyzer(sample.absolutePath, 1);
      const run2 = await runImageAnalyzer(sample.absolutePath, 2);
      const consistency = compareExtractions(run1, run2);

      completed++;
      console.log(`[${completed}/${samples.length}] ${sample.name}`);
      const status = consistency.consistent ? '✓' : '✗';
      console.log(`  ${status} Consistency Score: ${(consistency.score * 100).toFixed(1)}%`);

      return {
        fileName: sample.name,
        run1Success: run1.success,
        run2Success: run2.success,
        consistency: consistency.consistent,
        score: consistency.score,
        metrics: consistency.metrics
      };
    } catch (err) {
      completed++;
      console.error(`[${completed}/${samples.length}] ${sample.name}`);
      console.error(`  ✗ Error: ${err.message}`);
      return {
        fileName: sample.name,
        error: err.message
      };
    }
  };

  // Process in batches
  for (let i = 0; i < samples.length; i += concurrency) {
    const batch = samples.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((s, idx) => processSample(s, i + idx)));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Main Execution Block
 */
async function main() {
  console.log('=== CIC Step 3: ImageAnalyzerV2 Local Baseline Consistency ===\n');

  try {
    console.log(`Scanning directory: ${SAMPLES_DIR}`);
    const availableSamples = await getLocalSamples(SAMPLES_DIR);

    if (availableSamples.length === 0) {
      console.log(`⚠️ No image samples found. Add images to: ${SAMPLES_DIR}`);
      return;
    }

    const samples = availableSamples.slice(0, TARGET_COUNT);
    console.log(`✓ Identified ${samples.length} local images.`);
    console.log(`Processing in parallel (4 concurrent)...\n`);

    const results = await processWithConcurrency(samples, 4);

    // Generate JSON Baseline Report
    const dateStr = new Date().toISOString().split('T')[0];
    const reportPath = path.join(__dirname, `baseline-results-${dateStr}.json`);

    const passCount = results.filter(r => r.consistency).length;
    const scored = results.filter(r => r.score !== undefined);
    const avgScore =
      scored.reduce((sum, r) => sum + r.score, 0) / (scored.length || 1);

    const report = {
      metadata: {
        date: new Date().toISOString(),
        sampleCount: samples.length,
        resultsCount: results.length
      },
      summary: {
        passRate: ((passCount / results.length) * 100).toFixed(1) + '%',
        avgConsistencyScore: (avgScore * 100).toFixed(1) + '%',
        passCount,
        failCount: results.length - passCount
      },
      results
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n=== Baseline Complete ===`);
    console.log(`Pass rate: ${report.summary.passRate}`);
    console.log(`Avg consistency: ${report.summary.avgConsistencyScore}`);
    console.log(`Report saved to: ${reportPath}\n`);

  } catch (err) {
    console.error('Fatal Pipeline Failure:', err.message);
    process.exit(1);
  }
}

main();
