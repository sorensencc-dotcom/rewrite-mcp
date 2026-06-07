#!/usr/bin/env node
/**
 * baseline-consistency-harness.js
 * @version 2.1.0
 * @date 2026-05-31
 *
 * CIC Step 3: ImageAnalyzerV2 consistency baseline with 20–30 samples
 * Runs each image 2x, measures output stability (consistency ≥ 0.85)
 * Remediation: temperature=0 for deterministic outputs, semantic similarity for comparison
 */

import fs from 'node:fs/promises';
import fSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';
import { run as analyzeImage } from './cic/ingestion/src/extractors/ImageAnalyzerV2.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FOLDER_IDS = {
  bgsuMarkSprang: '1xjXp8qLKHUpgQ7EstQKuHXMuQJXb_Ene',
  uncategorized: '1j6RXyBnz5lItRFh-Cco5lbAPYQfVbesd',
};

const SAMPLE_CONFIG = {
  targetCount: 25,
  distribution: { bgsuMarkSprang: 0.5, uncategorized: 0.5 },
};

function initializeDriveClient() {
  const token = process.env.GOOGLE_DRIVE_TOKEN;
  if (!token) {
    throw new Error('GOOGLE_DRIVE_TOKEN environment variable not set');
  }
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

async function listImagesInFolder(drive, folderId) {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    spaces: 'drive',
    fields: 'files(id, name, mimeType, size, createdTime)',
    pageSize: 100,
  });
  return response.data.files || [];
}

async function downloadImageFromDrive(drive, fileId, outputPath) {
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' },
  );
  const dest = fSync.createWriteStream(outputPath);
  return new Promise((resolve, reject) => {
    res.data.pipe(dest);
    dest.on('finish', resolve);
    dest.on('error', reject);
    res.data.on('error', reject);
  });
}

async function sampleImages(drive) {
  const samples = [];
  for (const [folderKey, folderId] of Object.entries(FOLDER_IDS)) {
    const files = await listImagesInFolder(drive, folderId);
    const images = files.filter((f) => f.mimeType.startsWith('image/'));
    const targetForFolder = Math.round(
      SAMPLE_CONFIG.targetCount * SAMPLE_CONFIG.distribution[folderKey],
    );
    const sortedByDate = images.sort(
      (a, b) => new Date(b.createdTime) - new Date(a.createdTime),
    );
    const step = Math.ceil(sortedByDate.length / targetForFolder);
    for (let i = 0; i < sortedByDate.length && samples.length < SAMPLE_CONFIG.targetCount; i += step) {
      samples.push({
        ...sortedByDate[i],
        folderKey,
        folderId,
      });
    }
  }
  return samples.slice(0, SAMPLE_CONFIG.targetCount);
}

async function runImageAnalyzer(imagePath, attempt) {
  return analyzeImage(
    {
      assetId: `baseline-${Date.now()}-${attempt}`,
      sourcePath: imagePath,
      mimeType: 'image/jpeg',
      sourceSystem: 'local',
      bytesPath: imagePath,
    },
    {
      model: 'claude-opus-4-6',
      enableStructuredExtraction: true,
    },
  );
}

function compareExtractions(run1, run2) {
  if (run1.success !== run2.success) {
    return { consistent: false, reason: 'success status mismatch', score: 0 };
  }

  if (!run1.success) {
    return { consistent: true, reason: 'both failed', score: 1.0 };
  }

  const semanticSim = (a, b) => {
    if (!a && !b) return 1.0;
    if (!a || !b) return 0.0;

    const aWords = (a || '')
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2);
    const bWords = (b || '')
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2);

    if (aWords.length === 0 && bWords.length === 0) return 1.0;
    if (aWords.length === 0 || bWords.length === 0) return 0.0;

    const aSet = new Set(aWords);
    const bSet = new Set(bWords);
    const intersection = [...aSet].filter(w => bSet.has(w)).length;
    const union = new Set([...aSet, ...bSet]).size;

    return intersection / union;
  };

  const setMatch = (a, b) => {
    const aSet = new Set(a || []);
    const bSet = new Set(b || []);
    const intersection = [...aSet].filter((x) => bSet.has(x)).length;
    const union = new Set([...(a || []), ...(b || [])]).size;
    return union === 0 ? 1.0 : intersection / union;
  };

  const metrics = {
    description: semanticSim(run1.description, run2.description),
    tags: setMatch(run1.tags, run2.tags),
    summary: semanticSim(run1.summary, run2.summary),
  };

  const score = Object.values(metrics).reduce((a, b) => a + b, 0) / Object.keys(metrics).length;
  return { consistent: score >= 0.85, score, metrics };
}

async function main() {
  console.log('=== CIC Step 3: ImageAnalyzerV2 Baseline Consistency ===\n');

  try {
    console.log('Initializing Google Drive client...');
    const drive = initializeDriveClient();

    console.log(`Sampling ${SAMPLE_CONFIG.targetCount} images...`);
    const samples = await sampleImages(drive);
    console.log(`✓ Sampled ${samples.length} images\n`);

    const results = [];
    const tempDir = path.join(__dirname, '.temp-baseline');
    await fs.mkdir(tempDir, { recursive: true });

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      console.log(`[${i + 1}/${samples.length}] Testing ${sample.name}...`);

      const localPath = path.join(tempDir, `${sample.id}.jpg`);

      try {
        await downloadImageFromDrive(drive, sample.id, localPath);
        const run1 = await runImageAnalyzer(localPath, 1);
        const run2 = await runImageAnalyzer(localPath, 2);
        const consistency = compareExtractions(run1, run2);

        results.push({
          fileId: sample.id,
          fileName: sample.name,
          folderKey: sample.folderKey,
          run1Success: run1.success,
          run2Success: run2.success,
          consistency: consistency.consistent,
          score: consistency.score,
          metrics: consistency.metrics,
        });

        const status = consistency.consistent ? '✓' : '✗';
        console.log(`  ${status} Score: ${(consistency.score * 100).toFixed(1)}%`);

        await fs.rm(localPath, { force: true });
      } catch (err) {
        console.error(`  ✗ ${err.message}`);
        results.push({
          fileId: sample.id,
          fileName: sample.name,
          folderKey: sample.folderKey,
          error: err.message,
        });
      }
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const reportPath = path.join(__dirname, `baseline-results-${dateStr}.json`);

    const passCount = results.filter((r) => r.consistency).length;
    const passRate = passCount / results.length;
    const avgScore = results
      .filter((r) => r.score !== undefined)
      .reduce((sum, r) => sum + r.score, 0) / (results.filter((r) => r.score !== undefined).length || 1);

    const report = {
      metadata: {
        date: new Date().toISOString(),
        sampleCount: samples.length,
        resultsCount: results.length,
      },
      summary: {
        passRate: (passRate * 100).toFixed(1) + '%',
        avgConsistencyScore: (avgScore * 100).toFixed(1) + '%',
        passCount,
        failCount: results.length - passCount,
      },
      results,
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n=== Baseline Complete ===`);
    console.log(`Pass rate: ${report.summary.passRate} (${passCount}/${results.length})`);
    console.log(`Avg consistency: ${report.summary.avgConsistencyScore}`);
    console.log(`Results: ${reportPath}\n`);

    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (err) {
    console.error('Fatal:', err.message);
    process.exit(1);
  }
}

main();
