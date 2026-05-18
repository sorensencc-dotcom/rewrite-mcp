/**
 * Metrics Panel
 * File: operator-ui/js/metrics-panel.js | Version: 1.0.0 | Date: 2026-05-15
 *
 * Renders: latency P50/P95, throughput, error rate, run counts by pipeline.
 * Uses native Canvas API only — no external charting library.
 * All data fetched via listMetrics() from control-plane-api.js.
 */

'use strict';

import { listMetrics } from './control-plane-api.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _window = '1h';
const WINDOWS = ['1h', '6h', '24h', '7d'];

// Design tokens (subset, kept in sync with tokens.json)
const T = {
  accent:     '#4f8ef7',
  success:    '#3dba6b',
  danger:     '#e05252',
  warning:    '#e0a033',
  textPrimary:'#e8e8f0',
  textMuted:  '#555568',
  surface:    '#13131a',
  border:     '#23233a',
};

// ---------------------------------------------------------------------------
// Canvas helpers
// ---------------------------------------------------------------------------

/**
 * Draw a simple line chart.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ labels: string[], series: { label: string, color: string, values: number[] }[] }} data
 */
function drawLineChart(ctx, data) {
  const { canvas } = ctx;
  const W = canvas.width, H = canvas.height;
  const PAD = { top: 20, right: 16, bottom: 32, left: 48 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = T.surface;
  ctx.fillRect(0, 0, W, H);

  const allVals = data.series.flatMap(s => s.values);
  const maxVal = Math.max(...allVals, 0.001);
  const n = data.labels.length;
  if (n < 2) return;

  // Grid lines
  ctx.strokeStyle = T.border;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + cH - (i / 4) * cH;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + cW, y);
    ctx.stroke();
    const label = ((maxVal * i) / 4).toFixed(maxVal < 10 ? 2 : 0);
    ctx.fillStyle = T.textMuted;
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(label, PAD.left - 4, y + 3);
  }

  // X axis labels
  ctx.fillStyle = T.textMuted;
  ctx.textAlign = 'center';
  const labelStep = Math.max(1, Math.floor(n / 6));
  data.labels.forEach((lbl, i) => {
    if (i % labelStep !== 0) return;
    const x = PAD.left + (i / (n - 1)) * cW;
    ctx.fillText(lbl, x, H - 8);
  });

  // Series
  data.series.forEach(s => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    s.values.forEach((v, i) => {
      const x = PAD.left + (i / (n - 1)) * cW;
      const y = PAD.top + cH - (v / maxVal) * cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
}

/**
 * Draw a simple bar chart.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ labels: string[], series: { label: string, color: string, values: number[] }[] }} data
 */
function drawBarChart(ctx, data) {
  const { canvas } = ctx;
  const W = canvas.width, H = canvas.height;
  const PAD = { top: 20, right: 16, bottom: 32, left: 48 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = T.surface;
  ctx.fillRect(0, 0, W, H);

  const allVals = data.series.flatMap(s => s.values);
  const maxVal = Math.max(...allVals, 1);
  const n = data.labels.length;

  ctx.strokeStyle = T.border;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + cH - (i / 4) * cH;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + cW, y); ctx.stroke();
    ctx.fillStyle = T.textMuted;
    ctx.font = '10px monospace'; ctx.textAlign = 'right';
    ctx.fillText(((maxVal * i) / 4).toFixed(0), PAD.left - 4, y + 3);
  }

  const barW = cW / Math.max(n, 1) * 0.6;
  const gap = cW / Math.max(n, 1);
  data.labels.forEach((lbl, i) => {
    const x0 = PAD.left + i * gap + gap * 0.2;
    data.series.forEach((s, si) => {
      const bW = barW / data.series.length;
      const bH = (s.values[i] / maxVal) * cH;
      ctx.fillStyle = s.color;
      ctx.fillRect(x0 + si * bW, PAD.top + cH - bH, bW - 2, bH);
    });
    ctx.fillStyle = T.textMuted;
    ctx.font = '10px monospace'; ctx.textAlign = 'center';
    ctx.fillText(lbl.slice(-5), x0 + barW / 2, H - 8);
  });
}

// ---------------------------------------------------------------------------
// Data shaping
// ---------------------------------------------------------------------------

function shapeLatency(series) {
  const lat = series.find(s => s.name === 'latency');
  if (!lat) return null;
  return {
    labels: lat.labels ?? [],
    series: [
      { label: 'P50', color: T.accent,   values: lat.p50 ?? [] },
      { label: 'P95', color: T.warning,  values: lat.p95 ?? [] },
    ],
  };
}

function shapeThroughput(series) {
  const tp = series.find(s => s.name === 'throughput');
  if (!tp) return null;
  return {
    labels: tp.labels ?? [],
    series: [{ label: 'runs/min', color: T.accent, values: tp.values ?? [] }],
  };
}

function shapeErrorRate(series) {
  const er = series.find(s => s.name === 'errorRate');
  if (!er) return null;
  return {
    labels: er.labels ?? [],
    series: [{ label: 'error %', color: T.danger, values: er.values ?? [] }],
  };
}

function shapeRunCounts(series) {
  const rc = series.find(s => s.name === 'runCounts');
  if (!rc) return null;
  const colors = [T.accent, T.success, T.warning, T.danger];
  return {
    labels: rc.labels ?? [],
    series: (rc.pipelines ?? []).map((p, i) => ({
      label: p.id,
      color: colors[i % colors.length],
      values: p.counts ?? [],
    })),
  };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function makeCanvas(id, title) {
  return `
    <div class="cp-chart-card">
      <div class="cp-chart-title">${title}</div>
      <canvas id="${id}" class="cp-canvas"></canvas>
    </div>
  `;
}

function paintChart(id, type, chartData) {
  const canvas = document.getElementById(id);
  if (!canvas || !chartData) return;
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  const ctx = canvas.getContext('2d');
  if (type === 'line') drawLineChart(ctx, chartData);
  if (type === 'bar') drawBarChart(ctx, chartData);
}

async function refresh(panelEl) {
  try {
    const env = await listMetrics({ window: _window });
    const series = env.data ?? [];

    paintChart('chart-latency',    'line', shapeLatency(series));
    paintChart('chart-throughput', 'bar',  shapeThroughput(series));
    paintChart('chart-errorrate',  'line', shapeErrorRate(series));
    paintChart('chart-runcounts',  'bar',  shapeRunCounts(series));
  } catch (err) {
    const el = panelEl.querySelector('.cp-panel-error');
    if (el) { el.textContent = `Failed to load metrics: ${err.message}`; el.hidden = false; }
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

/**
 * @param {HTMLElement} panelEl
 */
export function init(panelEl) {
  panelEl.innerHTML = `
    <div class="cp-toolbar">
      <span class="cp-toolbar__title">METRICS</span>
      <div class="cp-window-selector">
        ${WINDOWS.map(w =>
          `<button class="btn btn--sm cp-window-btn ${w === _window ? 'btn--active' : ''}"
            data-window="${w}">${w}</button>`
        ).join('')}
      </div>
      <button class="btn btn--sm cp-refresh-btn">↻ Refresh</button>
    </div>
    <div class="cp-panel-error" hidden></div>
    <div class="cp-chart-grid">
      ${makeCanvas('chart-latency',    'Latency P50 / P95 (s)')}
      ${makeCanvas('chart-throughput', 'Throughput (runs/min)')}
      ${makeCanvas('chart-errorrate',  'Error Rate (%)')}
      ${makeCanvas('chart-runcounts',  'Runs by Pipeline')}
    </div>
  `;

  panelEl.querySelectorAll('.cp-window-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _window = btn.dataset.window;
      panelEl.querySelectorAll('.cp-window-btn').forEach(b =>
        b.classList.toggle('btn--active', b === btn));
      refresh(panelEl);
    });
  });
  panelEl.querySelector('.cp-refresh-btn').addEventListener('click', () => refresh(panelEl));

  // Resize observer for canvas sizing
  const ro = new ResizeObserver(() => refresh(panelEl));
  ro.observe(panelEl);

  refresh(panelEl);
}
