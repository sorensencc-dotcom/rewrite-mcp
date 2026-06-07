#!/usr/bin/env node
/**
 * stability-monitor.js
 * Periodic baseline + trend log
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const LOG_PATH = path.join(ROOT, 'stability-trend.jsonl');

async function runBaselineOnce() {
  return new Promise((resolve, reject) => {
    const p = spawn('node', ['baseline-consistency-harness.js'], {
      cwd: ROOT,
      stdio: 'inherit'
    });
    p.on('exit', code => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
  });
}

async function latestSummary() {
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
  return {
    file: latest,
    passRate: json.summary?.passRate || 0,
    avgConsistency: json.summary?.avgConsistencyScore || 0,
    timestamp: new Date().toISOString()
  };
}

async function appendTrend(entry) {
  const line = JSON.stringify(entry);
  await fs.appendFile(LOG_PATH, line + '\n');
}

async function printTrend() {
  try {
    const content = await fs.readFile(LOG_PATH, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    if (lines.length === 0) {
      console.log('No trend data yet');
      return;
    }

    console.log('\nStability Trend (last 10 runs):\n');
    const recent = lines.slice(-10).map(l => JSON.parse(l));

    recent.forEach(entry => {
      console.log(`${entry.timestamp.split('T')[0]} ${entry.timestamp.split('T')[1].split('.')[0]}`);
      console.log(`  Pass Rate: ${(entry.passRate * 100).toFixed(1)}%`);
      console.log(`  Avg Consistency: ${(entry.avgConsistency * 100).toFixed(1)}%\n`);
    });

    // Calculate trend
    if (recent.length > 1) {
      const first = recent[0];
      const last = recent[recent.length - 1];
      const passRateDelta = ((last.passRate - first.passRate) * 100).toFixed(1);
      const consistencyDelta = ((last.avgConsistency - first.avgConsistency) * 100).toFixed(1);

      console.log('Trend (oldest → latest):');
      console.log(`  Pass Rate: ${passRateDelta > 0 ? '+' : ''}${passRateDelta}%`);
      console.log(`  Avg Consistency: ${consistencyDelta > 0 ? '+' : ''}${consistencyDelta}%\n`);
    }
  } catch {
    // No trend data yet
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--trend')) {
    await printTrend();
    return;
  }

  try {
    console.log('Starting baseline run...');
    await runBaselineOnce();
    const summary = await latestSummary();
    await appendTrend(summary);
    console.log('✓ stability-trend.jsonl updated\n');
    console.log(`Pass Rate: ${(summary.passRate * 100).toFixed(1)}%`);
    console.log(`Avg Consistency: ${(summary.avgConsistency * 100).toFixed(1)}%\n`);
  } catch (err) {
    console.error('✗ stability-monitor failed:', err.message);
    process.exit(1);
  }
}

main();
