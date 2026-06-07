#!/usr/bin/env node
/**
 * cic-full-report.js
 * Baseline → analysis → master report (JSON + HTML)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { renderDashboard, saveDashboard } from './scripts/stability-dashboard.js';
import { generateHeatmap, saveHeatmap } from './scripts/drift-heatmap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

async function runBaseline() {
  console.log('▶ Running baseline-consistency-harness.js...');
  return new Promise((resolve, reject) => {
    const p = spawn('node', ['baseline-consistency-harness.js'], {
      cwd: ROOT,
      stdio: 'inherit'
    });
    p.on('exit', code => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
  });
}

async function loadLatestBaseline() {
  const files = await fs.readdir(ROOT);
  const baselines = files
    .filter(f => f.startsWith('baseline-results-') && f.endsWith('.json'))
    .map(f => ({
      name: f,
      time: fs.stat(path.join(ROOT, f)).then(s => s.mtimeMs)
    }));

  if (!baselines.length) throw new Error('No baseline results found');

  const withTimes = await Promise.all(
    baselines.map(async b => ({ name: b.name, time: await b.time }))
  );
  withTimes.sort((a, b) => b.time - a.time);
  const latest = withTimes[0].name;

  const json = JSON.parse(await fs.readFile(path.join(ROOT, latest), 'utf8'));
  return { file: latest, data: json };
}

async function main() {
  try {
    await runBaseline();
    const { file, data } = await loadLatestBaseline();

    console.log(`✓ Loaded baseline: ${file}`);

    const heatmap = await generateHeatmap(data);
    const dashboardHtml = renderDashboard(data);

    const report = {
      baselineFile: file,
      summary: data.summary || {},
      heatmapPath: await saveHeatmap(heatmap, path.join(ROOT, 'cic-heatmap.json')),
      dashboardPath: await saveDashboard(dashboardHtml, path.join(ROOT, 'cic-stability-dashboard.html')),
      generatedAt: new Date().toISOString()
    };

    await fs.writeFile(path.join(ROOT, 'cic-full-report.json'), JSON.stringify(report, null, 2));

    console.log('✓ cic-full-report.json written');
    console.log(`✓ Dashboard: ${report.dashboardPath}`);
    console.log(`✓ Heatmap: ${report.heatmapPath}`);
  } catch (err) {
    console.error('✗ cic-full-report failed:', err.message);
    process.exit(1);
  }
}

main();
