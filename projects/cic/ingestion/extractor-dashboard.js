#!/usr/bin/env node
/**
 * extractor-dashboard.js
 * Simple static dashboard launcher
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORT = process.env.PORT || 4173;

async function handler(req, res) {
  try {
    // Route: /
    if (req.url === '/' || req.url === '/dashboard') {
      const htmlPath = path.join(ROOT, 'cic-stability-dashboard.html');
      try {
        const html = await fs.readFile(htmlPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Dashboard not generated yet. Run: node cic-full-report.js');
      }
      return;
    }

    // Route: /heatmap.json
    if (req.url === '/heatmap.json') {
      const jsonPath = path.join(ROOT, 'cic-heatmap.json');
      try {
        const json = await fs.readFile(jsonPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(json);
      } catch {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Heatmap not found' }));
      }
      return;
    }

    // Route: /report.json
    if (req.url === '/report.json') {
      const jsonPath = path.join(ROOT, 'cic-full-report.json');
      try {
        const json = await fs.readFile(jsonPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(json);
      } catch {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Report not found' }));
      }
      return;
    }

    // Route: /trend.json
    if (req.url === '/trend.json') {
      const trendPath = path.join(ROOT, 'stability-trend.jsonl');
      try {
        const lines = (await fs.readFile(trendPath, 'utf8')).trim().split('\n').filter(Boolean);
        const trend = lines.map(l => JSON.parse(l));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(trend, null, 2));
      } catch {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Trend data not found' }));
      }
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Error: ${err.message}`);
  }
}

http.createServer(handler).listen(PORT, () => {
  console.log(`\n✓ Extractor dashboard started`);
  console.log(`  Dashboard:  http://localhost:${PORT}`);
  console.log(`  Heatmap:    http://localhost:${PORT}/heatmap.json`);
  console.log(`  Report:     http://localhost:${PORT}/report.json`);
  console.log(`  Trend:      http://localhost:${PORT}/trend.json\n`);
  console.log('Press Ctrl+C to stop\n');
});
