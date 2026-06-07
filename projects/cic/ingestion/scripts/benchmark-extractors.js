#!/usr/bin/env node
/**
 * benchmark-extractors.js
 * Run V2, V3, V4 extractors side-by-side and compare results.
 */

import { run as v2 } from '../src/extractors/ImageAnalyzerV2.js';
import { run as v3 } from '../src/extractors/ImageAnalyzerV3.js';
import { run as v4 } from '../src/extractors/ImageAnalyzerV4.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function benchmarkImage(asset, opts = {}) {
  const results = {
    assetId: asset.assetId,
    fileName: path.basename(asset.bytesPath || 'unknown'),
    timestamp: new Date().toISOString(),
    extractors: {}
  };

  try {
    console.log(`⏱️  Benchmarking ${path.basename(asset.bytesPath)}...`);

    // V2
    const t0_v2 = Date.now();
    results.extractors.v2 = await v2(asset, opts);
    results.extractors.v2.durationMs = Date.now() - t0_v2;

    // V3
    const t0_v3 = Date.now();
    results.extractors.v3 = await v3(asset, opts);
    results.extractors.v3.durationMs = Date.now() - t0_v3;

    // V4
    const t0_v4 = Date.now();
    results.extractors.v4 = await v4(asset, opts);
    results.extractors.v4.durationMs = Date.now() - t0_v4;

    // Compute consensus metrics
    results.consensus = computeConsensus(results.extractors);

    console.log(`  ✓ V2: ${results.extractors.v2.durationMs}ms`);
    console.log(`  ✓ V3: ${results.extractors.v3.durationMs}ms`);
    console.log(`  ✓ V4: ${results.extractors.v4.durationMs}ms`);
    console.log();

    return results;
  } catch (err) {
    results.error = err.message;
    return results;
  }
}

function computeConsensus(extractors) {
  const desc = [extractors.v2?.description, extractors.v3?.description, extractors.v4?.description].filter(Boolean);
  const tags = [extractors.v2?.tags, extractors.v3?.tags, extractors.v4?.tags].filter(Boolean);

  return {
    descriptionVariance: desc.length > 1 ? computeVariance(desc) : 0,
    tagsOverlap: tags.length > 1 ? computeTagOverlap(tags) : 0,
    extractorCount: Object.keys(extractors).length
  };
}

function computeVariance(texts) {
  if (texts.length < 2) return 0;

  const lengths = texts.map(t => (t || '').split(/\s+/).length);
  const meanLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - meanLength, 2), 0) / lengths.length;

  return Math.sqrt(variance) / (meanLength || 1);
}

function computeTagOverlap(tagSets) {
  if (tagSets.length < 2) return 1.0;

  const sets = tagSets.map(tags => new Set(tags || []));
  let intersection = new Set(sets[0]);

  for (let i = 1; i < sets.length; i++) {
    intersection = new Set([...intersection].filter(t => sets[i].has(t)));
  }

  const union = new Set();
  for (const s of sets) {
    for (const t of s) union.add(t);
  }

  return union.size === 0 ? 1.0 : intersection.size / union.size;
}

export async function benchmarkDirectory(dir, opts = {}) {
  const files = await fs.readdir(dir);
  const images = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

  if (images.length === 0) {
    console.log('No images found in directory');
    return [];
  }

  const results = [];

  for (const img of images) {
    const asset = {
      assetId: img,
      bytesPath: path.join(dir, img),
      mimeType: img.endsWith('.png') ? 'image/png' : 'image/jpeg'
    };

    const result = await benchmarkImage(asset, opts);
    results.push(result);
  }

  return results;
}

export async function saveBenchmark(results, outputPath) {
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
  return outputPath;
}

export function printBenchmarkSummary(results) {
  if (!Array.isArray(results)) {
    results = [results];
  }

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Extractor Benchmark Results           ║');
  console.log('╚════════════════════════════════════════╝\n');

  const v2Times = results.map(r => r.extractors.v2?.durationMs || 0).filter(t => t > 0);
  const v3Times = results.map(r => r.extractors.v3?.durationMs || 0).filter(t => t > 0);
  const v4Times = results.map(r => r.extractors.v4?.durationMs || 0).filter(t => t > 0);

  const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(0) : 'N/A';

  console.log('Average Duration:');
  console.log(`  V2: ${avg(v2Times)}ms`);
  console.log(`  V3: ${avg(v3Times)}ms`);
  console.log(`  V4: ${avg(v4Times)}ms\n`);

  const consensusScores = results.map(r => r.consensus?.tagsOverlap || 0);
  const avgConsensus = (consensusScores.reduce((a, b) => a + b, 0) / (consensusScores.length || 1) * 100).toFixed(1);

  console.log(`Average Tag Overlap: ${avgConsensus}%\n`);
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] || './samples';

  try {
    const results = await benchmarkDirectory(dir);
    const outputPath = `benchmark-${new Date().toISOString().split('T')[0]}.json`;
    await saveBenchmark(results, outputPath);
    printBenchmarkSummary(results);

    console.log(`✓ Benchmark saved: ${outputPath}\n`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
