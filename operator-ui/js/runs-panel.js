/**
 * Runs Panel
 * File: operator-ui/js/runs-panel.js | Version: 1.0.0 | Date: 2026-05-15
 *
 * Renders: run table with filters + detail drawer (inputs/outputs/logs/timings).
 * All data fetched via control-plane-api.js functions only.
 */

'use strict';

import { listRuns, getRun, listPipelines } from './control-plane-api.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _selectedRunId = null;
let _filters = { pipelineId: '', status: '', window: '1h' };

const WINDOWS = ['1h', '6h', '24h', '7d'];

// ---------------------------------------------------------------------------
// Rendering — toolbar
// ---------------------------------------------------------------------------

async function populatePipelineFilter() {
  const sel = document.querySelector('#runs-panel .filter-pipeline');
  if (!sel) return;
  try {
    const env = await listPipelines();
    const opts = (env.data ?? []).map(p =>
      `<option value="${p.id}">${p.name}</option>`
    ).join('');
    sel.innerHTML = `<option value="">All pipelines</option>${opts}`;
    sel.value = _filters.pipelineId;
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Rendering — list
// ---------------------------------------------------------------------------

function statusPill(status) {
  return `<span class="status-pill status-${status ?? 'idle'}">${status ?? '—'}</span>`;
}

function relativeTime(isoTs) {
  if (!isoTs) return '—';
  const diff = Date.now() - new Date(isoTs).getTime();
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return new Date(isoTs).toLocaleDateString();
}

function formatDuration(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function renderList(runs) {
  const tbody = document.querySelector('#runs-panel .cp-table tbody');
  if (!tbody) return;

  tbody.innerHTML = runs.length
    ? runs.map(r => `
      <tr class="cp-row ${_selectedRunId === r.id ? 'cp-row--selected' : ''}"
          data-run-id="${r.id}">
        <td class="mono" title="${r.id}">${r.id?.slice(-8) ?? '?'}</td>
        <td>${r.pipelineId ?? '—'}</td>
        <td>${statusPill(r.status)}</td>
        <td class="mono">${formatDuration(r.durationMs)}</td>
        <td class="mono">${relativeTime(r.startedAt)}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" class="cp-empty">No runs in this window</td></tr>';

  tbody.querySelectorAll('.cp-row').forEach(row => {
    row.addEventListener('click', () => selectRun(row.dataset.runId));
  });
}

// ---------------------------------------------------------------------------
// Rendering — detail
// ---------------------------------------------------------------------------

function jsonBlock(val) {
  if (val == null) return '<span class="cp-empty">—</span>';
  try {
    return `<pre class="cp-code">${JSON.stringify(val, null, 2)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`;
  } catch (_) {
    return `<pre class="cp-code">${String(val)}</pre>`;
  }
}

function renderLogs(logs) {
  if (!Array.isArray(logs) || logs.length === 0) return '<span class="cp-empty">No logs</span>';
  return `<div class="cp-log-block">${logs.map(l => {
    const ts = l.ts ? new Date(l.ts).toISOString().slice(11, 23) : '';
    const lvl = (l.level ?? 'info').toUpperCase();
    const msg = l.msg ?? '';
    const ctx = l.module ? `[${l.module}] ` : '';
    return `<div class="cp-log-line cp-log-line--${l.level ?? 'info'}">${ts} [${lvl}] ${ctx}${msg}</div>`;
  }).join('')}</div>`;
}

function renderDetail(run) {
  const detail = document.querySelector('#runs-panel .cp-detail');
  if (!detail) return;

  detail.innerHTML = `
    <div class="cp-detail__header">
      <span class="cp-detail__title cp-detail__title--mono">${run.id ?? '—'}</span>
      <button class="cp-detail__close" aria-label="Close">✕</button>
    </div>
    <dl class="cp-kv">
      <dt>Pipeline</dt><dd>${run.pipelineId ?? '—'}</dd>
      <dt>Status</dt><dd>${run.status ?? '—'}</dd>
      <dt>Started</dt><dd class="mono">${run.startedAt ?? '—'}</dd>
      <dt>Duration</dt><dd class="mono">${formatDuration(run.durationMs)}</dd>
    </dl>
    <div class="cp-detail__section">INPUTS</div>
    ${jsonBlock(run.inputs)}
    <div class="cp-detail__section">OUTPUTS</div>
    ${jsonBlock(run.outputs)}
    <div class="cp-detail__section">LOGS</div>
    ${renderLogs(run.logs)}
  `;

  detail.classList.add('cp-detail--open');
  detail.querySelector('.cp-detail__close').addEventListener('click', closeDetail);
}

function closeDetail() {
  const detail = document.querySelector('#runs-panel .cp-detail');
  if (detail) { detail.classList.remove('cp-detail--open'); detail.innerHTML = ''; }
  _selectedRunId = null;
  document.querySelectorAll('#runs-panel .cp-row--selected')
    .forEach(r => r.classList.remove('cp-row--selected'));
}

async function selectRun(id) {
  _selectedRunId = id;
  document.querySelectorAll('#runs-panel .cp-row').forEach(r => {
    r.classList.toggle('cp-row--selected', r.dataset.runId === id);
  });
  try {
    const env = await getRun(id);
    renderDetail(env.data);
  } catch (err) {
    showError(`Failed to load run: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Util
// ---------------------------------------------------------------------------

function showError(msg) {
  const el = document.querySelector('#runs-panel .cp-panel-error');
  if (el) { el.textContent = msg; el.hidden = false; }
}

function buildFilters() {
  const f = { window: _filters.window };
  if (_filters.pipelineId) f.pipelineId = _filters.pipelineId;
  if (_filters.status) f.status = _filters.status;
  return f;
}

// ---------------------------------------------------------------------------
// Init / refresh
// ---------------------------------------------------------------------------

async function refresh() {
  try {
    const env = await listRuns(buildFilters());
    renderList(env.data ?? []);
  } catch (err) {
    showError(`Failed to load runs: ${err.message}`);
  }
}

/**
 * @param {HTMLElement} panelEl
 */
export function init(panelEl) {
  panelEl.innerHTML = `
    <div class="cp-toolbar">
      <span class="cp-toolbar__title">RUNS</span>
      <select class="cp-select filter-pipeline"><option value="">All pipelines</option></select>
      <select class="cp-select filter-status">
        <option value="">All statuses</option>
        <option value="running">Running</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
        <option value="pending">Pending</option>
      </select>
      <div class="cp-window-selector">
        ${WINDOWS.map(w =>
          `<button class="btn btn--sm cp-window-btn ${w === _filters.window ? 'btn--active' : ''}"
            data-window="${w}">${w}</button>`
        ).join('')}
      </div>
      <button class="btn btn--sm cp-refresh-btn">↻ Refresh</button>
    </div>
    <div class="cp-panel-error" hidden></div>
    <div class="cp-master-detail">
      <div class="cp-master">
        <table class="cp-table">
          <thead>
            <tr>
              <th>Run ID</th><th>Pipeline</th><th>Status</th><th>Duration</th><th>Started</th>
            </tr>
          </thead>
          <tbody><tr><td colspan="5" class="cp-loading">Loading…</td></tr></tbody>
        </table>
      </div>
      <div class="cp-detail"></div>
    </div>
  `;

  populatePipelineFilter();

  panelEl.querySelector('.filter-pipeline').addEventListener('change', e => {
    _filters.pipelineId = e.target.value;
    refresh();
  });
  panelEl.querySelector('.filter-status').addEventListener('change', e => {
    _filters.status = e.target.value;
    refresh();
  });
  panelEl.querySelectorAll('.cp-window-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _filters.window = btn.dataset.window;
      panelEl.querySelectorAll('.cp-window-btn').forEach(b =>
        b.classList.toggle('btn--active', b === btn));
      refresh();
    });
  });
  panelEl.querySelector('.cp-refresh-btn').addEventListener('click', refresh);

  refresh();
}
