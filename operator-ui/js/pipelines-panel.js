/**
 * Pipelines Panel
 * File: operator-ui/js/pipelines-panel.js | Version: 1.0.0 | Date: 2026-05-15
 *
 * Renders: pipeline list, detail pane (node list + last runs + trigger form).
 * All data fetched via control-plane-api.js functions only.
 */

'use strict';

import { listPipelines, getPipeline, triggerPipeline } from './control-plane-api.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _selectedPipelineId = null;

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function statusPill(status) {
  return `<span class="status-pill status-${status ?? 'idle'}">${status ?? 'idle'}</span>`;
}

function relativeTime(isoTs) {
  if (!isoTs) return '—';
  const diff = Date.now() - new Date(isoTs).getTime();
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

// ---------------------------------------------------------------------------
// Rendering — list
// ---------------------------------------------------------------------------

function renderList(pipelines) {
  const tbody = document.querySelector('#pipelines-panel .cp-table tbody');
  if (!tbody) return;

  tbody.innerHTML = pipelines.map(p => `
    <tr class="cp-row ${_selectedPipelineId === p.id ? 'cp-row--selected' : ''}"
        data-pipeline-id="${p.id}">
      <td class="col-name">${p.name}</td>
      <td class="col-mono">${p.version ?? '—'}</td>
      <td class="col-mono">${p.nodeCount ?? '—'}</td>
      <td class="col-mono">${relativeTime(p.lastRunAt)}</td>
      <td>${statusPill(p.lastRunStatus)}</td>
      <td><button class="btn btn--sm btn--run" data-pipeline-id="${p.id}">▶ Run</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.cp-row').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.btn--run')) return; // handled below
      selectPipeline(row.dataset.pipelineId);
    });
  });

  tbody.querySelectorAll('.btn--run').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openTriggerForm(btn.dataset.pipelineId);
    });
  });
}

// ---------------------------------------------------------------------------
// Rendering — detail
// ---------------------------------------------------------------------------

function renderDetail(pipeline) {
  const detail = document.querySelector('#pipelines-panel .cp-detail');
  if (!detail) return;

  const lastRuns = (pipeline.lastRuns ?? []).slice(0, 5);

  detail.innerHTML = `
    <div class="cp-detail__header">
      <span class="cp-detail__title">${pipeline.name}</span>
      <button class="cp-detail__close" aria-label="Close">✕</button>
    </div>
    <dl class="cp-kv">
      <dt>Version</dt><dd class="mono">${pipeline.version ?? '—'}</dd>
      <dt>Nodes</dt>
      <dd>${(pipeline.nodes ?? []).map(n => `<span class="tag">${n}</span>`).join(' ') || '—'}</dd>
    </dl>
    <div class="cp-detail__section">LAST 5 RUNS</div>
    <table class="cp-table cp-table--sm">
      <tbody>
        ${lastRuns.length
          ? lastRuns.map(r => `
            <tr>
              <td class="mono">${r.id?.slice(-6) ?? '?'}</td>
              <td>${statusPill(r.status)}</td>
              <td class="mono">${relativeTime(r.startedAt)}</td>
              <td class="mono">${r.durationMs != null ? (r.durationMs / 1000).toFixed(2) + 's' : '—'}</td>
            </tr>`).join('')
          : '<tr><td colspan="4" class="cp-empty">No runs yet</td></tr>'
        }
      </tbody>
    </table>
    <div class="cp-detail__section">TRIGGER</div>
    <textarea class="cp-trigger-payload" rows="4" spellcheck="false"
      placeholder='{ "harvesterType": "web", "sourceType": "url" }'></textarea>
    <button class="btn btn--primary cp-trigger-btn" data-pipeline-id="${pipeline.id}">▶ Run Pipeline</button>
    <div class="cp-trigger-feedback"></div>
  `;

  detail.classList.add('cp-detail--open');
  detail.querySelector('.cp-detail__close').addEventListener('click', closeDetail);
  detail.querySelector('.cp-trigger-btn').addEventListener('click', handleTrigger);
}

function closeDetail() {
  const detail = document.querySelector('#pipelines-panel .cp-detail');
  if (detail) {
    detail.classList.remove('cp-detail--open');
    detail.innerHTML = '';
  }
  _selectedPipelineId = null;
  document.querySelectorAll('#pipelines-panel .cp-row--selected')
    .forEach(r => r.classList.remove('cp-row--selected'));
}

async function selectPipeline(id) {
  _selectedPipelineId = id;
  document.querySelectorAll('#pipelines-panel .cp-row').forEach(r => {
    r.classList.toggle('cp-row--selected', r.dataset.pipelineId === id);
  });
  try {
    const env = await getPipeline(id);
    renderDetail(env.data);
  } catch (err) {
    showError(`Failed to load pipeline: ${err.message}`);
  }
}

function openTriggerForm(id) {
  selectPipeline(id);
}

async function handleTrigger(e) {
  const btn = e.currentTarget;
  const id = btn.dataset.pipelineId;
  const textarea = document.querySelector('#pipelines-panel .cp-trigger-payload');
  const feedback = document.querySelector('#pipelines-panel .cp-trigger-feedback');

  let payload = {};
  try {
    payload = JSON.parse(textarea.value || '{}');
  } catch (_) {
    feedback.textContent = '✗ Invalid JSON payload';
    feedback.className = 'cp-trigger-feedback cp-trigger-feedback--error';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Running…';
  feedback.textContent = '';

  try {
    const env = await triggerPipeline(id, payload);
    feedback.textContent = `✓ Run started: ${env.data?.id ?? env.data?.runId ?? 'ok'}`;
    feedback.className = 'cp-trigger-feedback cp-trigger-feedback--success';
  } catch (err) {
    feedback.textContent = `✗ ${err.message}`;
    feedback.className = 'cp-trigger-feedback cp-trigger-feedback--error';
  } finally {
    btn.disabled = false;
    btn.textContent = '▶ Run Pipeline';
  }
}

// ---------------------------------------------------------------------------
// Error display
// ---------------------------------------------------------------------------

function showError(msg) {
  const el = document.querySelector('#pipelines-panel .cp-panel-error');
  if (el) { el.textContent = msg; el.hidden = false; }
}

// ---------------------------------------------------------------------------
// Init / refresh
// ---------------------------------------------------------------------------

async function refresh() {
  const panel = document.querySelector('#pipelines-panel');
  if (!panel) return;
  try {
    const env = await listPipelines();
    renderList(env.data ?? []);
  } catch (err) {
    showError(`Failed to load pipelines: ${err.message}`);
  }
}

/**
 * Called by control-room.html when this tab becomes active.
 * @param {HTMLElement} panelEl
 */
export function init(panelEl) {
  panelEl.innerHTML = `
    <div class="cp-toolbar">
      <span class="cp-toolbar__title">PIPELINES</span>
      <button class="btn btn--sm cp-refresh-btn">↻ Refresh</button>
    </div>
    <div class="cp-panel-error" hidden></div>
    <div class="cp-master-detail">
      <div class="cp-master">
        <table class="cp-table">
          <thead>
            <tr>
              <th>Name</th><th>Version</th><th>Nodes</th>
              <th>Last Run</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody><tr><td colspan="6" class="cp-loading">Loading…</td></tr></tbody>
        </table>
      </div>
      <div class="cp-detail"></div>
    </div>
  `;

  panelEl.querySelector('.cp-refresh-btn').addEventListener('click', refresh);
  refresh();
}
