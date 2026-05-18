/**
 * Agents Panel
 * File: operator-ui/js/agents-panel.js | Version: 1.0.0 | Date: 2026-05-15
 *
 * Renders: agent list + capabilities + schemas + pipeline references.
 * All data fetched via control-plane-api.js functions only.
 */

'use strict';

import { listAgents, getAgent } from './control-plane-api.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _selectedAgentId = null;

// ---------------------------------------------------------------------------
// Rendering — list
// ---------------------------------------------------------------------------

function renderList(agents) {
  const tbody = document.querySelector('#agents-panel .cp-table tbody');
  if (!tbody) return;

  tbody.innerHTML = agents.map(a => `
    <tr class="cp-row ${_selectedAgentId === a.name ? 'cp-row--selected' : ''}"
        data-agent-id="${a.name}">
      <td>${a.name}</td>
      <td class="mono">${a.version ?? '—'}</td>
      <td><span class="tag">${a.type ?? 'agent'}</span></td>
      <td class="mono">${(a.referencedBy ?? []).length}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="cp-empty">No agents registered</td></tr>';

  tbody.querySelectorAll('.cp-row').forEach(row => {
    row.addEventListener('click', () => selectAgent(row.dataset.agentId));
  });
}

// ---------------------------------------------------------------------------
// Rendering — detail
// ---------------------------------------------------------------------------

function renderDetail(agent) {
  const detail = document.querySelector('#agents-panel .cp-detail');
  if (!detail) return;

  const caps = agent.capabilities ?? [];
  const refs = agent.referencedBy ?? [];

  detail.innerHTML = `
    <div class="cp-detail__header">
      <span class="cp-detail__title">${agent.name}</span>
      <button class="cp-detail__close" aria-label="Close">✕</button>
    </div>
    <dl class="cp-kv">
      <dt>Version</dt><dd class="mono">${agent.version ?? '—'}</dd>
      <dt>Type</dt><dd><span class="tag">${agent.type ?? 'agent'}</span></dd>
    </dl>
    <div class="cp-detail__section">CAPABILITIES</div>
    <ul class="cp-list">
      ${caps.length
        ? caps.map(c => `<li><span class="mono">${c}</span></li>`).join('')
        : '<li class="cp-empty">None declared</li>'}
    </ul>
    <div class="cp-detail__section">EXECUTE SIGNATURE</div>
    <pre class="cp-code">${escHtml(agent.signature ?? 'execute(context: CicContext): Promise<Object>')}</pre>
    <div class="cp-detail__section">REFERENCED BY PIPELINES</div>
    <ul class="cp-list">
      ${refs.length
        ? refs.map(r => `<li>${r}</li>`).join('')
        : '<li class="cp-empty">Not referenced by any pipeline</li>'}
    </ul>
  `;

  detail.classList.add('cp-detail--open');
  detail.querySelector('.cp-detail__close').addEventListener('click', closeDetail);
}

function closeDetail() {
  const detail = document.querySelector('#agents-panel .cp-detail');
  if (detail) {
    detail.classList.remove('cp-detail--open');
    detail.innerHTML = '';
  }
  _selectedAgentId = null;
  document.querySelectorAll('#agents-panel .cp-row--selected')
    .forEach(r => r.classList.remove('cp-row--selected'));
}

async function selectAgent(id) {
  _selectedAgentId = id;
  document.querySelectorAll('#agents-panel .cp-row').forEach(r => {
    r.classList.toggle('cp-row--selected', r.dataset.agentId === id);
  });
  try {
    const env = await getAgent(id);
    renderDetail(env.data);
  } catch (err) {
    showError(`Failed to load agent: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Util
// ---------------------------------------------------------------------------

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showError(msg) {
  const el = document.querySelector('#agents-panel .cp-panel-error');
  if (el) { el.textContent = msg; el.hidden = false; }
}

// ---------------------------------------------------------------------------
// Init / refresh
// ---------------------------------------------------------------------------

async function refresh() {
  const panel = document.querySelector('#agents-panel');
  if (!panel) return;
  try {
    const env = await listAgents();
    renderList(env.data ?? []);
  } catch (err) {
    showError(`Failed to load agents: ${err.message}`);
  }
}

/**
 * @param {HTMLElement} panelEl
 */
export function init(panelEl) {
  panelEl.innerHTML = `
    <div class="cp-toolbar">
      <span class="cp-toolbar__title">AGENTS</span>
      <button class="btn btn--sm cp-refresh-btn">↻ Refresh</button>
    </div>
    <div class="cp-panel-error" hidden></div>
    <div class="cp-master-detail">
      <div class="cp-master">
        <table class="cp-table">
          <thead>
            <tr>
              <th>Name</th><th>Version</th><th>Type</th><th>Referenced By</th>
            </tr>
          </thead>
          <tbody><tr><td colspan="4" class="cp-loading">Loading…</td></tr></tbody>
        </table>
      </div>
      <div class="cp-detail"></div>
    </div>
  `;

  panelEl.querySelector('.cp-refresh-btn').addEventListener('click', refresh);
  refresh();
}
