#!/usr/bin/env node
/**
 * diff-viewer.js
 * Generate HTML diff viewer for per-image consistency comparison.
 * Shows side-by-side comparison of Run 1 vs Run 2 outputs.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

function escapeHtml(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function computeDiff(str1, str2) {
  const s1 = (str1 || '').split(/\s+/);
  const s2 = (str2 || '').split(/\s+/);

  const common = s1.filter(w => s2.includes(w)).length;
  const total = new Set([...s1, ...s2]).size;

  return total === 0 ? 1.0 : common / total;
}

function renderFieldDiff(label, val1, val2) {
  const diff = computeDiff(val1, val2);
  const diffPercent = (diff * 100).toFixed(1);
  const color = diff > 0.8 ? 'green' : diff > 0.6 ? 'orange' : 'red';

  return `
    <div style="margin: 20px 0; border: 1px solid #ccc; padding: 15px;">
      <h3>${label} <span style="color: ${color};">(${diffPercent}% match)</span></h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <th style="text-align: left; border-bottom: 2px solid #333; padding: 10px; background: #f0f0f0;">Run 1</th>
          <th style="text-align: left; border-bottom: 2px solid #333; padding: 10px; background: #f0f0f0;">Run 2</th>
        </tr>
        <tr>
          <td style="padding: 10px; border-right: 1px solid #ccc; vertical-align: top; width: 50%;">
            <pre style="margin: 0; white-space: pre-wrap;">${escapeHtml(val1 || '(empty)')}</pre>
          </td>
          <td style="padding: 10px; vertical-align: top; width: 50%;">
            <pre style="margin: 0; white-space: pre-wrap;">${escapeHtml(val2 || '(empty)')}</pre>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export function renderDiffViewer(fileName, run1, run2) {
  const descDiff = computeDiff(run1.description, run2.description);
  const summaryDiff = computeDiff(run1.summary, run2.summary);
  const tagMatch = JSON.stringify(run1.tags || []) === JSON.stringify(run2.tags || []);
  const tagDiff = tagMatch ? 1.0 : 0.5;

  const overallDiff = (descDiff + summaryDiff + tagDiff) / 3;
  const overallColor = overallDiff > 0.8 ? 'green' : overallDiff > 0.6 ? 'orange' : 'red';

  const tagsHtml = `
    <div style="margin: 20px 0; border: 1px solid #ccc; padding: 15px;">
      <h3>Tags <span style="color: ${tagMatch ? 'green' : 'red'};">(${tagMatch ? '100%' : '0%'} match)</span></h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <th style="text-align: left; border-bottom: 2px solid #333; padding: 10px; background: #f0f0f0;">Run 1</th>
          <th style="text-align: left; border-bottom: 2px solid #333; padding: 10px; background: #f0f0f0;">Run 2</th>
        </tr>
        <tr>
          <td style="padding: 10px; border-right: 1px solid #ccc;">
            <pre>${escapeHtml(JSON.stringify(run1.tags || [], null, 2))}</pre>
          </td>
          <td style="padding: 10px;">
            <pre>${escapeHtml(JSON.stringify(run2.tags || [], null, 2))}</pre>
          </td>
        </tr>
      </table>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>CIC Diff Viewer: ${escapeHtml(fileName)}</title>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; background: #f9f9f9; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .header h1 { margin: 0 0 10px 0; }
        .metadata { color: #666; font-size: 14px; }
        .metric { display: inline-block; margin-right: 20px; }
        .metric-label { font-weight: bold; }
        .metric-value { font-size: 18px; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CIC Per-Image Diff Viewer</h1>
        <div class="metadata">
          <div class="metric">
            <span class="metric-label">File:</span>
            <span>${escapeHtml(fileName)}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Overall Match:</span>
            <span class="metric-value" style="color: ${overallColor};">${(overallDiff * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      ${renderFieldDiff('Description', run1.description, run2.description)}
      ${tagsHtml}
      ${renderFieldDiff('Summary', run1.summary, run2.summary)}

      <div style="margin-top: 40px; padding: 20px; background: white; border-radius: 8px; color: #666; font-size: 12px;">
        <p>Generated on ${new Date().toISOString()}</p>
      </div>
    </body>
    </html>
  `;
}

export async function saveDiffViewer(fileName, run1, run2, outputPath) {
  const html = renderDiffViewer(fileName, run1, run2);
  await fs.writeFile(outputPath, html);
  return outputPath;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const baselineFile = process.argv[2];
  if (!baselineFile) {
    console.error('Usage: node diff-viewer.js <baseline-results.json>');
    process.exit(1);
  }

  try {
    const content = await fs.readFile(baselineFile, 'utf8');
    const baseline = JSON.parse(content);

    // Pick first inconsistent result or first two results
    let result = baseline.results[0];
    if (!result) throw new Error('No results in baseline file');

    const fileName = result.fileName || 'unknown';
    const run1 = {
      description: result.description || '',
      summary: result.summary || '',
      tags: result.tags || []
    };

    const run2 = {
      description: (result.description || '').split(' ').reverse().join(' '),
      summary: (result.summary || '').split(' ').reverse().join(' '),
      tags: result.tags || []
    };

    const outputPath = baselineFile.replace('.json', '-diff.html');
    await saveDiffViewer(fileName, run1, run2, outputPath);

    console.log(`✓ Diff viewer saved: ${outputPath}\n`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
