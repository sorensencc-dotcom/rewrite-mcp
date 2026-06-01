#!/usr/bin/env node
/**
 * stability-dashboard.js
 * Generate HTML dashboard showing extractor stability metrics.
 * Displays pass rate, consistency scores, and per-image breakdown.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

function getStatusColor(score) {
  if (score >= 0.9) return '#4CAF50';  // --accent-good
  if (score >= 0.8) return '#F5A623';  // --accent-warn
  if (score >= 0.7) return '#F5A623';  // --accent-warn
  return '#F55555';  // --accent-bad
}

function getStatusLabel(score) {
  if (score >= 0.9) return '✓ STABLE';
  if (score >= 0.8) return '≈ MINOR-DRIFT';
  if (score >= 0.7) return '⚠ MODERATE-DRIFT';
  return '✗ UNSTABLE';
}

export function renderDashboard(baselineResults) {
  const results = baselineResults.results || [];
  const summary = baselineResults.summary || {};

  const passRate = summary.passRate || '0%';
  const avgScore = summary.avgConsistencyScore || '0%';
  const passCount = summary.passCount || 0;
  const failCount = summary.failCount || 0;

  const rows = results
    .map(r => {
      const score = r.score || 0;
      const color = getStatusColor(score);
      const label = getStatusLabel(score);

      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(r.fileName || 'unknown')}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <span style="color: ${color}; font-weight: bold;">${(score * 100).toFixed(1)}%</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <span style="color: ${color};">${label}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            ${r.consistency ? '✓' : '✗'}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>CIC Stability Dashboard</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        :root {
          --bg-app: #050608;
          --bg-panel: #0C0F13;
          --bg-surface: #151922;
          --border-subtle: #262C3A;
          --accent: #00ff88;
          --accent-info: #4F8BFF;
          --accent-good: #4CAF50;
          --accent-warn: #F5A623;
          --accent-bad: #F55555;
          --text-primary: #F5F7FA;
          --text-secondary: #A4A9B6;
          --text-muted: #6B7280;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: "JetBrains Mono", Menlo, monospace;
          background: var(--bg-app);
          color: var(--text-primary);
        }
        .container { max-width: 1280px; margin: 0 auto; padding: 24px; }

        .header {
          background: var(--bg-panel);
          border: 1px solid var(--border-subtle);
          padding: 24px;
          border-radius: 4px;
          margin-bottom: 24px;
        }
        .header h1 { font-size: 24px; margin-bottom: 8px; color: var(--text-primary); }
        .header p { font-size: 14px; color: var(--text-secondary); }

        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .metric-card {
          background: var(--bg-surface);
          border-left: 4px solid var(--accent);
          padding: 16px;
          border-radius: 4px;
          border: 1px solid var(--border-subtle);
        }
        .metric-label { font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 8px; }
        .metric-value { font-size: 24px; font-weight: bold; color: var(--text-primary); }

        .section {
          background: var(--bg-panel);
          border: 1px solid var(--border-subtle);
          padding: 16px;
          border-radius: 4px;
          margin-bottom: 24px;
        }
        .section h2 { font-size: 18px; margin-bottom: 16px; color: var(--text-primary); border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; }

        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        thead th { background: var(--bg-surface); padding: 12px; text-align: left; color: var(--text-secondary); border-bottom: 1px solid var(--border-subtle); }
        tbody td { padding: 12px; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); }
        tbody tr:hover { background: var(--bg-surface); }

        .chart-container { margin: 24px 0; }
        .bar-chart { display: flex; flex-direction: column; gap: 12px; }
        .bar-item { display: flex; align-items: center; gap: 12px; }
        .bar-label { width: 120px; font-size: 12px; color: var(--text-secondary); }
        .bar { flex: 1; height: 20px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 4px; position: relative; overflow: hidden; }
        .bar-fill { height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.3s; }
        .bar-value { font-size: 12px; color: var(--text-secondary); margin-left: 8px; min-width: 40px; }

        .footer { text-align: center; color: var(--text-muted); font-size: 12px; margin-top: 40px; padding: 20px; border-top: 1px solid var(--border-subtle); }

        .status-stable { color: var(--accent-good); }
        .status-warning { color: var(--accent-warn); }
        .status-critical { color: var(--accent-bad); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>CIC STABILITY DASHBOARD</h1>
          <p>ImageAnalyzer baseline consistency analysis</p>
        </div>

        <div class="metrics">
          <div class="metric-card">
            <div class="metric-label">Pass Rate</div>
            <div class="metric-value status-stable">${passRate}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 5px;">${passCount}/${passCount + failCount} images</div>
          </div>

          <div class="metric-card">
            <div class="metric-label">Avg Consistency</div>
            <div class="metric-value">${avgScore}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 5px;">Overall score</div>
          </div>

          <div class="metric-card">
            <div class="metric-label">Stable Images</div>
            <div class="metric-value status-stable">${passCount}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 5px;">Consistency ≥ 0.80</div>
          </div>

          <div class="metric-card">
            <div class="metric-label">Unstable Images</div>
            <div class="metric-value status-critical">${failCount}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 5px;">Consistency < 0.80</div>
          </div>
        </div>

        <div class="section">
          <h2>PER-IMAGE BREAKDOWN</h2>
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th style="text-align: center; width: 150px;">Consistency</th>
                <th style="text-align: center; width: 120px;">Status</th>
                <th style="text-align: center; width: 60px;">Pass</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>

        ${renderDistributionChart(results)}

        <div class="footer">
          <p>Generated ${new Date().toLocaleString()}</p>
          <p>CIC Phase 3 — ImageAnalyzer Stability Suite</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function renderDistributionChart(results) {
  const bins = { stable: 0, minor: 0, moderate: 0, unstable: 0 };

  for (const r of results) {
    const score = r.score || 0;
    if (score >= 0.9) bins.stable++;
    else if (score >= 0.8) bins.minor++;
    else if (score >= 0.7) bins.moderate++;
    else bins.unstable++;
  }

  const total = results.length || 1;

  return `
    <div class="section">
      <h2>STABILITY DISTRIBUTION</h2>
      <div class="bar-chart">
        <div class="bar-item">
          <div class="bar-label">Stable (≥90%)</div>
          <div class="bar">
            <div class="bar-fill" style="width: ${(bins.stable / total) * 100}%; background: var(--accent-good);"></div>
          </div>
          <div class="bar-value">${bins.stable}</div>
        </div>

        <div class="bar-item">
          <div class="bar-label">Minor Drift (80–89%)</div>
          <div class="bar">
            <div class="bar-fill" style="width: ${(bins.minor / total) * 100}%; background: var(--accent-warn);"></div>
          </div>
          <div class="bar-value">${bins.minor}</div>
        </div>

        <div class="bar-item">
          <div class="bar-label">Moderate (70–79%)</div>
          <div class="bar">
            <div class="bar-fill" style="width: ${(bins.moderate / total) * 100}%; background: var(--accent-warn);"></div>
          </div>
          <div class="bar-value">${bins.moderate}</div>
        </div>

        <div class="bar-item">
          <div class="bar-label">Unstable (<70%)</div>
          <div class="bar">
            <div class="bar-fill" style="width: ${(bins.unstable / total) * 100}%; background: var(--accent-bad);"></div>
          </div>
          <div class="bar-value">${bins.unstable}</div>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function saveDashboard(dashboard, outputPath) {
  await fs.writeFile(outputPath, dashboard);
  return outputPath;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const baselineFile = process.argv[2];
  if (!baselineFile) {
    console.error('Usage: node stability-dashboard.js <baseline-results.json>');
    process.exit(1);
  }

  try {
    const content = await fs.readFile(baselineFile, 'utf8');
    const baseline = JSON.parse(content);
    const dashboard = renderDashboard(baseline);

    const outputPath = baselineFile.replace('.json', '-dashboard.html');
    await saveDashboard(dashboard, outputPath);

    console.log(`✓ Dashboard saved: ${outputPath}\n`);
    console.log(`Open in browser: file://${path.resolve(outputPath)}\n`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
